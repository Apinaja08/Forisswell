const VolunteerProfile = require("../models/VolunteerProfile");
// PWA Push Notifications disabled - user preference
// const pushNotificationService = require("../services/pushNotificationService");
const reverseGeocodingService = require("../services/reverseGeocodingService");

// Helper function to wrap async route handlers
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Helper function to create errors
const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * @desc    Create volunteer profile
 * @route   POST /api/volunteers/profile
 * @access  Private (Volunteer role)
 */
exports.createProfile = asyncHandler(async (req, res, next) => {
  const { phone, skills, location, preferredRadius, emergencyContact } = req.body;

  // Check if profile already exists
  const existingProfile = await VolunteerProfile.findOne({ user: req.user.id });
  if (existingProfile) {
    return next(createError(400, "Volunteer profile already exists"));
  }

  // Validate location
  if (!location || !location.coordinates || location.coordinates.length !== 2) {
    return next(createError(400, "Valid location coordinates are required"));
  }

  // Get address from coordinates using reverse geocoding
  let address = location.address || {};
  if (!address.formatted) {
    try {
      const [longitude, latitude] = location.coordinates;
      address = await reverseGeocodingService.reverseGeocode(latitude, longitude);
    } catch (error) {
      console.log("Reverse geocoding failed, continuing without address");
    }
  }

  // Create profile
  const profile = await VolunteerProfile.create({
    user: req.user.id,
    phone,
    skills: skills || [],
    location: {
      type: "Point",
      coordinates: location.coordinates,
      address,
    },
    preferredRadius: preferredRadius || 5,
    emergencyContact: emergencyContact || {},
    status: "available",
    isAvailable: true,
  });

  // Populate user details
  await profile.populate("user", "fullName email role");

  res.status(201).json({
    success: true,
    message: "Volunteer profile created successfully",
    data: { profile },
  });
});

/**
 * @desc    Get current volunteer's profile
 * @route   GET /api/volunteers/profile
 * @access  Private (Volunteer role)
 */
exports.getMyProfile = asyncHandler(async (req, res, next) => {
  const profile = await VolunteerProfile.findOne({ user: req.user.id }).populate(
    "user",
    "fullName email role createdAt"
  );

  if (!profile) {
    return next(createError(404, "Volunteer profile not found"));
  }

  res.json({
    success: true,
    message: "Profile fetched successfully",
    data: { profile },
  });
});

/**
 * @desc    Update volunteer profile
 * @route   PUT /api/volunteers/profile
 * @access  Private (Volunteer role)
 */
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const profile = await VolunteerProfile.findOne({ user: req.user.id });

  if (!profile) {
    return next(createError(404, "Volunteer profile not found"));
  }

  const { phone, skills, location, preferredRadius, emergencyContact } = req.body;

  // Update fields if provided
  if (phone) profile.phone = phone;
  if (skills) profile.skills = skills;
  if (preferredRadius) profile.preferredRadius = preferredRadius;
  if (emergencyContact) profile.emergencyContact = emergencyContact;

  // Update location if provided
  if (location && location.coordinates) {
    // Get address from coordinates
    let address = location.address || {};
    if (!address.formatted && location.coordinates.length === 2) {
      try {
        const [longitude, latitude] = location.coordinates;
        address = await reverseGeocodingService.reverseGeocode(latitude, longitude);
      } catch (error) {
        console.log("Reverse geocoding failed");
      }
    }

    profile.location = {
      type: "Point",
      coordinates: location.coordinates,
      address,
    };
  }

  await profile.save();
  await profile.populate("user", "fullName email role");

  res.json({
    success: true,
    message: "Profile updated successfully",
    data: { profile },
  });
});

/**
 * @desc    Update volunteer status (available/busy/offline)
 * @route   PATCH /api/volunteers/status
 * @access  Private (Volunteer role)
 */
exports.updateStatus = asyncHandler(async (req, res, next) => {
  const { status, isAvailable } = req.body;

  const profile = await VolunteerProfile.findOne({ user: req.user.id });

  if (!profile) {
    return next(createError(404, "Volunteer profile not found"));
  }

  if (status) {
    if (!["available", "busy", "offline"].includes(status)) {
      return next(createError(400, "Invalid status value"));
    }
    profile.status = status;
  }

  if (typeof isAvailable === "boolean") {
    profile.isAvailable = isAvailable;
  }

  await profile.save();

  // Broadcast status change via Socket.io
  if (global.io) {
    global.io.to("admin").emit("volunteer-status-changed", {
      volunteerId: profile._id,
      status: profile.status,
      isAvailable: profile.isAvailable,
    });
  }

  res.json({
    success: true,
    message: "Status updated successfully",
    data: {
      status: profile.status,
      isAvailable: profile.isAvailable,
    },
  });
});

