// server/routes/riskRoutes.js
const express = require('express');
const router = express.Router();
// const rateLimit = require('express-rate-limit');
const riskController = require('../controllers/riskController.js');
const { validatePolygon } = require('../middleware/validation');
const { protect } = require("../middleware/auth");

router.use(protect);
// Rate limiting for analysis endpoint
// const analysisLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 50, // limit each IP to 50 requests per windowMs
//   message: 'Too many analysis requests, please try again later'
// });

// CRUD Operations
router.post('/analyze', validatePolygon,protect, riskController.analyzeRisk);
router.get('/high', protect, riskController.getHighRisks);
router.get('/stats', protect, riskController.getRiskStats);
router.get('/:id', protect, riskController.getRiskById);
router.put('/update/:id', protect, riskController.updateRisk);
router.delete('/:id', protect, riskController.deleteRisk);

module.exports = router;