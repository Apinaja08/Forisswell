const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/auth");
const volunteerController = require("../controllers/volunteerController");
const alertController = require("../controllers/alertController");
const weatherMonitorController = require("../controllers/weatherMonitorController");

// All admin routes require a valid JWT AND the "admin" role.
router.use(protect, authorize("admin"));

// ── Volunteers ────────────────────────────────────────────────────────────────
// GET /api/admin/volunteers?availabilityStatus=available|busy
router.get("/volunteers", volunteerController.getAllVolunteers);

// ── Alerts ────────────────────────────────────────────────────────────────────
// GET /api/admin/alerts?status=searching|accepted|in_progress|resolved|cancelled
//                      &alertSource=weather|calendar
//                      &treeId=<id>
router.get("/alerts", alertController.getAlerts);

// PUT /api/admin/alerts/:id/cancel
router.put("/alerts/:id/cancel", alertController.cancelAlert);

// ── Weather & Calendar manual triggers ────────────────────────────────────────
// POST /api/admin/weather-check  — run weather threshold check for all trees now
router.post("/weather-check", weatherMonitorController.triggerWeatherCheck);

// POST /api/admin/calendar-check — run Google Calendar scan for all trees now
router.post("/calendar-check", weatherMonitorController.triggerCalendarCheck);

module.exports = router;