/**
 * @desc    Update volunteer location
 * @route   PATCH /api/volunteers/location
 * @access  Private (Volunteer role)
 */
exports.updateLocation = asyncHandler(async (req, res, next) => {
  const { coordinates } = req.body;

  if (!coordinates || coordinates.length !== 2) {
    return next(createError(400, "Valid coordinates [longitude, latitude] required"));
  }

  const profile = await VolunteerProfile.findOne({ user: req.user.id });

  if (!profile) {
    return next(createError(404, "Volunteer profile not found"));
  }

  // Get address from coordinates
  let address = {};
  try {
    const [longitude, latitude] = coordinates;
    address = await reverseGeocodingService.reverseGeocode(latitude, longitude);
  } catch (error) {
    console.log("Reverse geocoding failed");
  }

  profile.location = {
    type: "Point",
    coordinates,
    address,
  };

  await profile.save();

  res.json({
    success: true,
    message: "Location updated successfully",
    data: { location: profile.location },
  });
});

/**
 * @desc    Get volunteer statistics
 * @route   GET /api/volunteers/stats
 * @access  Private (Volunteer role)
 */
exports.getMyStats = asyncHandler(async (req, res, next) => {
  const profile = await VolunteerProfile.findOne({ user: req.user.id });

  if (!profile) {
    return next(createError(404, "Volunteer profile not found"));
  }

  // Calculate additional stats
  const completionRate =
    profile.stats.acceptedAlerts > 0
      ? ((profile.stats.completedAlerts / profile.stats.acceptedAlerts) * 100).toFixed(1)
      : 0;

  const response = {
    totalAlerts: profile.stats.totalAlerts,
    acceptedAlerts: profile.stats.acceptedAlerts,
    completedAlerts: profile.stats.completedAlerts,
    cancelledAlerts: profile.stats.cancelledAlerts,
    totalHours: parseFloat(profile.stats.totalHours.toFixed(2)),
    averageCompletionTime: parseFloat(profile.stats.averageCompletionTime.toFixed(1)),
    completionRate: parseFloat(completionRate),
  };

  res.json({
    success: true,
    message: "Statistics fetched successfully",
    data: { stats: response },
  });
});

// PWA Push Notifications disabled - user preference
// /**
//  * @desc    Subscribe to push notifications
//  * @route   POST /api/volunteers/push-subscribe
//  * @access  Private (Volunteer role)
//  */
// exports.subscribeToPush = asyncHandler(async (req, res, next) => {
//   const { subscription } = req.body;
//
//   if (!subscription || !subscription.endpoint) {
//     return next(createError(400, "Valid push subscription required"));
//   }
//
//   const profile = await VolunteerProfile.findOne({ user: req.user.id });
//
//   if (!profile) {
//     return next(createError(404, "Volunteer profile not found"));
//   }
//
//   // Save subscription
//   profile.pushSubscription = {
//     endpoint: subscription.endpoint,
//     keys: {
//       p256dh: subscription.keys?.p256dh || "",
//       auth: subscription.keys?.auth || "",
//     },
//   };
//
//   await profile.save();
//
//   // Send test notification
//   try {
//     const testResult = await pushNotificationService.testPush(subscription);
//     if (testResult.success) {
//       return res.json({
//         success: true,
//         message: "Push notifications enabled. Test notification sent!",
//       });
//     }
//   } catch (error) {
//     console.log("Test push failed:", error);
//   }
//
//   res.json({
//     success: true,
//     message: "Push notifications enabled successfully",
//   });
// });
//
// /**
//  * @desc    Unsubscribe from push notifications
//  * @route   DELETE /api/volunteers/push-subscribe
//  * @access  Private (Volunteer role)
//  */
// exports.unsubscribePush = asyncHandler(async (req, res, next) => {
//   const profile = await VolunteerProfile.findOne({ user: req.user.id });
//
//   if (!profile) {
//     return next(createError(404, "Volunteer profile not found"));
//   }
//
//   profile.pushSubscription = undefined;
//   await profile.save();
//
//   res.json({
//     success: true,
//     message: "Push notifications disabled successfully",
//   });
// });
//
// /**
//  * @desc    Get VAPID public key (for frontend push subscription)
//  * @route   GET /api/volunteers/vapid-public-key
//  * @access  Public
//  */
// exports.getVapidPublicKey = asyncHandler(async (req, res) => {
//   const publicKey = process.env.VAPID_PUBLIC_KEY;
//
//   if (!publicKey) {
//     return res.status(503).json({
//       success: false,
//       message: "Push notifications not configured on server",
//     });
//   }
//
//   res.json({
//     success: true,
//     data: { publicKey },
//   });
// });
