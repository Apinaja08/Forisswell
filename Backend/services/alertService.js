/**
 * alertService.js
 *
 * Core business logic for the full alert lifecycle:
 *   - Create alerts (called by weatherThresholdService / calendarAlertService)
 *   - Volunteer matching with geospatial $near query
 *   - Uber-style accept with race condition prevention
 *   - Status progression: searching → accepted → in_progress → resolved
 *   - Retry/fallback broadcast when no nearby volunteer is found
 *   - Admin cancel
 *
 * Real-time broadcasts are delegated to socketService.
 */

const Alert = require("../models/Alert");
const Volunteer = require("../models/Volunteer");
const Tree = require("../models/Tree");
const socketService = require("./socketService");
const logger = require("../utils/logger");

const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find available volunteers within maxDistance metres of [lng, lat].
 */
const findNearbyVolunteers = async ([lng, lat], maxDistance = 5000) => {
  return Volunteer.find({
    availabilityStatus: "available",
    isActive: true,
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: maxDistance,
      },
    },
  });
};

/**
 * Find all available active volunteers (no radius — used for fallback broadcast).
 */
const findAllAvailableVolunteers = async () => {
  return Volunteer.find({ availabilityStatus: "available", isActive: true });
};

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new alert and broadcast to nearby available volunteers.
 *
 * Deduplication: if an active alert (searching/accepted/in_progress) already
 * exists for the same tree + alertType, skip creation and return null.
 */
const createAlert = async (
  treeId,
  alertType,
  alertSource = "weather",
  weatherSnapshot = null,
  calendarEventId = null,
  thresholdBreached = null
) => {
  const tree = await Tree.findOne({ _id: treeId, isActive: true });
  if (!tree) throw createError(404, `Tree ${treeId} not found`);

  // Deduplication check
  const duplicate = await Alert.findOne({
    treeId,
    alertType,
    status: { $in: ["searching", "accepted", "in_progress"] },
  });
  if (duplicate) {
    logger.info(`[alertService] Skipped duplicate alert — tree:${treeId} type:${alertType}`);
    return null;
  }

  const alert = await Alert.create({
    treeId,
    alertType,
    alertSource,
    weatherSnapshot,
    calendarEventId,
    thresholdBreached,
  });

  // Find nearby volunteers (within 5 km)
  const [lng, lat] = tree.location.coordinates;
  const nearbyVolunteers = await findNearbyVolunteers([lng, lat], 5000);

  const notifiedIds = nearbyVolunteers.map((v) => v._id);

  if (notifiedIds.length > 0) {
    // Store who was notified (for targeted "dismiss pop-up" emit on accept)
    alert.notifiedVolunteers = notifiedIds;
    await alert.save();

    const payload = buildAlertPayload(alert, tree, nearbyVolunteers[0]);
    socketService.emitToVolunteers(notifiedIds, "new_alert", payload);
    logger.info(
      `[alertService] Alert ${alert._id} broadcasted to ${notifiedIds.length} volunteer(s)`
    );
  } else {
    logger.warn(
      `[alertService] No available volunteers within 5 km for alert ${alert._id}. Retry scheduled.`
    );
  }

  return { alert, notifiedCount: notifiedIds.length };
};

/**
 * Build the payload sent to volunteers via socket.
 */
const buildAlertPayload = (alert, tree, firstVolunteer) => ({
  alertId: alert._id,
  alertType: alert.alertType,
  alertSource: alert.alertSource,
  weatherSnapshot: alert.weatherSnapshot,
  thresholdBreached: alert.thresholdBreached,
  tree: {
    id: tree._id,
    name: tree.name || tree.species,
    species: tree.species,
    location: tree.location,
    address: tree.location?.address,
  },
  createdAt: alert.createdAt,
});

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Get all alerts with optional filters — admin use.
 * Supports: status, alertSource, treeId
 */
