const express = require("express");
const router = express.Router();
const volunteerController = require("../controllers/volunteerController");
const { protect, authorize } = require("../middleware/auth");

// PWA Push Notifications disabled - user preference
// Public route
// router.get("/vapid-public-key", volunteerController.getVapidPublicKey);

// Protected routes - Volunteer role required
router.use(protect);
router.use(authorize("volunteer", "admin"));

// Profile management
router
  .route("/profile")
  .post(volunteerController.createProfile)
  .get(volunteerController.getMyProfile)
  .put(volunteerController.updateProfile);

// Status and location updates
router.patch("/status", volunteerController.updateStatus);
router.patch("/location", volunteerController.updateLocation);

// Statistics
router.get("/stats", volunteerController.getMyStats);

// PWA Push Notifications disabled - user preference
// Push notifications
// router.post("/push-subscribe", volunteerController.subscribeToPush);
// router.delete("/push-subscribe", volunteerController.unsubscribePush);

module.exports = router;
