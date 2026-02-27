const cron = require("node-cron");
const Tree = require("../models/Tree");
const Alert = require("../models/Alert");
const VolunteerProfile = require("../models/VolunteerProfile");
const weatherService = require("./weatherService");
// PWA Push Notifications disabled - user preference
// const pushNotificationService = require("./pushNotificationService");
const logger = require("../utils/logger");

class AlertService {
  constructor() {
    this.monitoringJob = null;
    this.expiryJob = null;
  }

  /**
   * Start automated weather monitoring with cron job
   */
  startWeatherMonitoring() {
    const interval = parseInt(process.env.ALERT_CHECK_INTERVAL) || 300000; // Default 5 minutes
    const cronExpression = this.convertMillisecondsToCron(interval);

    // Monitor weather every configured interval
    this.monitoringJob = cron.schedule(cronExpression, async () => {
      logger.info("Starting automated weather check for all trees...");
      await this.checkAllTreesWeather();
    });

    // Check for expired alerts every 5 minutes
    this.expiryJob = cron.schedule("*/5 * * * *", async () => {
      await this.expireOldAlerts();
    });

    logger.info(
      `Weather monitoring started with interval: ${interval}ms (${cronExpression})`
    );
  }

  /**
   * Stop weather monitoring jobs
   */
  stopWeatherMonitoring() {
    if (this.monitoringJob) {
      this.monitoringJob.stop();
      logger.info("Weather monitoring stopped");
    }
    if (this.expiryJob) {
      this.expiryJob.stop();
      logger.info("Alert expiry monitoring stopped");
    }
  }

  /**
   * Convert milliseconds to cron expression
   */
  convertMillisecondsToCron(ms) {
    const minutes = Math.floor(ms / 60000);
    
    // Minimum 1 minute for cron (cannot do sub-minute intervals)
    if (minutes < 1) {
      logger.warn(`Alert interval ${ms}ms is too short. Using 1 minute minimum.`);
      return `* * * * *`; // Every 1 minute
    }
    
    if (minutes < 60) {
      return `*/${minutes} * * * *`; // Every N minutes
    }
    
    const hours = Math.floor(minutes / 60);
    return `0 */${hours} * * *`; // Every N hours
  }

  /**
   * Main function: Check weather for all active trees
   */
  async checkAllTreesWeather() {
    try {
      // Fetch all active trees with location data
      const trees = await Tree.find({
        isActive: true,
        "location.coordinates": { $exists: true },
      }).select("name species location owner");

      logger.info(`Checking weather for ${trees.length} trees...`);

      let alertsCreated = 0;

      for (const tree of trees) {
        try {
          // Get weather data for tree location
          const [longitude, latitude] = tree.location.coordinates;
          const weatherData = await weatherService.getWeatherByCoordinates(
            latitude,
            longitude
          );

          // Evaluate if weather violates thresholds
          const evaluation = this.evaluateWeatherThresholds(weatherData);

          if (evaluation.violations.length > 0) {
            // Check if there's already a pending/assigned alert for this tree
            const existingAlert = await Alert.findOne({
              tree: tree._id,
              status: { $in: ["pending", "assigned", "in_progress"] },
              isActive: true,
            });

            if (!existingAlert) {
              // Create new alert
              const alert = await this.createAutomatedAlert(
                tree,
                weatherData,
                evaluation
              );

              // Find nearby volunteers
              const volunteers = await this.findNearbyVolunteers(
                tree.location.coordinates,
                process.env.VOLUNTEER_MATCH_RADIUS || 5
              );

              // Broadcast to volunteers
              if (volunteers.length > 0) {
                await this.broadcastAlertToVolunteers(alert, volunteers);
                const treeName = tree.name || tree.species || "Unknown tree";
                logger.info(
                  `Alert ${alert._id} for ${treeName} broadcasted to ${volunteers.length} volunteers`
                );
              } else {
                const treeName = tree.name || tree.species || "Unknown tree";
                logger.warn(
                  `No available volunteers found near tree: ${treeName} (${tree._id})`
                );
              }

              alertsCreated++;
            }
          }
        } catch (error) {
          const treeName = tree.name || tree.species || "Unknown tree";
          logger.error(`Error checking weather for tree: ${treeName} (${tree._id}):`, error);
        }
      }

      logger.info(`Weather check completed. ${alertsCreated} new alerts created.`);
    } catch (error) {
      logger.error("Error in checkAllTreesWeather:", error);
    }
  }

