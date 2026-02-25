// server/services/riskAnalysisService.js
const Risk = require('../models/Risk');
const geeService = require('./googleEarthEngineService');
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

      // ── All data fetched in parallel ─────────────────────────
      const [
        treeCoverData,      // GEE Hansen: current tree cover %
        deforestationData,  // GEE Hansen: loss %, events, year
        historicalData,     // GEE Landsat: 10-year NDVI timeline
        geeFireScore,       // GEE MODIS: burn scar risk score 0-100
        encroachmentRisk,   // Overpass: proximity to roads/settlements
        settlements         // Overpass: nearby place names for metadata
      ] = await Promise.all([
        geeService.analyzeTreeCover(polygonData.coordinates),
        geeService.detectDeforestation(polygonData.coordinates),
        geeService.getHistoricalTrends(polygonData.coordinates),
        geeService.getFireRiskScore(polygonData.coordinates),
        overpassService.calculateEncroachmentRisk(polygonData),
        overpassService.getNearbySettlements(polygonData.coordinates)
      ]);

      // ── Risk factor calculation ───────────────────────────────
      const factors = {
        treeCoverLoss: Math.max(0, 100 - (treeCoverData.treeCoverPercentage || 0)),
        degradationRate: this.calculateDegradationRate(historicalData),
        // geeFireScore is real MODIS data; fall back to NDVI calc if GEE failed
        fireRisk: geeFireScore ?? this.calculateFireRiskFromNDVI(historicalData),
        encroachmentRisk,
        illegalLoggingProbability: deforestationData.hasDeforestation
          ? Math.min(95, 50 + (deforestationData.lossPercentage || 0))
          : 15
      };

      const riskScore = this.calculateOverallRisk(factors);
      const riskLevel = this.calculateRiskLevel(riskScore);

      // ── Build and save risk assessment ────────────────────────
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
          source: treeCoverData.source || 'GEE-Hansen-GFC-2023',
          imageryDate: new Date(),
          confidence: treeCoverData.confidence || 85,
          changeDetected: deforestationData.hasDeforestation || false,
          treeCoverPercentage: treeCoverData.treeCoverPercentage,
          historicalComparison: {
            fiveYearChange:  this.calculateHistoricalChange(historicalData, 5),
            tenYearChange:   this.calculateHistoricalChange(historicalData, 10)
          }
        },
        actions: this.determineRequiredActions(riskLevel, factors),
        metadata: {
          createdBy: 'system',
          updatedAt: new Date(),
          region: settlements[0]?.name || null,
          tags: [riskLevel, 'gee', 'hansen'],
          // Store GEE-specific extras for audit/display
          deforestationYear: deforestationData.primaryLossYear || null
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

  calculateDegradationRate(historicalData) {
    if (!historicalData.treeCover || historicalData.treeCover.length < 2) return 0;
    const recent = historicalData.treeCover[0] || 50;
    const old    = historicalData.treeCover[historicalData.treeCover.length - 1] || 50;
    return Math.max(0, Math.min(100, ((old - recent) / old) * 100));
  }

  // Used as fallback if GEE MODIS call fails
  calculateFireRiskFromNDVI(historicalData) {
    if (!historicalData.ndvi || historicalData.ndvi.length === 0) return 40;
    const avgNdvi = historicalData.ndvi.reduce((a, b) => a + b, 0) / historicalData.ndvi.length;
    return Math.min(100, Math.round(Math.max(0, (0.8 - avgNdvi) / 0.8) * 100));
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

  calculateHistoricalChange(historicalData, years) {
    if (!historicalData.treeCover || historicalData.treeCover.length < 2) return 0;
    const maxIndex = Math.min(years - 1, historicalData.treeCover.length - 1);
    const recent = historicalData.treeCover[0] || 50;
    const past   = historicalData.treeCover[maxIndex] || 50;
    return parseFloat(((past - recent) / past * 100).toFixed(1));
  }

  determineRequiredActions(riskLevel, factors) {
    const actions = [];
    if (riskLevel === 'critical' || riskLevel === 'high') {
      actions.push({ type: 'alert', status: 'pending', triggeredAt: new Date(),
        notes: `Urgent: ${riskLevel.toUpperCase()} risk detected` });
      if (factors.illegalLoggingProbability > 70) {
        actions.push({ type: 'legal_notification', status: 'pending', triggeredAt: new Date(),
          notes: 'Possible illegal logging activity detected' });
      }
      actions.push({ type: 'inspection', status: 'pending', triggeredAt: new Date(),
        notes: 'Immediate field inspection required' });
    } else if (riskLevel === 'medium' && factors.fireRisk > 60) {
      actions.push({ type: 'alert', status: 'pending', triggeredAt: new Date(),
        notes: 'Elevated fire risk detected' });
    }
    return actions;
  }
}

module.exports = new RiskAnalysisService();