// Backend\middleware\validation.js
const logger = require('../utils/logger');

const validatePolygon = (req, res, next) => {
  try {
    const { polygon } = req.body;

    if (!polygon) {
      return res.status(400).json({
        success: false,
        error: 'Polygon object is required'
      });
    }

    if (!polygon.coordinates) {
      return res.status(400).json({
        success: false,
        error: 'Polygon coordinates are required'
      });
    }

    // Validate GeoJSON format
    if (polygon.type !== 'Polygon') {
        return res.status(400).json({
        success: false,
        error: 'Coordinates must be of type Polygon'
      });
    }

    // Validate coordinates array
    const coordinates = polygon.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates format'
      });
    }

    // Validate each coordinate ring
    const firstRing = coordinates[0];
    if (!Array.isArray(firstRing) || firstRing.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Polygon must have at least 4 points'
      });
    }

    // Check if polygon is closed (first and last point should be equal)
    const firstPoint = firstRing[0];
    const lastPoint = firstRing[firstRing.length - 1];
    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      return res.status(400).json({
        success: false,
        error: 'Polygon must be closed (first and last coordinates must match)'
      });
    }

    // Validate coordinate ranges (longitude: -180 to 180, latitude: -90 to 90)
    for (const point of firstRing) {
      const [lng, lat] = point;
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        return res.status(400).json({
          success: false,
          error: 'Invalid coordinates: longitude must be between -180 and 180, latitude between -90 and 90'
        });
      }
    }

    logger.info(`Polygon validation passed for area: ${polygon.name || 'unnamed'}`);
    next();
  } catch (error) {
    logger.error('Polygon validation error:', error);
    return res.status(400).json({
      success: false,
      error: 'Invalid polygon data'
    });
  }
};

module.exports = {
  validatePolygon
};