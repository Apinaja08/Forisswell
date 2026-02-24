// server/models/Risk.js
const mongoose = require('mongoose');

const riskSchema = new mongoose.Schema({
  polygonId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon'
    },
    coordinates: {
      type: [[[Number]]], // Array of rings of coordinates
      required: true
    }
  },
  analysisDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  riskLevel: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    required: true
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  factors: {
    treeCoverLoss: { type: Number, min: 0, max: 100 },
    degradationRate: { type: Number, min: 0, max: 100 },
    fireRisk: { type: Number, min: 0, max: 100 },
    encroachmentRisk: { type: Number, min: 0, max: 100 },
    illegalLoggingProbability: { type: Number, min: 0, max: 100 }
  },
  satelliteData: {
    source: { type: String, default: 'CollectEarthOnline' },
    imageryDate: Date,
    confidence: { type: Number, min: 0, max: 100 },
    changeDetected: Boolean,
    treeCoverPercentage: Number,
    historicalComparison: {
      fiveYearChange: Number,
      tenYearChange: Number
    }
  },
  actions: [{
    type: {
      type: String,
      enum: ['alert', 'inspection', 'intervention', 'legal_notification']
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed'],
      default: 'pending'
    },
    triggeredAt: { type: Date, default: Date.now },
    completedAt: Date,
    assignedTo: String,
    notes: String
  }],
  metadata: {
    createdBy: { type: String, default: 'system' },
    updatedAt: { type: Date, default: Date.now },
    tags: [String],
    region: String,
    country: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
riskSchema.index({ riskLevel: 1, analysisDate: -1 });
riskSchema.index({ 'satelliteData.changeDetected': 1 });
riskSchema.index({ 'factors.fireRisk': 1 });

const Risk = mongoose.model('Risk', riskSchema);
module.exports = Risk;