const express = require("express");
const router = express.Router();
const alertController = require("../controllers/alertController");
const { protect, authorize } = require("../middleware/auth");

// All routes require authentication
router.use(protect);

// Volunteer-specific routes
router.get("/nearby", authorize("volunteer", "admin"), alertController.getNearbyAlerts);
router.get("/my-alerts", authorize("volunteer", "admin"), alertController.getMyAlerts);
router.get("/my-active", authorize("volunteer", "admin"), alertController.getMyActiveAlert);

// Alert actions (Volunteer only)
router.post("/:id/accept", authorize("volunteer", "admin"), alertController.acceptAlert);
router.post("/:id/decline", authorize("volunteer", "admin"), alertController.declineAlert);
router.post("/:id/start", authorize("volunteer", "admin"), alertController.startWork);
router.post("/:id/complete", authorize("volunteer", "admin"), alertController.completeAlert);
router.post("/:id/cancel", authorize("volunteer", "admin"), alertController.cancelMyAlert);

// Admin monitoring routes
router.get("/statistics", authorize("admin"), alertController.getAlertStatistics);
router.get("/leaderboard", authorize("admin"), alertController.getVolunteerLeaderboard);
router.get("/map", authorize("admin"), alertController.getAlertsByRegion);

// View routes (all authenticated users)
router.get("/tree/:treeId", alertController.getTreeAlerts);
router.get("/:id", alertController.getAlertById);

// Admin list view (must be after specific routes)
router.get("/", authorize("admin"), alertController.getAllAlerts);

module.exports = router;