const getAlerts = async (filters = {}) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.alertSource) query.alertSource = filters.alertSource;
  if (filters.treeId) query.treeId = filters.treeId;

  return Alert.find(query)
    .populate("treeId", "name species location status")
    .populate("assignedVolunteer", "name email phone availabilityStatus")
    .sort({ createdAt: -1 });
};

/**
 * Get a single alert by ID.
 */
const getAlertById = async (id) => {
  const alert = await Alert.findById(id)
    .populate("treeId", "name species location status")
    .populate("assignedVolunteer", "name email phone availabilityStatus location")
    .populate("notifiedVolunteers", "name email");
  if (!alert) throw createError(404, "Alert not found");
  return alert;
};

/**
 * Get all alerts assigned to a specific volunteer.
 */
const getMyAlerts = async (volunteerId) => {
  return Alert.find({ assignedVolunteer: volunteerId })
    .populate("treeId", "name species location status")
    .sort({ createdAt: -1 });
};

// ─── Volunteer Lifecycle ──────────────────────────────────────────────────────

/**
 * Accept an alert.
 *
 * Uses findOneAndUpdate with status:"searching" as an atomic filter to
 * prevent two volunteers accepting the same alert (race condition safe).
 */
const acceptAlert = async (alertId, volunteerId) => {
  const updated = await Alert.findOneAndUpdate(
    { _id: alertId, status: "searching" },
    { $set: { status: "accepted", assignedVolunteer: volunteerId } },
    { new: true }
  );

  if (!updated) {
    // Alert was either not found or already accepted/in another state
    const exists = await Alert.findById(alertId);
    if (!exists) throw createError(404, "Alert not found");
    throw createError(400, "Alert already accepted by another volunteer");
  }

  // Mark volunteer as busy
  const volunteer = await Volunteer.findById(volunteerId);
  if (!volunteer) throw createError(404, "Volunteer not found");
  volunteer.availabilityStatus = "busy";
  await volunteer.save({ validateBeforeSave: false });

  // Dismiss pop-ups on all other notified volunteers' dashboards
  const otherVolunteers = updated.notifiedVolunteers.filter(
    (id) => id.toString() !== volunteerId.toString()
  );
  socketService.emitToVolunteers(otherVolunteers, "alert_accepted", {
    alertId,
    message: "Another volunteer has accepted this alert",
  });

  // Notify admins
  socketService.emitToAdmins("alert_accepted", {
    alertId,
    volunteerId,
    volunteerName: volunteer.name,
  });

  return Alert.findById(alertId)
    .populate("treeId", "name species location")
    .populate("assignedVolunteer", "name email phone");
};

/**
 * Volunteer starts work — alert moves to in_progress.
 */
const startWork = async (alertId, volunteerId) => {
  const alert = await Alert.findById(alertId);
  if (!alert) throw createError(404, "Alert not found");

  if (!alert.assignedVolunteer || alert.assignedVolunteer.toString() !== volunteerId.toString()) {
    throw createError(403, "You are not assigned to this alert");
  }
  if (alert.status !== "accepted") {
    throw createError(400, `Cannot start work — alert status is '${alert.status}'`);
  }

  alert.status = "in_progress";
  await alert.save();

  socketService.emitToAdmins("alert_progress", { alertId, volunteerId });

  return alert;
};

/**
 * Volunteer resolves alert — work is complete.
 *
 * After resolution:
 *   - alert.status → "resolved"
 *   - volunteer.availabilityStatus → "available"
 *   - "alert_resolved" is emitted globally so the tree-care module
 *     can update tree.healthStatus = "safe" on its side.
 */
const resolveAlert = async (alertId, volunteerId) => {
  const alert = await Alert.findById(alertId).populate("treeId");
  if (!alert) throw createError(404, "Alert not found");

  if (!alert.assignedVolunteer || alert.assignedVolunteer.toString() !== volunteerId.toString()) {
    throw createError(403, "You are not assigned to this alert");
  }
  if (alert.status !== "in_progress") {
    throw createError(400, `Cannot resolve — alert status is '${alert.status}'`);
  }

  alert.status = "resolved";
  await alert.save();

  // Free the volunteer
  const volunteer = await Volunteer.findById(volunteerId);
  if (volunteer) {
    volunteer.availabilityStatus = "available";
    await volunteer.save({ validateBeforeSave: false });
  }

  // Emit global event — tree-care module listens and updates tree.healthStatus
  socketService.emitAlertResolved(alertId, alert.treeId?._id || alert.treeId);
  socketService.emitToAdmins("alert_resolved", { alertId, volunteerId });

  return {
    alert,
    message: "Work completed successfully. Tree care team has been notified.",
  };
};

