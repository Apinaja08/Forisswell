const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/auth");
const alertController = require("../controllers/alertController");

// ── System / Admin — Create alert ─────────────────────────────────────────────
router.post("/", protect, alertController.createAlert);

// ── Admin — Read all alerts ───────────────────────────────────────────────────
// Supports ?status=searching|accepted|in_progress|resolved|cancelled
//          ?alertSource=weather|calendar
//          ?treeId=<id>
router.get("/", protect, authorize("admin"), alertController.getAlerts);

// ── Any authenticated — Read single alert (includes weatherSnapshot) ──────────
router.get("/:id", protect, alertController.getAlertById);

// ── Volunteer lifecycle ───────────────────────────────────────────────────────
router.put("/:id/accept",  protect, authorize("volunteer"), alertController.acceptAlert);
router.put("/:id/start",   protect, authorize("volunteer"), alertController.startWork);
router.put("/:id/resolve", protect, authorize("volunteer"), alertController.resolveAlert);

module.exports = router;
