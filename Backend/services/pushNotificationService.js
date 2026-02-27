const webpush = require("web-push");
const logger = require("../utils/logger");

class PushNotificationService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize web-push with VAPID keys
   */
  initialize() {
    try {
      const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
      const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
      const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@forisswell.com";

      if (!vapidPublicKey || !vapidPrivateKey) {
        logger.warn(
          "VAPID keys not configured. Push notifications will not work. " +
          "Run: npx web-push generate-vapid-keys"
        );
        return false;
      }

      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

      this.initialized = true;
      logger.info("Push notification service initialized successfully");
      return true;
    } catch (error) {
      logger.error("Failed to initialize push notification service:", error);
      return false;
    }
  }

  /**
   * Send push notification to a single volunteer
   * @param {Object} volunteerProfile - VolunteerProfile with pushSubscription
   * @param {Object} payload - Notification payload
   */
  async sendPushToVolunteer(volunteerProfile, payload) {
    if (!this.initialized) {
      logger.warn("Push notification service not initialized");
      return { success: false, error: "Service not initialized" };
    }

    if (!volunteerProfile.pushSubscription || !volunteerProfile.pushSubscription.endpoint) {
      logger.debug(`Volunteer ${volunteerProfile._id} has no push subscription`);
      return { success: false, error: "No subscription" };
    }

    try {
      const subscription = {
        endpoint: volunteerProfile.pushSubscription.endpoint,
        keys: {
          p256dh: volunteerProfile.pushSubscription.keys.p256dh,
          auth: volunteerProfile.pushSubscription.keys.auth,
        },
      };

      const payloadString = JSON.stringify(payload);

      await webpush.sendNotification(subscription, payloadString);

      logger.debug(`Push notification sent to volunteer ${volunteerProfile._id}`);
      return { success: true };
    } catch (error) {
      logger.error(
        `Failed to send push notification to volunteer ${volunteerProfile._id}:`,
        error
      );

      // If subscription is invalid/expired, we might want to remove it
      if (error.statusCode === 410) {
        logger.info(
          `Push subscription expired for volunteer ${volunteerProfile._id}, should be removed`
        );
        return { success: false, error: "Subscription expired", shouldRemove: true };
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to multiple volunteers
   * @param {Array} volunteers - Array of VolunteerProfiles
   * @param {Object} payload - Notification payload
   */
  async sendPushToMultiple(volunteers, payload) {
    if (!this.initialized) {
      logger.warn("Push notification service not initialized");
      return { sent: 0, failed: 0 };
    }

    const results = { sent: 0, failed: 0, expired: [] };

    const promises = volunteers.map(async (volunteer) => {
      const result = await this.sendPushToVolunteer(volunteer, payload);
      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        if (result.shouldRemove) {
          results.expired.push(volunteer._id);
        }
      }
    });

    await Promise.allSettled(promises);

    logger.info(
      `Push notifications sent: ${results.sent} successful, ${results.failed} failed`
    );

    return results;
  }

  /**
   * Create notification payload for new alert
   * @param {Object} alert - Alert document
   */
  createAlertPayload(alert) {
    const priorityEmoji = {
      critical: "🚨",
      high: "⚠️",
      medium: "⚡",
      low: "ℹ️",
    };

    const emoji = priorityEmoji[alert.priority] || "🌳";

    return {
      title: `${emoji} ${alert.priority.toUpperCase()} - Tree Alert`,
      body: alert.description.substring(0, 100),
      icon: "/icons/tree-alert-icon.png",
      badge: "/icons/badge.png",
      vibrate: alert.priority === "critical" ? [200, 100, 200] : [100],
      data: {
        alertId: alert._id.toString(),
        treeId: alert.tree ? alert.tree._id.toString() : null,
        type: alert.type,
        priority: alert.priority,
        url: `/volunteer-dashboard/alerts/${alert._id}`,
        timestamp: Date.now(),
      },
      actions: [
        {
          action: "view",
          title: "View Details",
        },
        {
          action: "close",
          title: "Dismiss",
        },
      ],
      requireInteraction: alert.priority === "critical",
    };
  }

  /**
   * Create notification payload for alert assignment confirmation
   */
  createAssignmentPayload(alert) {
    return {
      title: "✅ Alert Accepted",
      body: `You've been assigned to assist with ${alert.tree?.name || "a tree"}. Don't forget to start the task!`,
      icon: "/icons/success-icon.png",
      badge: "/icons/badge.png",
      data: {
        alertId: alert._id.toString(),
        type: "assignment",
        url: `/volunteer-dashboard/alerts/${alert._id}`,
      },
    };
  }

  /**
   * Create notification payload for alert completion
   */
  createCompletionPayload(alert, hours) {
    return {
      title: "🎉 Great Work!",
      body: `You've completed the task! You contributed ${hours.toFixed(1)} hours.`,
      icon: "/icons/completion-icon.png",
      badge: "/icons/badge.png",
      data: {
        alertId: alert._id.toString(),
        type: "completion",
        hours: hours,
        url: `/volunteer-dashboard/stats`,
      },
    };
  }

  /**
   * Create notification payload for alert expiry
   */
  createExpiryPayload(alert) {
    return {
      title: "⏰ Alert Timeout",
      body: "The alert you acepted has been released due to inactivity. It's now available to other volunteers.",
      icon: "/icons/warning-icon.png",
      badge: "/icons/badge.png",
      data: {
        alertId: alert._id.toString(),
        type: "expiry",
        url: `/volunteer-dashboard`,
      },
    };
  }

  /**
   * Test push notification (for debugging)
   */
  async testPush(subscription) {
    const testPayload = {
      title: "🌳 Forisswell Test Notification",
      body: "Push notifications are working correctly!",
      icon: "/icons/test-icon.png",
      data: { test: true },
    };

    try {
      const sub = {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      };

      await webpush.sendNotification(sub, JSON.stringify(testPayload));
      return { success: true, message: "Test notification sent" };
    } catch (error) {
      logger.error("Test push notification failed:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PushNotificationService();
