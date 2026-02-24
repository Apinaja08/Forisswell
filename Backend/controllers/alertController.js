/**
 * alertController.js
 *
 * HTTP layer for the full alert lifecycle.
 * Business logic is delegated to alertService.
 */

const alertService = require("../services/alertService");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ─── POST /api/alerts ─────────────────────────────────────────────────────────
// System/admin: manually create an alert for a tree.
exports.createAlert = asyncHandler(async (req, res) => {
  const { treeId, alertType, alertSource, weatherSnapshot, calendarEventId, thresholdBreached } =
    req.body;

  if (!treeId || !alertType) {
    const err = new Error("treeId and alertType are required");
    err.statusCode = 400;
    throw err;
  }

  const result = await alertService.createAlert(
    treeId,
    alertType,
    alertSource || "weather",
    weatherSnapshot,
    calendarEventId,
    thresholdBreached
  );

  if (!result) {
    return res.status(200).json({
      success: true,
      message: "Active alert for this tree and type already exists — skipped",
      data: null,
    });
  }

  res.status(201).json({
    success: true,
    message: "Alert created and nearby volunteers notified",
    data: {
      alert: result.alert,
      notifiedCount: result.notifiedCount,
    },
  });
});

// ─── GET /api/alerts ──────────────────────────────────────────────────────────
// Admin: list all alerts with optional filters (?status= &alertSource= &treeId=)
exports.getAlerts = asyncHandler(async (req, res) => {
  const filters = {};
  if (req.query.status) filters.status = req.query.status;
  if (req.query.alertSource) filters.alertSource = req.query.alertSource;
  if (req.query.treeId) filters.treeId = req.query.treeId;

  const alerts = await alertService.getAlerts(filters);
  res.status(200).json({
    success: true,
    message: "Alerts fetched successfully",
    count: alerts.length,
    data: { alerts },
  });
});

// ─── GET /api/alerts/:id ──────────────────────────────────────────────────────
// Any authenticated user: get a single alert (includes weatherSnapshot for volunteer dashboard)
exports.getAlertById = asyncHandler(async (req, res) => {
  const alert = await alertService.getAlertById(req.params.id);
  res.status(200).json({
    success: true,
    message: "Alert fetched successfully",
    data: { alert },
  });
});

// ─── GET /api/volunteers/me/alerts ────────────────────────────────────────────
// Volunteer: get their own alerts history
exports.getMyAlerts = asyncHandler(async (req, res) => {
  const alerts = await alertService.getMyAlerts(req.user.id);
  res.status(200).json({
    success: true,
    message: "Your alerts fetched successfully",
    count: alerts.length,
    data: { alerts },
  });
});

// ─── PUT /api/alerts/:id/accept ───────────────────────────────────────────────
// Volunteer: accept a searching alert (Uber-style, atomic, race-condition safe)
exports.acceptAlert = asyncHandler(async (req, res) => {
  const alert = await alertService.acceptAlert(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message: "Alert accepted. You are now assigned to this tree.",
    data: { alert },
  });
});

// ─── PUT /api/alerts/:id/start ────────────────────────────────────────────────
// Volunteer: start work on an accepted alert
exports.startWork = asyncHandler(async (req, res) => {
  const alert = await alertService.startWork(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message: "Work started. Alert is now in progress.",
    data: { alert },
  });
});

// ─── PUT /api/alerts/:id/resolve ─────────────────────────────────────────────
// Volunteer: mark work as complete
exports.resolveAlert = asyncHandler(async (req, res) => {
  const { alert, message } = await alertService.resolveAlert(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message,
    data: { alert },
  });
});

// ─── PUT /api/admin/alerts/:id/cancel ────────────────────────────────────────
// Admin: cancel an alert and free any assigned volunteer
exports.cancelAlert = asyncHandler(async (req, res) => {
  const alert = await alertService.cancelAlert(req.params.id);
  res.status(200).json({
    success: true,
    message: "Alert cancelled successfully",
    data: { alert },
  });
});
