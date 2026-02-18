const mongoose = require("mongoose");
const Tree = require("../models/Tree");
const weatherService = require("../services/weatherService");

const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

/**
 * @desc    Get weather data for a specific tree's location
 * @route   GET /api/weather-care/:treeId
 * @access  Private
 */
exports.getWeatherByTree = async (req, res, next) => {
  try {
    const { treeId } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(treeId)) {
      throw createError(400, "Invalid tree ID format");
    }

    // Fetch tree from database
    const tree = await Tree.findOne({ _id: treeId, isActive: true });

    if (!tree) {
      throw createError(404, "Tree not found");
    }

    // Extract coordinates (location.coordinates is [longitude, latitude])
    const [lon, lat] = tree.location.coordinates;

    // Get weather data from service
    const weatherData = await weatherService.getWeatherByCoordinates(lat, lon);

    res.status(200).json({
      success: true,
      message: "Weather data fetched successfully",
      data: {
        treeId: tree._id,
        treeName: tree.name || tree.species,
        location: {
          coordinates: tree.location.coordinates,
          address: tree.location.address,
        },
        weather: weatherData,
      },
    });
  } catch (error) {
    next(error);
  }
};
