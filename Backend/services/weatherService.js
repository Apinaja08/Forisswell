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

module.exports = {
  getWeatherByCoordinates,
};
