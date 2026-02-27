const axios = require("axios");

/**
 * Fetches weather data from OpenWeatherMap API for given coordinates.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Weather data object
 */
const getWeatherByCoordinates = async (lat, lon) => {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENWEATHER_API_KEY is not configured");
  }

  const url = `https://api.openweathermap.org/data/2.5/weather`;

  try {
    const response = await axios.get(url, {
      params: {
        lat,
        lon,
        appid: apiKey,
        units: "metric",
      },
    });

    const data = response.data;

    return {
      temperature: data.main.temp,
      humidity: data.main.humidity,
      rainfall: data.rain?.["1h"] || data.rain?.["3h"] || 0,
      windSpeed: data.wind.speed,
      description: data.weather?.[0]?.description || "No description available",
    };
  } catch (error) {
    if (error.response) {
      throw new Error(
        `OpenWeatherMap API error: ${error.response.status} - ${error.response.data?.message || "Unknown error"}`
      );
    }
    throw new Error(`Failed to fetch weather data: ${error.message}`);
  }
};

/**
 * Convert wind speed from m/s to km/h
 * @param {number} ms - Wind speed in meters per second
 * @returns {number} Wind speed in kilometers per hour
 */
const convertWindSpeed = (ms) => {
  return ms * 3.6;
};

/**
 * Check weather data against configured thresholds
 * @param {Object} weatherData - Weather data from getWeatherByCoordinates
 * @returns {Object} Threshold check results with violations and priority
 */
const checkThresholds = (weatherData) => {
  const violations = [];
  const tempThreshold = parseFloat(process.env.ALERT_TEMP_THRESHOLD || 35);
  const rainThreshold = parseFloat(process.env.ALERT_RAIN_THRESHOLD || 50);
  const windThreshold = parseFloat(process.env.ALERT_WIND_THRESHOLD || 40);

  // Check temperature
  if (weatherData.temperature > tempThreshold) {
    violations.push({
      type: "high_temperature",
      threshold: tempThreshold,
      actual: weatherData.temperature,
      unit: "°C",
      exceeded: true,
    });
  }

  // Check rainfall
  if (weatherData.rainfall > rainThreshold) {
    violations.push({
      type: "heavy_rain",
      threshold: rainThreshold,
      actual: weatherData.rainfall,
      unit: "mm/h",
      exceeded: true,
    });
  }

  // Check wind speed (convert to km/h)
  const windSpeedKmh = convertWindSpeed(weatherData.windSpeed);
  if (windSpeedKmh > windThreshold) {
    violations.push({
      type: "strong_wind",
      threshold: windThreshold,
      actual: windSpeedKmh,
      unit: "km/h",
      exceeded: true,
    });
  }

  // Determine priority
  let priority = "low";
  if (violations.length >= 2) {
    priority = "critical";
  } else if (violations.length === 1) {
    const violation = violations[0];
    const percentOver = ((violation.actual - violation.threshold) / violation.threshold) * 100;
    if (percentOver > 50) {
      priority = "critical";
    } else if (percentOver > 30) {
      priority = "high";
    } else if (percentOver > 15) {
      priority = "medium";
    }
  }

  return {
    violations,
    priority,
    hasViolations: violations.length > 0,
    details: {
      temperature: {
        value: weatherData.temperature,
        threshold: tempThreshold,
        exceeded: weatherData.temperature > tempThreshold,
      },
      rainfall: {
        value: weatherData.rainfall,
        threshold: rainThreshold,
        exceeded: weatherData.rainfall > rainThreshold,
      },
      windSpeed: {
        value: windSpeedKmh,
        threshold: windThreshold,
        exceeded: windSpeedKmh > windThreshold,
      },
    },
  };
};

module.exports = {
  getWeatherByCoordinates,
  convertWindSpeed,
  checkThresholds,
};

