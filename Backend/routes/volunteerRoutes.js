const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/auth");
const volunteerController = require("../controllers/volunteerController");
const alertController = require("../controllers/alertController");

// ── Public ────────────────────────────────────────────────────────────────────
router.post("/register", volunteerController.register);
router.post("/login", volunteerController.login);

// ── Authenticated volunteer ───────────────────────────────────────────────────
router.get("/me", protect, volunteerController.getMe);
router.put("/me", protect, volunteerController.updateMe);
router.delete("/me", protect, volunteerController.deleteMe);

// Volunteer's own alert history
router.get("/me/alerts", protect, authorize("volunteer"), alertController.getMyAlerts);

module.exports = router;
