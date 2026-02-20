// server/services/riskAnalysisService.js
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
      // Fetch satellite data
      const treeCoverData = await collectEarthService.analyzeTreeCover(polygonData.coordinates);
      const deforestationData = await collectEarthService.detectDeforestation(polygonData.coordinates);
      const historicalData = await collectEarthService.getHistoricalTrends(polygonData.coordinates);

      // Calculate risk factors
      const factors = {
        treeCoverLoss: 100 - (treeCoverData.treeCoverPercentage || 0),
        degradationRate: this.calculateDegradationRate(historicalData),
        fireRisk: this.calculateFireRisk(polygonData, historicalData),
        encroachmentRisk: await this.calculateEncroachmentRisk(polygonData),
        illegalLoggingProbability: deforestationData.hasDeforestation ? 75 : 15
      };

      // Calculate overall risk score
      const riskScore = this.calculateOverallRisk(factors);
      const riskLevel = this.calculateRiskLevel(riskScore);

      // Create risk assessment
      const riskAssessment = new Risk({
        polygonId: polygonData.id || new mongoose.Types.ObjectId(),
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
      
      // Emit real-time update via WebSocket
      this.emitRiskUpdate(riskAssessment);

      return riskAssessment;
    } catch (error) {
      logger.error('Risk analysis failed:', error);
      throw error;
    }
  }

  calculateDegradationRate(historicalData) {
    if (!historicalData.treeCover || historicalData.treeCover.length < 2) return 0;
    
    const recent = historicalData.treeCover[0];
    const old = historicalData.treeCover[historicalData.treeCover.length - 1];
    const change = ((old - recent) / old) * 100;
    
    return Math.max(0, Math.min(100, change));
  }

  calculateFireRisk(polygonData, historicalData) {
    // Simplified fire risk calculation
    // In production, this would use weather data, vegetation dryness, etc.
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
    
    const recent = historicalData.treeCover[0];
    const past = historicalData.treeCover[years - 1];
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

  emitRiskUpdate(riskAssessment) {
    // WebSocket emission would be implemented here
    if (global.io) {
      global.io.emit('risk-update', {
        id: riskAssessment._id,
        riskLevel: riskAssessment.riskLevel,
        riskScore: riskAssessment.riskScore,
        timestamp: new Date()
      });
    }
  }
}

module.exports = new RiskAnalysisService();