  /**
   * Evaluate weather data against thresholds
   */
  evaluateWeatherThresholds(weatherData) {
    const violations = [];
    let maxExcess = 0;

    const tempThreshold = parseFloat(process.env.ALERT_TEMP_THRESHOLD || 35);
    const rainThreshold = parseFloat(process.env.ALERT_RAIN_THRESHOLD || 50);
    const windThreshold = parseFloat(process.env.ALERT_WIND_THRESHOLD || 40);

    // Check temperature (in Celsius)
    if (weatherData.temperature > tempThreshold) {
      const excess = weatherData.temperature - tempThreshold;
      violations.push({
        type: "high_temperature",
        threshold: `${tempThreshold}°C`,
        actualValue: weatherData.temperature,
        excessAmount: excess,
      });
      maxExcess = Math.max(maxExcess, excess);
    }

    // Check rainfall (in mm/h)
    if (weatherData.rainfall > rainThreshold) {
      const excess = weatherData.rainfall - rainThreshold;
      violations.push({
        type: "heavy_rain",
        threshold: `${rainThreshold}mm/h`,
        actualValue: weatherData.rainfall,
        excessAmount: excess,
      });
      maxExcess = Math.max(maxExcess, excess);
    }

    // Check wind speed (convert m/s to km/h)
    const windSpeedKmh = weatherData.windSpeed * 3.6;
    if (windSpeedKmh > windThreshold) {
      const excess = windSpeedKmh - windThreshold;
      violations.push({
        type: "strong_wind",
        threshold: `${windThreshold}km/h`,
        actualValue: windSpeedKmh,
        excessAmount: excess,
      });
      maxExcess = Math.max(maxExcess, excess);
    }

    // Calculate priority based on violations
    const priority = this.calculatePriority(violations, maxExcess);

    return { violations, priority, maxExcess };
  }

  /**
   * Calculate alert priority
   */
  calculatePriority(violations, maxExcess) {
    if (violations.length >= 2) {
      return "critical"; // Multiple threats
    }
    if (maxExcess > 20) {
      return "critical"; // Significant excess
    }
    if (maxExcess > 10) {
      return "high";
    }
    if (maxExcess > 5) {
      return "medium";
    }
    return "low";
  }

  /**
   * Create automated alert in database
   */
  async createAutomatedAlert(tree, weatherData, evaluation) {
    const alertType =
      evaluation.violations.length > 1
        ? "multiple_threats"
        : evaluation.violations[0].type;

    // Determine required actions based on violations
    const actionRequired = [];
    evaluation.violations.forEach((v) => {
      if (v.type === "high_temperature") {
        actionRequired.push("water_tree", "provide_shade");
      } else if (v.type === "heavy_rain") {
        actionRequired.push("check_stability", "remove_standing_water");
      } else if (v.type === "strong_wind") {
        actionRequired.push("secure_branches", "inspect_damage");
      }
    });

    // Generate description
    const description = this.generateAlertDescription(tree, evaluation);

    const alert = new Alert({
      tree: tree._id,
      type: alertType,
      priority: evaluation.priority,
      status: "pending",
      description,
      weatherData: {
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        rainfall: weatherData.rainfall,
        windSpeed: weatherData.windSpeed,
        conditions: weatherData.description,
      },
      thresholdViolations: evaluation.violations,
      location: tree.location,
      actionRequired: [...new Set(actionRequired)], // Remove duplicates
    });

    await alert.save();
    
    const treeName = tree.name || tree.species || "Unknown tree";
    logger.info(`Created alert ${alert._id} for tree: ${treeName} (${tree._id})`);

    return alert;
  }