// ─── Admin ────────────────────────────────────────────────────────────────────

/**
 * Admin cancels an alert.
 * If a volunteer was assigned, they are freed.
 */
const cancelAlert = async (alertId) => {
  const alert = await Alert.findById(alertId);
  if (!alert) throw createError(404, "Alert not found");
  if (alert.status === "resolved" || alert.status === "cancelled") {
    throw createError(400, `Alert is already '${alert.status}'`);
  }

  alert.status = "cancelled";
  await alert.save();

  if (alert.assignedVolunteer) {
    const volunteer = await Volunteer.findById(alert.assignedVolunteer);
    if (volunteer) {
      volunteer.availabilityStatus = "available";
      await volunteer.save({ validateBeforeSave: false });
    }
  }

  socketService.emitToAdmins("alert_cancelled", { alertId });

  return alert;
};

// ─── Retry / Fallback ─────────────────────────────────────────────────────────

/**
 * Called by node-cron every 2 minutes for each "searching" alert.
 *
 * Retry logic:
 *   - retryCount < 3 → broadcast to ALL available volunteers (no radius limit)
 *   - retryCount >= 3 → cancel alert and notify admin
 */
const retryBroadcast = async (alertId) => {
  const alert = await Alert.findById(alertId).populate("treeId");
  if (!alert || alert.status !== "searching") return;

  if (alert.retryCount >= 3) {
    logger.warn(`[alertService] Alert ${alertId} — max retries reached. Cancelling.`);
    alert.status = "cancelled";
    await alert.save();
    socketService.emitToAdmins("alert_no_volunteer", {
      alertId,
      message: "No volunteer found after 3 retries. Alert cancelled.",
      tree: alert.treeId,
    });
    return;
  }

  const allVolunteers = await findAllAvailableVolunteers();
  if (allVolunteers.length === 0) {
    alert.retryCount += 1;
    await alert.save();
    logger.warn(`[alertService] Retry ${alert.retryCount} — still no available volunteers.`);
    return;
  }

  const allIds = allVolunteers.map((v) => v._id);
  // Merge with existing notifiedVolunteers (avoid duplicates)
  const existingSet = new Set(alert.notifiedVolunteers.map((id) => id.toString()));
  const newIds = allIds.filter((id) => !existingSet.has(id.toString()));
  alert.notifiedVolunteers = [...alert.notifiedVolunteers, ...newIds];
  alert.retryCount += 1;
  await alert.save();

  const payload = buildAlertPayload(alert, alert.treeId, null);
  socketService.emitToVolunteers(allIds, "new_alert", {
    ...payload,
    retryBroadcast: true,
    message: "Urgent: no volunteer found nearby. This alert is now open to all volunteers.",
  });

  logger.info(`[alertService] Retry ${alert.retryCount} — broadcasted to ${allIds.length} volunteer(s)`);
};

/**
 * Run retry checks for all currently "searching" alerts.
 * Called by node-cron every 2 minutes in Server.js.
 */
const runRetryChecks = async () => {
  try {
    const searchingAlerts = await Alert.find({ status: "searching" });
    for (const alert of searchingAlerts) {
      await retryBroadcast(alert._id);
    }
  } catch (err) {
    logger.error("[alertService] Retry check error:", err.message);
  }
};

module.exports = {
  createAlert,
  getAlerts,
  getAlertById,
  getMyAlerts,
  acceptAlert,
  startWork,
  resolveAlert,
  cancelAlert,
  retryBroadcast,
  runRetryChecks,
};
