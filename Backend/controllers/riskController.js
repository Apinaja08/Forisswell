// server/controllers/riskController.js
const Risk = require('../models/Risk');
const riskAnalysisService = require('../services/riskAnalysisService');
const logger = require('../utils/logger');

exports.analyzeRisk = async (req, res) => {
  try {
    const { polygon } = req.body;
    
    if (!polygon || !polygon.coordinates) {
      return res.status(400).json({
        success: false,
        error: 'Valid polygon coordinates are required'
      });
    }

    const analysis = await riskAnalysisService.analyzeArea(polygon);
    
    res.status(201).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('Risk analysis endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze risk'
    });
  }
};

exports.getHighRisks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'riskScore',
      order = 'desc'
    } = req.query;

    const query = {
      riskLevel: { $in: ['critical', 'high'] }
    };

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: order === 'desc' ? -1 : 1 },
      populate: 'actions'
    };

    const risks = await Risk.find(query)
      .sort(options.sort)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit);

    const total = await Risk.countDocuments(query);

    res.json({
      success: true,
      data: risks,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit)
      }
    });
  } catch (error) {
    logger.error('Get high risks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch high risks'
    });
  }
};

exports.updateRisk = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating certain fields
    delete updates._id;
    delete updates.analysisDate;
    delete updates.satelliteData;

    updates['metadata.updatedAt'] = new Date();

    const risk = await Risk.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!risk) {
      return res.status(404).json({
        success: false,
        error: 'Risk assessment not found'
      });
    }

    res.json({
      success: true,
      data: risk
    });
  } catch (error) {
    logger.error('Update risk error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update risk assessment'
    });
  }
};

exports.deleteRisk = async (req, res) => {
  try {
    const { id } = req.params;

    const risk = await Risk.findByIdAndDelete(id);

    if (!risk) {
      return res.status(404).json({
        success: false,
        error: 'Risk assessment not found'
      });
    }

    res.json({
      success: true,
      message: 'Risk assessment deleted successfully'
    });
  } catch (error) {
    logger.error('Delete risk error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete risk assessment'
    });
  }
};

exports.getRiskById = async (req, res) => {
  try {
    const { id } = req.params;

    const risk = await Risk.findById(id);

    if (!risk) {
      return res.status(404).json({
        success: false,
        error: 'Risk assessment not found'
      });
    }

    res.json({
      success: true,
      data: risk
    });
  } catch (error) {
    logger.error('Get risk by id error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch risk assessment'
    });
  }
};

exports.getRiskStats = async (req, res) => {
  try {
    const stats = await Risk.aggregate([
      {
        $group: {
          _id: '$riskLevel',
          count: { $sum: 1 },
          avgRiskScore: { $avg: '$riskScore' },
          maxRiskScore: { $max: '$riskScore' }
        }
      }
    ]);

    const total = await Risk.countDocuments();
    const critical = await Risk.countDocuments({ riskLevel: 'critical' });

    res.json({
      success: true,
      data: {
        byLevel: stats,
        total,
        critical,
        criticalPercentage: (critical / total * 100).toFixed(2)
      }
    });
  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
};