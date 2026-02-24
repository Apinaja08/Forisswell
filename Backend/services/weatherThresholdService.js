/**
 * weatherThresholdService.js
 *
 * Evaluates real-time weather data (from the existing weatherService) against
 * configurable thresholds for each tree. When a threshold is breached, delegates
 * to alertService to create an alert and match nearby volunteers.
 *
 * Thresholds (env vars with defaults):
 *   THRESHOLD_TEMP_HIGH   = 35    °C   → "high_temperature" (watering needed)
 *   THRESHOLD_WIND_HIGH   = 60    km/h → "high_wind"         (branch risk)
 *   THRESHOLD_RAIN_LOW    = 5     mm   → "drought"           (watering needed)
 *   STORM_KEYWORDS        = "thunderstorm,tornado,hurricane"  → "storm"
 */

const Tree = require("../models/Tree");
const weatherService = require("./weatherService");
const alertService = require("./alertService");
const logger = require("../utils/logger");

// ─── Threshold Config ─────────────────────────────────────────────────────────

const getThresholds = () => ({
  tempHigh: Number(process.env.THRESHOLD_TEMP_HIGH) || 35,
  windHigh: Number(process.env.THRESHOLD_WIND_HIGH) || 60,
  rainLow: Number(process.env.THRESHOLD_RAIN_LOW) || 5,
  stormKeywords: (process.env.STORM_KEYWORDS || "thunderstorm,tornado,hurricane")
    .split(",")
    .map((k) => k.trim().toLowerCase()),
});

// ─── Single Tree Evaluation ───────────────────────────────────────────────────

/**
 * Fetch weather for a tree and evaluate all threshold rules.
 * Calls alertService.createAlert for each triggered condition.
 *
 * @returns {{ alertsCreated: number }}
 */
const evaluateTree = async (tree) => {
  const thresholds = getThresholds();
  const [lng, lat] = tree.location.coordinates;

  let weatherData;
  try {
    weatherData = await weatherService.getWeatherByCoordinates(lat, lng);
  } catch (err) {
    logger.warn(`[weatherThreshold] Cannot fetch weather for tree ${tree._id}: ${err.message}`);
    return { alertsCreated: 0 };
  }

  const { temperature, windSpeed, rainfall, description = "" } = weatherData;
  const descLower = description.toLowerCase();

  const weatherSnapshot = {
    temperature,
    windSpeed,
    humidity: weatherData.humidity,
    rainfall: rainfall ?? 0,
    description,
  };

  const triggered = [];

  // Rule 1 — High temperature
  if (temperature != null && temperature > thresholds.tempHigh) {
    triggered.push({
      alertType: "high_temperature",
      thresholdBreached: { field: "temperature", value: temperature, threshold: thresholds.tempHigh },
    });
  }

  // Rule 2 — High wind speed
  if (windSpeed != null && windSpeed > thresholds.windHigh) {
    triggered.push({
      alertType: "high_wind",
      thresholdBreached: { field: "windSpeed", value: windSpeed, threshold: thresholds.windHigh },
    });
  }

  // Rule 3 — Low rainfall (drought)
  if (rainfall != null && rainfall < thresholds.rainLow) {
    triggered.push({
      alertType: "drought",
      thresholdBreached: { field: "rainfall", value: rainfall, threshold: thresholds.rainLow },
    });
  }

  // Rule 4 — Storm keywords in weather description
  if (thresholds.stormKeywords.some((kw) => descLower.includes(kw))) {
    triggered.push({
      alertType: "storm",
      thresholdBreached: { field: "description", value: description, threshold: "storm keyword" },
    });
  }

  let alertsCreated = 0;
  for (const rule of triggered) {
    try {
      const result = await alertService.createAlert(
        tree._id,
        rule.alertType,
        "weather",
        weatherSnapshot,
        null,
        rule.thresholdBreached
      );
      if (result) alertsCreated++;
    } catch (err) {
      logger.error(
        `[weatherThreshold] Failed to create alert (${rule.alertType}) for tree ${tree._id}: ${err.message}`
      );
    }
  }

  if (triggered.length > 0) {
    logger.info(
      `[weatherThreshold] Tree ${tree._id} — ${triggered.length} condition(s) triggered, ${alertsCreated} alert(s) created`
    );
  }

  return { alertsCreated };
};

// ─── Scheduled Check (all active trees) ──────────────────────────────────────

/**
 * Called by node-cron every 15 minutes.
 * Iterates all active trees and evaluates weather for each.
 */
const runScheduledCheck = async () => {
  logger.info("[weatherThreshold] Starting scheduled weather check...");
  try {
    const trees = await Tree.find({ isActive: true });
    let totalAlerts = 0;

    for (const tree of trees) {
      const { alertsCreated } = await evaluateTree(tree);
      totalAlerts += alertsCreated;
    }

    logger.info(
      `[weatherThreshold] Scheduled check complete — ${trees.length} tree(s) checked, ${totalAlerts} alert(s) created`
    );
  } catch (err) {
    logger.error("[weatherThreshold] Scheduled check failed:", err.message);
  }
};

module.exports = { evaluateTree, runScheduledCheck };
