const express = require("express");
const router = express.Router();

const { getWeatherByTree } = require("../controllers/weatherCareController");
const { protect } = require("../middleware/auth");

// All routes require authentication
router.use(protect);

// GET /api/weather-care/:treeId - Get weather data for a specific tree
router.get("/:treeId", getWeatherByTree);

module.exports = router;
