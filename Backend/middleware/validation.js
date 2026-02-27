// Backend/middleware/validation.js
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

    // Check if coordinates exist
    if (!polygon.coordinates) {
      return res.status(400).json({
        success: false,
        error: 'Polygon coordinates are required'
      });
    }

    // More flexible type checking - accept both formats
    // Some clients send { type: "Polygon", coordinates: [...] }
    // Others send { coordinates: [...] } without type
    if (polygon.type && polygon.type !== 'Polygon') {
      return res.status(400).json({
        success: false,
        error: 'If type is provided, it must be "Polygon"'
      });
    }

    // Validate coordinates array
    const coordinates = polygon.coordinates;
    if (!Array.isArray(coordinates)) {
      return res.status(400).json({
        success: false,
        error: 'Coordinates must be an array'
      });
    }

    // Handle different coordinate formats
    let ring;
    if (Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0])) {
      // It's a GeoJSON polygon coordinates array (with rings)
      ring = coordinates[0];
    } else if (Array.isArray(coordinates[0]) && coordinates[0].length === 2) {
      // It's a simple ring
      ring = coordinates;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates format: expected array of [lng, lat] pairs'
      });
    }

    // Validate ring has enough points
    if (!Array.isArray(ring) || ring.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Polygon must have at least 4 points'
      });
    }

    // Check if polygon is closed (first and last point should be equal)
    const firstPoint = ring[0];
    const lastPoint = ring[ring.length - 1];
    
    // Allow small floating point differences
    const tolerance = 0.000001;
    const isClosed = Math.abs(firstPoint[0] - lastPoint[0]) < tolerance && 
                     Math.abs(firstPoint[1] - lastPoint[1]) < tolerance;
    
    if (!isClosed) {
      return res.status(400).json({
        success: false,
        error: 'Polygon must be closed (first and last coordinates must match)'
      });
    }

    // Validate coordinate ranges (longitude: -180 to 180, latitude: -90 to 90)
    for (const point of ring) {
      if (!Array.isArray(point) || point.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Each point must be an array of [longitude, latitude]'
        });
      }
      
      const [lng, lat] = point;
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'Coordinates must be numbers'
        });
      }
      
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
      error: 'Invalid polygon data: ' + error.message
    });
  }
};

module.exports = {
  validatePolygon
};