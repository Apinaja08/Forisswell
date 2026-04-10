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
      logger.info(`========================================`);
      logger.info(`Starting risk analysis for: ${polygonData.name || 'unnamed'}`);
      logger.info(`========================================`);

      // Extract coordinates
      let coordinates = polygonData.coordinates;
      let coordinatesForServices = coordinates;
      
      if (Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0])) {
        coordinatesForServices = coordinates;
      } else if (Array.isArray(coordinates[0]) && coordinates[0].length === 2) {
        coordinatesForServices = [coordinates];
      }

      logger.info(`Fetching tree cover data from Sentinel Hub...`);
      
      // Get tree cover data directly
      const treeCoverData = await sentinelHubService.analyzeTreeCover(coordinatesForServices);
      
      logger.info(`Tree cover data received:`, {
        source: treeCoverData.source,
        treeCoverPercentage: treeCoverData.treeCoverPercentage,
        ndviMean: treeCoverData.ndviMean
      });
      
      // Get deforestation data
      const deforestationData = await sentinelHubService.detectDeforestation(coordinatesForServices);
      
      logger.info(`Deforestation data:`, {
        source: deforestationData.source,
        hasDeforestation: deforestationData.hasDeforestation
      });
      
      // Get historical data
      const historicalData = await sentinelHubService.getHistoricalTrends(coordinatesForServices);
      
      // Get encroachment risk
      const standardizedPolygon = {
        ...polygonData,
        coordinates: coordinatesForServices
      };
      const encroachmentRisk = await overpassService.calculateEncroachmentRisk(standardizedPolygon);
      
      // Get nearby settlements
      const settlements = await overpassService.getNearbySettlements(coordinatesForServices);
      
      logger.info(`All data fetched successfully`);

      // Calculate risk factors
      const factors = {
        treeCoverLoss: Math.max(0, 100 - (treeCoverData.treeCoverPercentage || 50)),
        degradationRate: this.calculateDegradationRate(historicalData),
        fireRisk: this.calculateFireRisk(historicalData),
        encroachmentRisk: typeof encroachmentRisk === 'number' ? encroachmentRisk : 25,
        illegalLoggingProbability: deforestationData.hasDeforestation ? 75 : 15
      };

      logger.info(`📈 Risk factors:`, factors);

      const riskScore = this.calculateOverallRisk(factors);
      const riskLevel = this.calculateRiskLevel(riskScore);

      logger.info(`🎯 Overall risk: ${riskLevel.toUpperCase()} (Score: ${riskScore})`);

      // Build region info from settlements
      let region = 'Unknown Region';
      let country = 'Unknown';
      if (settlements && settlements.length > 0 && settlements[0]) {
        region = settlements[0].name || 'Unknown Region';
      }

      // Create risk assessment
      const riskAssessment = new Risk({
        polygonId: polygonData.id || `polygon-${Date.now()}`,
        name: polygonData.name || 'Unnamed Area',
        coordinates: {
          type: 'Polygon',
          coordinates: polygonData.coordinates
        },
        riskLevel,
        riskScore,
        factors,
        satelliteData: {
          source: treeCoverData.source || 'Sentinel-2 L2A',
          imageryDate: new Date(),
          confidence: treeCoverData.confidence || 75,
          changeDetected: deforestationData.hasDeforestation || false,
          treeCoverPercentage: treeCoverData.treeCoverPercentage || 50,
          historicalComparison: {
            fiveYearChange: this.calculateHistoricalChange(historicalData, 5),
            tenYearChange: this.calculateHistoricalChange(historicalData, 10)
          }
        },
        actions: this.determineRequiredActions(riskLevel, factors),
        metadata: {
          createdBy: 'system',
          updatedAt: new Date(),
          region: region,
          country: country,
          tags: [riskLevel, treeCoverData.source === 'mock' ? 'mock-data' : 'sentinel-hub']
        }
      });

      await riskAssessment.save();
      logger.info(`✅ Risk assessment saved successfully! ID: ${riskAssessment._id}`);
      logger.info(`   Using ${treeCoverData.source === 'mock' ? 'MOCK' : 'REAL'} data from ${treeCoverData.source}`);

      return riskAssessment;
    } catch (error) {
      logger.error('❌ Risk analysis failed:', error);
      throw error;
    }
  }

  calculateDegradationRate(historicalData) {
    if (!historicalData || !historicalData.treeCover || historicalData.treeCover.length < 2) return 0;
    const recent = historicalData.treeCover[0] || 50;
    const old = historicalData.treeCover[historicalData.treeCover.length - 1] || 50;
    const rate = Math.max(0, Math.min(100, ((old - recent) / old) * 100));
    return rate;
  }

  calculateFireRisk(historicalData) {
    if (!historicalData || !historicalData.ndvi || historicalData.ndvi.length === 0) return 40;
    const avgNdvi = historicalData.ndvi.reduce((a, b) => a + b, 0) / historicalData.ndvi.length;
    const risk = Math.min(100, Math.round(Math.max(0, (0.8 - avgNdvi) / 0.8) * 100));
    return risk;
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
    
    if (riskLevel === 'critical') {
      actions.push({ 
        type: 'alert', 
        status: 'pending', 
        triggeredAt: new Date(),
        notes: 'CRITICAL: Immediate intervention required!' 
      });
      actions.push({ 
        type: 'inspection', 
        status: 'pending', 
        triggeredAt: new Date(),
        notes: 'Emergency field inspection required within 24 hours' 
      });
      if (factors.illegalLoggingProbability > 70) {
        actions.push({ 
          type: 'legal_notification', 
          status: 'pending', 
          triggeredAt: new Date(),
          notes: 'Potential illegal activity - notify authorities' 
        });
      }
    } else if (riskLevel === 'high') {
      actions.push({ 
        type: 'alert', 
        status: 'pending', 
        triggeredAt: new Date(),
        notes: 'HIGH risk - schedule intervention' 
      });
      actions.push({ 
        type: 'inspection', 
        status: 'pending', 
        triggeredAt: new Date(),
        notes: 'Field inspection recommended within 1 week' 
      });
    } else if (riskLevel === 'medium' && factors.fireRisk > 60) {
      actions.push({ 
        type: 'alert', 
        status: 'pending', 
        triggeredAt: new Date(),
        notes: 'Elevated fire risk - monitor closely' 
      });
    }
    
    return actions;
  }
}

module.exports = new RiskAnalysisService();