  /**
   * Generate human-readable alert description
   */
  generateAlertDescription(tree, evaluation) {
    const treeName = tree.name || `${tree.species} tree`;
    const violations = evaluation.violations.map((v) => {
      return `${v.type.replace(/_/g, " ")}: ${v.actualValue.toFixed(
        1
      )} (threshold: ${v.threshold})`;
    });

    return `${treeName} requires immediate attention. ${violations.join(
      ", "
    )}. Location: ${
      tree.location.address?.formatted || "coordinates provided"
    }.`;
  }

  /**
   * Find volunteers within radius of location
   */
  async findNearbyVolunteers(coordinates, radiusKm) {
    try {
      const volunteers = await VolunteerProfile.find({
        isActive: true,
        isAvailable: true,
        status: "available",
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: coordinates,
            },
            $maxDistance: radiusKm * 1000, // Convert km to meters
          },
        },
      })
        .populate("user", "fullName email")
        .limit(50); // Limit to 50 nearest volunteers

      return volunteers;
    } catch (error) {
      logger.error("Error finding nearby volunteers:", error);
      return [];
    }
  }

  /**
   * Broadcast alert to volunteers via Socket.io and push notifications
   */
  async broadcastAlertToVolunteers(alert, volunteers) {
    try {
      // Populate alert data for rich notification
      await alert.populate("tree", "name species location imageUrl");

      const alertData = {
        id: alert._id,
        type: alert.type,
        priority: alert.priority,
        description: alert.description,
        tree: {
          id: alert.tree._id,
          name: alert.tree.name || alert.tree.species,
          species: alert.tree.species,
          imageUrl: alert.tree.imageUrl,
        },
        location: alert.location,
        weatherData: alert.weatherData,
        actionRequired: alert.actionRequired,
        createdAt: alert.createdAt,
      };

      // Send Socket.io notifications
      if (global.io) {
        volunteers.forEach((volunteer) => {
          global.io.to(`volunteer-${volunteer.user._id}`).emit("new-alert", alertData);
        });
      }

      // Send push notifications
      // PWA Push Notifications disabled - user preference
      // const pushPayload = {
      //   title: `🌳 ${alert.priority.toUpperCase()} Alert!`,
      //   body: alert.description.substring(0, 100),
      //   icon: "/icons/alert-icon.png",
      //   badge: "/icons/badge.png",
      //   data: {
      //     alertId: alert._id.toString(),
      //     treeId: alert.tree._id.toString(),
      //     type: alert.type,
      //     url: `/volunteer-dashboard/alerts/${alert._id}`,
      //   },
      // };
      // await pushNotificationService.sendPushToMultiple(volunteers, pushPayload);
    } catch (error) {
      logger.error("Error broadcasting alert:", error);
    }
  }

  /**
   * Expire old alerts that weren't started
   */
  async expireOldAlerts() {
    try {
      const alerts = await Alert.find({
        status: "assigned",
        isActive: true,
        expiresAt: { $lte: new Date() },
      });

      for (const alert of alerts) {
        const expired = await alert.autoExpire();
        if (expired) {
          logger.info(`Alert ${alert._id} expired and released back to pending`);

          // Populate and notify volunteers again
          await alert.populate("tree", "name species location");
          const volunteers = await this.findNearbyVolunteers(
            alert.location.coordinates,
            process.env.VOLUNTEER_MATCH_RADIUS || 5
          );

          if (volunteers.length > 0) {
            await this.broadcastAlertToVolunteers(alert, volunteers);
          }

          // Notify original volunteer that alert was released
          if (alert.assignedTo && global.io) {
            global.io
              .to(`volunteer-${alert.assignedTo}`)
              .emit("alert-expired", { alertId: alert._id });
          }
        }
      }
    } catch (error) {
      logger.error("Error expiring old alerts:", error);
    }
  }

  /**
   * Notify volunteers when alert is accepted by someone
   */
  notifyAlertAccepted(alert, volunteers) {
    if (global.io) {
      volunteers.forEach((volunteer) => {
        global.io
          .to(`volunteer-${volunteer.user._id}`)
          .emit("alert-accepted", { alertId: alert._id });
      });
    }
  }
}

module.exports = new AlertService();
