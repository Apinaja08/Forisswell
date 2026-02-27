const express = require("express");
const router = express.Router();

const { getWeatherByTree } = require("../controllers/weatherCareController");
const { protect } = require("../middleware/auth");


router.use(protect);

router.get("/:treeId", getWeatherByTree);

module.exports = router;
