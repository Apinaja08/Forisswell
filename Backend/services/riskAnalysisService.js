const Risk = require('../models/Risk');
const sentinelHubService = require('./sentinelHubService');
const overpassService = require('./overPassService');
const logger = require('../utils/logger');

class RiskAnalysisService {
  calculateRiskLevel(score) {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  async analyzeArea(polygonData) {
    try {
      logger.info(`Analyzing area: ${polygonData.name || 'unnamed'}`);

      // Extract coordinates - handle both formats
      let coordinates = polygonData.coordinates;
      
      // If coordinates is a GeoJSON polygon coordinates array, extract the first ring for services
      let coordinatesForServices = coordinates;
      if (Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0])) {
        // It's already in the right format for Sentinel Hub
        coordinatesForServices = coordinates;
      } else if (Array.isArray(coordinates[0]) && coordinates[0].length === 2) {
        // It's a simple ring, wrap it for Sentinel Hub
        coordinatesForServices = [coordinates];
      }

      // Create a standardized polygon object for Overpass service
      const standardizedPolygon = {
        ...polygonData,
        coordinates: coordinatesForServices
      };

      logger.info(`Using coordinates format: ${Array.isArray(coordinatesForServices[0][0]) ? 'GeoJSON' : 'Simple'}`);

      // ── All data fetched in parallel ──────────────────────────
      const [
        treeCoverData,
        deforestationData,
        historicalData,
        encroachmentRisk,
        settlements
      ] = await Promise.allSettled([
        sentinelHubService.analyzeTreeCover(coordinatesForServices),
        sentinelHubService.detectDeforestation(coordinatesForServices),
        sentinelHubService.getHistoricalTrends(coordinatesForServices),
        overpassService.calculateEncroachmentRisk(standardizedPolygon),
        overpassService.getNearbySettlements(coordinatesForServices)
      ]);

      // Process results with fallbacks
      const processedTreeCover = this.processResult(treeCoverData, sentinelHubService.getMockTreeCoverData());
      const processedDeforestation = this.processResult(deforestationData, sentinelHubService.getMockDeforestationData());
      const processedHistorical = this.processResult(historicalData, sentinelHubService.getMockHistoricalData());
      const processedEncroachment = encroachmentRisk.status === 'fulfilled' ? encroachmentRisk.value : 20;
      const processedSettlements = settlements.status === 'fulfilled' ? settlements.value : [];

      // Log if we're using mock data
      if (processedTreeCover.source === 'mock') {
        logger.warn('Using mock tree cover data');
      }
      if (processedDeforestation.source === 'mock') {
        logger.warn('Using mock deforestation data');
      }

      // ── Risk factor calculation ───────────────────────────────
      const factors = {
        treeCoverLoss: Math.max(0, 100 - (processedTreeCover.treeCoverPercentage || 50)),
        degradationRate: this.calculateDegradationRate(processedHistorical),
        fireRisk: this.calculateFireRisk(processedHistorical),
        encroachmentRisk: processedEncroachment || 20,
        illegalLoggingProbability: processedDeforestation.hasDeforestation ? 75 : 15
      };

      const riskScore = this.calculateOverallRisk(factors);
      const riskLevel = this.calculateRiskLevel(riskScore);

      // ── Build and save risk assessment ────────────────────────
      const riskAssessment = new Risk({
        polygonId: polygonData.id || `polygon-${Date.now()}`,
        name: polygonData.name || 'Unnamed Area',
        coordinates: {
          type: 'Polygon',
          coordinates: polygonData.coordinates // Store original format
        },
        riskLevel,
        riskScore,
        factors,
        satelliteData: {
          source: processedTreeCover.source || 'Sentinel-2 L2A',
          imageryDate: new Date(),
          confidence: processedTreeCover.confidence || 75,
          changeDetected: processedDeforestation.hasDeforestation || false,
          treeCoverPercentage: processedTreeCover.treeCoverPercentage || 50,
          historicalComparison: {
            fiveYearChange: this.calculateHistoricalChange(processedHistorical, 5),
            tenYearChange: this.calculateHistoricalChange(processedHistorical, 10)
          }
        },
        actions: this.determineRequiredActions(riskLevel, factors),
        metadata: {
          createdBy: 'system',
          updatedAt: new Date(),
          region: processedSettlements[0]?.name || 'Unknown Region',
          tags: [riskLevel, processedTreeCover.source === 'mock' ? 'mock-data' : 'sentinel-hub']
        }
      });

      await riskAssessment.save();
      logger.info(`Risk saved: ${riskAssessment.name} [${riskLevel}] score=${riskScore}`);

      if (global.io) {
        global.io.emit('risk-update', {
          id: riskAssessment._id,
          name: riskAssessment.name,
          riskLevel: riskAssessment.riskLevel,
          riskScore: riskAssessment.riskScore,
          timestamp: new Date()
        });
      }

      return riskAssessment;
    } catch (error) {
      logger.error('Risk analysis failed:', error);
      throw error;
    }
  }

  processResult(result, mockData) {
    if (result.status === 'fulfilled' && result.value) {
      return result.value;
    }
    return mockData;
  }

  calculateDegradationRate(historicalData) {
    if (!historicalData || !historicalData.treeCover || historicalData.treeCover.length < 2) return 0;
    const recent = historicalData.treeCover[0] || 50;
    const old = historicalData.treeCover[historicalData.treeCover.length - 1] || 50;
    return Math.max(0, Math.min(100, ((old - recent) / old) * 100));
  }

  calculateFireRisk(historicalData) {
    if (!historicalData || !historicalData.ndvi || historicalData.ndvi.length === 0) return 40;
    const avgNdvi = historicalData.ndvi.reduce((a, b) => a + b, 0) / historicalData.ndvi.length;
    return Math.min(100, Math.round(Math.max(0, (0.8 - avgNdvi) / 0.8) * 100));
  }

  calculateHistoricalChange(historicalData, years) {
    if (!historicalData || !historicalData.treeCover || historicalData.treeCover.length < 2) return 0;
    const maxIndex = Math.min(years - 1, historicalData.treeCover.length - 1);
    const recent = historicalData.treeCover[0] || 50;
    const past = historicalData.treeCover[maxIndex] || 50;
    return parseFloat(((past - recent) / past * 100).toFixed(1));
  }

  calculateOverallRisk(factors) {
    const weights = {
      treeCoverLoss: 0.35,
      degradationRate: 0.20,
      fireRisk: 0.20,
      encroachmentRisk: 0.15,
      illegalLoggingProbability: 0.10
    };
    let weightedSum = 0;
    for (const [factor, value] of Object.entries(factors)) {
      weightedSum += (value * (weights[factor] || 0));
    }
    return Math.round(weightedSum);
  }

  determineRequiredActions(riskLevel, factors) {
    const actions = [];
    if (riskLevel === 'critical' || riskLevel === 'high') {
      actions.push({ 
        type: 'alert', 
        status: 'pending', 
        triggeredAt: new Date(),
        notes: `Urgent: ${riskLevel.toUpperCase()} risk detected` 
      });
      if (factors.illegalLoggingProbability > 70) {
        actions.push({ 
          type: 'legal_notification', 
          status: 'pending', 
          triggeredAt: new Date(),
          notes: 'Possible illegal logging activity detected' 
        });
      }
      actions.push({ 
        type: 'inspection', 
        status: 'pending', 
        triggeredAt: new Date(),
        notes: 'Immediate field inspection required' 
      });
    } else if (riskLevel === 'medium' && factors.fireRisk > 60) {
      actions.push({ 
        type: 'alert', 
        status: 'pending', 
        triggeredAt: new Date(),
        notes: 'Elevated fire risk detected' 
      });
    }
    return actions;
  }
}

module.exports = new RiskAnalysisService();