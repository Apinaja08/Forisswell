// services/riskAnalysisService.js
const Risk = require('../models/Risk');
const collectEarthService = require('./collectEarthService');
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

      // Fetch satellite data
      const treeCoverData = await collectEarthService.analyzeTreeCover(polygonData.coordinates);
      const deforestationData = await collectEarthService.detectDeforestation(polygonData.coordinates);
      const historicalData = await collectEarthService.getHistoricalTrends(polygonData.coordinates);

      // Calculate risk factors
      const factors = {
        treeCoverLoss: 100 - (treeCoverData.treeCoverPercentage || 0),
        degradationRate: this.calculateDegradationRate(historicalData),
        fireRisk: this.calculateFireRisk(historicalData),
        encroachmentRisk: await this.calculateEncroachmentRisk(polygonData),
        illegalLoggingProbability: deforestationData.hasDeforestation ? 75 : 15
      };

      // Calculate overall risk score
      const riskScore = this.calculateOverallRisk(factors);
      const riskLevel = this.calculateRiskLevel(riskScore);

      // Create risk assessment
      const riskAssessment = new Risk({
        polygonId: polygonData.id || `polygon-${Date.now()}`,
        name: polygonData.name || 'Unnamed Area',
        coordinates: polygonData.coordinates,
        riskLevel,
        riskScore,
        factors,
        satelliteData: {
          source: 'CollectEarthOnline',
          imageryDate: new Date(),
          confidence: treeCoverData.confidence || 85,
          changeDetected: deforestationData.hasDeforestation || false,
          treeCoverPercentage: treeCoverData.treeCoverPercentage,
          historicalComparison: {
            fiveYearChange: this.calculateHistoricalChange(historicalData, 5),
            tenYearChange: this.calculateHistoricalChange(historicalData, 10)
          }
        },
        actions: this.determineRequiredActions(riskLevel, factors)
      });

      await riskAssessment.save();
      logger.info(`Risk assessment created for ${riskAssessment.name} with level: ${riskLevel}`);

      // Emit real-time update via WebSocket if available
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
    const old = historicalData.treeCover[historicalData.treeCover.length - 1] || 50;
    const change = ((old - recent) / old) * 100;
    
    return Math.max(0, Math.min(100, change));
  }

  calculateFireRisk(historicalData) {
    const ndvi = historicalData.ndvi?.reduce((a, b) => a + b, 0) / historicalData.ndvi?.length || 0.5;
    const drynessFactor = (1 - ndvi) * 100;
    return Math.min(100, drynessFactor + (Math.random() * 20));
  }

  async calculateEncroachmentRisk(polygonData) {
    // This would analyze proximity to urban areas, agriculture, etc.
    // Simplified version for demonstration
    return Math.floor(Math.random() * 40) + 10; // 10-50%
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
      weightedSum += (value * weights[factor]);
    }

    return Math.round(weightedSum);
  }

  calculateHistoricalChange(historicalData, years) {
    if (!historicalData.treeCover || historicalData.treeCover.length < years) return 0;
    
    const recent = historicalData.treeCover[0] || 50;
    const past = historicalData.treeCover[years - 1] || 50;
    return ((past - recent) / past) * 100;
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