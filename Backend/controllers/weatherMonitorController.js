/**
 * weatherMonitorController.js
 *
 * Admin-only manual triggers for weather and calendar checks.
 * The automatic schedule runs via node-cron in Server.js.
 * These endpoints are for testing, debugging, or on-demand runs.
 */

const weatherThresholdService = require("../services/weatherThresholdService");
const calendarAlertService = require("../services/calendarAlertService");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ─── POST /api/admin/weather-check ───────────────────────────────────────────
// Trigger an immediate weather threshold check across all active trees.
exports.triggerWeatherCheck = asyncHandler(async (req, res) => {
  // Run without awaiting full completion if desired — here we await for response
  await weatherThresholdService.runScheduledCheck();
  res.status(200).json({
    success: true,
    message: "Weather check triggered successfully. Alerts created for any threshold breaches.",
  });
});

// ─── POST /api/admin/calendar-check ──────────────────────────────────────────
// Trigger an immediate Google Calendar scan across all active trees.
exports.triggerCalendarCheck = asyncHandler(async (req, res) => {
  const result = await calendarAlertService.runCalendarCheckForAllTrees();
  res.status(200).json({
    success: true,
    message: `Calendar check complete — ${result.treesChecked} tree(s) checked, ${result.alertsCreated} alert(s) created`,
    data: result,
  });
});
