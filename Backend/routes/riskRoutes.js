// server/routes/riskRoutes.js
const express = require('express');
const router = express.Router();
// const rateLimit = require('express-rate-limit');
const riskController = require('../controllers/riskController.js');
const { validatePolygon } = require('../middleware/validation');

// Rate limiting for analysis endpoint
// const analysisLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 50, // limit each IP to 50 requests per windowMs
//   message: 'Too many analysis requests, please try again later'
// });

// CRUD Operations
router.post('/analyze', validatePolygon, riskController.analyzeRisk);
router.get('/high', riskController.getHighRisks);
router.get('/stats', riskController.getRiskStats);
router.get('/:id', riskController.getRiskById);
router.put('/update/:id', riskController.updateRisk);
router.delete('/:id', riskController.deleteRisk);

module.exports = router;