const Alert = require("../models/Alert");
const VolunteerProfile = require("../models/VolunteerProfile");
const Tree = require("../models/Tree");
const alertService = require("../services/alertService");
// PWA Push Notifications disabled - user preference
// const pushNotificationService = require("../services/pushNotificationService");

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
 * @desc    Get nearby pending alerts for volunteer
 * @route   GET /api/alerts/nearby
 * @access  Private (Volunteer role)
 */
exports.getNearbyAlerts = asyncHandler(async (req, res, next) => {
  const profile = await VolunteerProfile.findOne({ user: req.user.id });

  if (!profile) {
    return next(createError(404, "Please complete your volunteer profile first"));
  }

  const radiusKm = profile.preferredRadius || 5;
  const alerts = await Alert.findNearbyPending(
    profile.location.coordinates,
    radiusKm
  );

  res.json({
    success: true,
    message: "Nearby alerts fetched successfully",
    count: alerts.length,
    data: { alerts, radius: radiusKm },
  });
});

/**
 * @desc    Get alerts assigned to current volunteer
 * @route   GET /api/alerts/my-alerts
 * @access  Private (Volunteer role)
 */
exports.getMyAlerts = asyncHandler(async (req, res, next) => {
  const profile = await VolunteerProfile.findOne({ user: req.user.id });

  if (!profile) {
    return next(createError(404, "Volunteer profile not found"));
  }

  const { status } = req.query;
  const filter = { assignedTo: profile._id, isActive: true };

  if (status) {
    filter.status = status;
  }

  const alerts = await Alert.find(filter)
    .populate("tree", "name species location imageUrl")
    .populate({
      path: "tree",
      populate: { path: "owner", select: "fullName email" },
    })
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    message: "Your alerts fetched successfully",
    count: alerts.length,
    data: { alerts },
  });
});

/**
 * @desc    Get current active alert for volunteer
 * @route   GET /api/alerts/my-active
 * @access  Private (Volunteer role)
 */
exports.getMyActiveAlert = asyncHandler(async (req, res, next) => {
  const profile = await VolunteerProfile.findOne({ user: req.user.id });

  if (!profile) {
    return next(createError(404, "Volunteer profile not found"));
  }

  const alert = await Alert.getVolunteerActiveAlert(profile._id);

  if (!alert) {
    return res.json({
      success: true,
      message: "No active alert",
      data: { alert: null },
    });
  }

  res.json({
    success: true,
    message: "Active alert fetched successfully",
    data: { alert },
  });
});

/**
 * @desc    Accept an alert (first-come-first-served)
 * @route   POST /api/alerts/:id/accept
 * @access  Private (Volunteer role)
 */
exports.acceptAlert = asyncHandler(async (req, res, next) => {
  const profile = await VolunteerProfile.findOne({ user: req.user.id });

  if (!profile) {
    return next(createError(404, "Please complete your volunteer profile first"));
  }

  // Check if volunteer can accept alerts
  if (!profile.canAcceptAlerts()) {
    return next(
      createError(400, "You cannot accept alerts. Check your status and availability.")
    );
  }

  // Check if volunteer already has an active alert
  const existingActive = await Alert.getVolunteerActiveAlert(profile._id);
  if (existingActive) {
    return next(
      createError(400, "You already have an active alert. Complete it first.")
    );
  }

  // Find and update alert atomically (first-come-first-served)
  const alert = await Alert.findOneAndUpdate(
    {
      _id: req.params.id,
      status: "pending",
      isActive: true,
    },
    {
      $set: {
        status: "assigned",
        assignedTo: profile._id,
        acceptedAt: new Date(),
      },
    },
    { new: true, runValidators: true }
  ).populate("tree", "name species location imageUrl");

  if (!alert) {
    return next(
      createError(404, "Alert not available. It may have been accepted by another volunteer.")
    );
  }

  // Update volunteer status to busy
  profile.status = "busy";
  profile.stats.acceptedAlerts += 1;
  profile.stats.totalAlerts += 1;
  await profile.save();

  // Notify other nearby volunteers that alert is taken
  const volunteers = await alertService.findNearbyVolunteers(
    alert.location.coordinates,
    process.env.VOLUNTEER_MATCH_RADIUS || 5
  );

  if (global.io) {
    volunteers.forEach((vol) => {
      if (vol._id.toString() !== profile._id.toString()) {
        global.io
          .to(`volunteer-${vol.user._id}`)
          .emit("alert-accepted", { alertId: alert._id });
      }
    });
  }

  // PWA Push Notifications disabled - user preference
  // Send confirmation push to accepting volunteer
  // const confirmationPayload = pushNotificationService.createAssignmentPayload(alert);
  // await pushNotificationService.sendPushToVolunteer(profile, confirmationPayload);

  res.json({
    success: true,
    message: "Alert accepted successfully",
    data: { alert },
  });
});

/**
 * @desc    Decline an alert (analytics only, doesn't affect assignment)
 * @route   POST /api/alerts/:id/decline
 * @access  Private (Volunteer role)
 */
exports.declineAlert = asyncHandler(async (req, res) => {
  // This is mainly for analytics - tracking why volunteers don't accept
  // The alert remains available for others

  res.json({
    success: true,
    message: "Alert declined. It remains available for other volunteers.",
  });
});

/**
 * @desc    Start working on an alert
 * @route   POST /api/alerts/:id/start
 * @access  Private (Volunteer role)
 */
exports.startWork = asyncHandler(async (req, res, next) => {
  const profile = await VolunteerProfile.findOne({ user: req.user.id });

  if (!profile) {
    return next(createError(404, "Volunteer profile not found"));
  }

  const alert = await Alert.findOne({
    _id: req.params.id,
    assignedTo: profile._id,
    status: "assigned",
    isActive: true,
  });

  if (!alert) {
    return next(
      createError(404, "Alert not found or you are not assigned to this alert")
    );
  }

  alert.status = "in_progress";
  alert.startedAt = new Date();
  await alert.save();

  // Broadcast status update
  if (global.io) {
    global.io.to(`alert-${alert._id}`).emit("alert-status-changed", {
      alertId: alert._id,
      status: "in_progress",
    });
  }

  res.json({
    success: true,
    message: "Work started. Good luck!",
    data: { alert },
  });
});

/**
 * @desc    Complete an alert
 * @route   POST /api/alerts/:id/complete
 * @access  Private (Volunteer role)
 */
exports.completeAlert = asyncHandler(async (req, res, next) => {
  const { notes, photoUrls } = req.body;

  if (!notes || notes.trim().length < 10) {
    return next(createError(400, "Please provide detailed notes (min 10 characters)"));
  }

  const profile = await VolunteerProfile.findOne({ user: req.user.id });

  if (!profile) {
    return next(createError(404, "Volunteer profile not found"));
  }

  const alert = await Alert.findOne({
    _id: req.params.id,
    assignedTo: profile._id,
    status: { $in: ["assigned", "in_progress"] },
    isActive: true,
  });

  if (!alert) {
    return next(createError(404, "Alert not found or not assigned to you"));
  }

  // Calculate completion time
  const completionTime = (Date.now() - alert.acceptedAt.getTime()) / 60000; // minutes

  // Update alert
  alert.status = "completed";
  alert.completedAt = new Date();
  alert.volunteerNotes = notes;
  if (photoUrls && photoUrls.length > 0) {
    alert.photoUrls = photoUrls;
  }
  await alert.save();

  // Update volunteer status and stats
  profile.status = "available";
  profile.updateStatsAfterCompletion(completionTime);
  await profile.save();

  // Calculate hours for response
  const hours = completionTime / 60;

  // PWA Push Notifications disabled - user preference
  // Send completion notification
  // const completionPayload = pushNotificationService.createCompletionPayload(
  //   alert,
  //   hours
  // );
  // await pushNotificationService.sendPushToVolunteer(profile, completionPayload);

  // Broadcast completion
  if (global.io) {
    global.io.to(`alert-${alert._id}`).emit("alert-completed", {
      alertId: alert._id,
      volunteerId: profile._id,
    });

    global.io.to("admin").emit("alert-completed", {
      alertId: alert._id,
      volunteerId: profile._id,
      completionTime,
    });
  }

  res.json({
    success: true,
    message: `Great work! You contributed ${hours.toFixed(1)} hours.`,
    data: {
      alert,
      contributionHours: parseFloat(hours.toFixed(2)),
    },
  });
});

/**
 * @desc    Cancel assigned alert (volunteer can't complete)
 * @route   POST /api/alerts/:id/cancel
 * @access  Private (Volunteer role)
 */
exports.cancelMyAlert = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  const profile = await VolunteerProfile.findOne({ user: req.user.id });

  if (!profile) {
    return next(createError(404, "Volunteer profile not found"));
  }

  const alert = await Alert.findOne({
    _id: req.params.id,
    assignedTo: profile._id,
    status: { $in: ["assigned", "in_progress"] },
    isActive: true,
  });

  if (!alert) {
    return next(createError(404, "Alert not found or not assigned to you"));
  }

  // Release alert back to pending
  alert.status = "pending";
  alert.assignedTo = null;
  alert.acceptedAt = null;
  alert.startedAt = null;
  alert.expiresAt = null;
  if (reason) {
    alert.volunteerNotes = `Cancelled by volunteer: ${reason}`;
  }
  await alert.save();

  // Update volunteer status
  profile.status = "available";
  profile.stats.cancelledAlerts += 1;
  await profile.save();

  // Notify nearby volunteers that alert is available again
  await alert.populate("tree", "name species location");
  const volunteers = await alertService.findNearbyVolunteers(
    alert.location.coordinates,
    process.env.VOLUNTEER_MATCH_RADIUS || 5
  );

  if (volunteers.length > 0) {
    await alertService.broadcastAlertToVolunteers(alert, volunteers);
  }

  res.json({
    success: true,
    message: "Alert cancelled and released back to available volunteers",
  });
});

/**
 * @desc    Get single alert by ID
 * @route   GET /api/alerts/:id
 * @access  Private
 */
exports.getAlertById = asyncHandler(async (req, res, next) => {
  const alert = await Alert.findOne({
    _id: req.params.id,
    isActive: true,
  })
    .populate("tree", "name species location imageUrl plantedDate status")
    .populate({
      path: "tree",
      populate: { path: "owner", select: "fullName email" },
    })
    .populate({
      path: "assignedTo",
      populate: { path: "user", select: "fullName email" },
    });

  if (!alert) {
    return next(createError(404, "Alert not found"));
  }

  res.json({
    success: true,
    message: "Alert fetched successfully",
    data: { alert },
  });
});

/**
 * @desc    Get all alerts for a specific tree
 * @route   GET /api/alerts/tree/:treeId
 * @access  Private
 */
exports.getTreeAlerts = asyncHandler(async (req, res, next) => {
  const tree = await Tree.findById(req.params.treeId);

  if (!tree) {
    return next(createError(404, "Tree not found"));
  }

  const alerts = await Alert.find({
    tree: req.params.treeId,
    isActive: true,
  })
    .populate({
      path: "assignedTo",
      populate: { path: "user", select: "fullName" },
    })
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    message: "Tree alerts fetched successfully",
    count: alerts.length,
    data: { alerts, tree: { id: tree._id, name: tree.name, species: tree.species } },
  });
});

/**
 * @desc    Get all alerts with filters (Admin only)
 * @route   GET /api/alerts
 * @access  Private (Admin role)
 */
exports.getAllAlerts = asyncHandler(async (req, res) => {
  const { status, priority, type, dateFrom, dateTo, volunteerId, treeId, page = 1, limit = 20 } = req.query;

  const filter = { isActive: true };

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (type) filter.type = type;
  if (volunteerId) filter.assignedTo = volunteerId;
  if (treeId) filter.tree = treeId;

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [alerts, total] = await Promise.all([
    Alert.find(filter)
      .populate("tree", "name species location")
      .populate({
        path: "assignedTo",
        populate: { path: "user", select: "fullName email" },
      })
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Alert.countDocuments(filter),
  ]);

  res.json({
    success: true,
    message: "Alerts fetched successfully",
    count: alerts.length,
    total,
    data: { alerts },
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
      total,
    },
  });
});

/**
 * @desc    Get alert statistics (Admin only)
 * @route   GET /api/alerts/statistics
 * @access  Private (Admin role)
 */
exports.getAlertStatistics = asyncHandler(async (req, res) => {
  const stats = await Alert.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },
        assigned: {
          $sum: { $cond: [{ $eq: ["$status", "assigned"] }, 1, 0] },
        },
        inProgress: {
          $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
        },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
        },
        critical: {
          $sum: { $cond: [{ $eq: ["$priority", "critical"] }, 1, 0] },
        },
        high: {
          $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] },
        },
      },
    },
  ]);

  // Calculate average response time for completed alerts
  const responseTimeStats = await Alert.aggregate([
    {
      $match: {
        status: "completed",
        acceptedAt: { $exists: true },
        completedAt: { $exists: true },
      },
    },
    {
      $project: {
        responseTimeMinutes: {
          $divide: [
            { $subtract: ["$completedAt", "$acceptedAt"] },
            60000,
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        averageResponseTime: { $avg: "$responseTimeMinutes" },
      },
    },
  ]);

  const result = {
    overview: stats[0] || {},
    averageResponseTimeMinutes: responseTimeStats[0]?.averageResponseTime || 0,
  };

  res.json({
    success: true,
    message: "Statistics fetched successfully",
    data: result,
  });
});

/**
 * @desc    Get volunteer leaderboard (Admin only)
 * @route   GET /api/alerts/leaderboard
 * @access  Private (Admin role)
 */
exports.getVolunteerLeaderboard = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const volunteers = await VolunteerProfile.find({ isActive: true })
    .populate("user", "fullName email")
    .sort({ "stats.completedAlerts": -1, "stats.totalHours": -1 })
    .limit(limit);

  const leaderboard = volunteers.map((v, index) => ({
    rank: index + 1,
    volunteerId: v._id,
    name: v.user?.fullName || "Unknown",
    email: v.user?.email,
    completedAlerts: v.stats.completedAlerts,
    totalHours: parseFloat(v.stats.totalHours.toFixed(2)),
    completionRate:
      v.stats.acceptedAlerts > 0
        ? parseFloat(
            ((v.stats.completedAlerts / v.stats.acceptedAlerts) * 100).toFixed(1)
          )
        : 0,
    averageCompletionTime: parseFloat(v.stats.averageCompletionTime.toFixed(1)),
  }));

  res.json({
    success: true,
    message: "Leaderboard fetched successfully",
    data: { leaderboard },
  });
});

/**
 * @desc    Get alerts by region (geospatial aggregation for map)
 * @route   GET /api/alerts/map
 * @access  Private (Admin role)
 */
exports.getAlertsByRegion = asyncHandler(async (req, res) => {
  const { status, priority } = req.query;

  const matchQuery = { isActive: true };
  if (status) matchQuery.status = status;
  if (priority) matchQuery.priority = priority;

  const alerts = await Alert.find(matchQuery)
    .select("location type priority status createdAt tree")
    .populate("tree", "name species")
    .lean();

  // Format for map markers
  const markers = alerts.map((alert) => ({
    id: alert._id,
    coordinates: alert.location.coordinates,
    type: alert.type,
    priority: alert.priority,
    status: alert.status,
    treeName: alert.tree?.name || alert.tree?.species,
    createdAt: alert.createdAt,
  }));

  res.json({
    success: true,
    message: "Map data fetched successfully",
    count: markers.length,
    data: { markers },
  });
});

/**
 * @desc    Seed database with test data (Development only)
 * @route   POST /api/alerts/seed
 * @access  Private (Admin role)
 */
exports.seedTestData = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Seeding is only allowed in development mode");
  }

  const User = require("../models/User");
  const VolunteerProfile = require("../models/VolunteerProfile");
  const Tree = require("../models/Tree");

  try {
    // Clear existing data
    console.log("Clearing existing test data...");
    await User.deleteMany({});
    await VolunteerProfile.deleteMany({});
    await Tree.deleteMany({});
    await Alert.deleteMany({});

    // Create admin user
    const adminUser = await User.create({
      fullName: "System Admin",
      email: "admin@forisswell.com",
      password: "admin123",
      role: "admin",
      isActive: true,
    });

    // Create volunteer users
    const volunteersData = [
      { name: "Priya Sharma", email: "priya.sharma@forisswell.com", phone: "+919876543001" },
      { name: "Raj Kumar", email: "raj.kumar@forisswell.com", phone: "+919876543002" },
      { name: "Anaya Gupta", email: "anaya.gupta@forisswell.com", phone: "+919876543003" },
      { name: "Arjun Singh", email: "arjun.singh@forisswell.com", phone: "+919876543004" },
      { name: "Meera Patel", email: "meera.patel@forisswell.com", phone: "+919876543005" },
    ];

    const volunteerUsers = [];
    for (const volData of volunteersData) {
      const user = await User.create({
        fullName: volData.name,
        email: volData.email,
        password: "volunteer123",
        role: "volunteer",
        isActive: true,
      });
      volunteerUsers.push(user);
    }

    // Create volunteer profiles
    const locations = [
      { coords: [77.2, 28.5], city: "New Delhi", district: "Central Delhi" },
      { coords: [77.3, 28.6], city: "New Delhi", district: "East Delhi" },
      { coords: [77.1, 28.4], city: "New Delhi", district: "West Delhi" },
      { coords: [77.0, 28.6], city: "New Delhi", district: "North Delhi" },
      { coords: [77.3, 28.4], city: "New Delhi", district: "South Delhi" },
    ];

    const volunteers = [];
    for (let i = 0; i < volunteerUsers.length; i++) {
      const volunteer = await VolunteerProfile.create({
        user: volunteerUsers[i]._id,
        phone: volunteersData[i].phone,
        skills: ["watering", "pruning", "mulching"],
        location: {
          type: "Point",
          coordinates: locations[i].coords,
          address: {
            formatted: `${locations[i].district}, ${locations[i].city}`,
            city: locations[i].city,
            district: locations[i].district,
            country: "India",
          },
        },
        preferredRadius: 5,
        emergencyContact: {
          name: `Contact for ${volunteersData[i].name}`,
          phone: `+919876543${1000 + i}`,
          relationship: "Family",
        },
        status: "available",
        isAvailable: true,
        stats: {
          totalAlerts: Math.floor(Math.random() * 20) + 5,
          completedAlerts: Math.floor(Math.random() * 15) + 2,
          acceptedAlerts: Math.floor(Math.random() * 18) + 3,
          cancelledAlerts: Math.floor(Math.random() * 3),
          totalHours: parseFloat((Math.random() * 100 + 20).toFixed(2)),
          averageCompletionTime: parseFloat((Math.random() * 60 + 30).toFixed(1)),
        },
        isActive: true,
      });
      volunteers.push(volunteer);
    }

    // Create trees
    const treeSpecies = ["Neem", "Mango", "Peepal", "Oak", "Cedar", "Pine", "Banyan", "Ashoka", "Eucalyptus"];
    const trees = [];

    for (let i = 0; i < 15; i++) {
      const tree = await Tree.create({
        name: `Tree ${i + 1}`,
        species: treeSpecies[i % treeSpecies.length],
        plantedDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        status: ["PLANTED", "GROWING", "MATURE"][Math.floor(Math.random() * 3)],
        location: {
          type: "Point",
          coordinates: [77.0 + Math.random() * 0.5, 28.4 + Math.random() * 0.4],
          address: {
            formatted: "New Delhi, India",
            city: "New Delhi",
            district: "Central Delhi",
            country: "India",
          },
        },
        owner: adminUser._id,
        notes: `Sample tree for testing - Species: ${treeSpecies[i % treeSpecies.length]}`,
        isActive: true,
      });
      trees.push(tree);
    }

    // Create alerts
    const alertTypes = ["high_temperature", "heavy_rain", "strong_wind", "multiple_threats"];
    const priorities = ["critical", "high", "medium", "low"];
    const statuses = ["pending", "assigned", "in_progress", "completed", "cancelled"];

    for (let i = 0; i < 25; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const isAssigned = status !== "pending" && Math.random() > 0.3;
      const volunteer = isAssigned ? volunteers[Math.floor(Math.random() * volunteers.length)] : null;

      const completedAt = status === "completed" ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null;
      const acceptedAt = (status === "assigned" || status === "in_progress" || status === "completed") ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000) : null;
      const startedAt = (status === "in_progress" || status === "completed") ? new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000) : null;

      const alert = await Alert.create({
        tree: trees[Math.floor(Math.random() * trees.length)]._id,
        type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        status: status,
        description: `Alert for tree maintenance - Issue detected requiring immediate attention. Area needs inspection and care.`,
        weatherData: {
          temperature: 35 + Math.random() * 10,
          humidity: 40 + Math.random() * 40,
          rainfall: Math.random() * 100,
          windSpeed: 5 + Math.random() * 20,
          conditions: ["Sunny", "Cloudy", "Rainy"][Math.floor(Math.random() * 3)],
        },
        thresholdViolations: [
          {
            type: "high_temperature",
            threshold: "35°C",
            actualValue: 38 + Math.random() * 5,
            excessAmount: 3 + Math.random() * 5,
          },
        ],
        location: {
          type: "Point",
          coordinates: [77.0 + Math.random() * 0.5, 28.4 + Math.random() * 0.4],
          address: {
            formatted: "New Delhi, India",
            city: "New Delhi",
            district: "Central Delhi",
            country: "India",
          },
        },
        assignedTo: volunteer ? volunteer._id : null,
        actionRequired: ["water_tree", "provide_shade", "inspect_damage"],
        acceptedAt: acceptedAt,
        startedAt: startedAt,
        completedAt: completedAt,
        expiresAt: status === "assigned" ? new Date(Date.now() + 30 * 60 * 1000) : null,
        volunteerNotes: status === "completed" ? "Task completed successfully. Tree watered and cleaned. All actions completed." : "",
        photoUrls: [],
        isActive: true,
      });
    }

    res.json({
      success: true,
      message: "Test data seeded successfully!",
      data: {
        users: volunteerUsers.length + 1,
        volunteers: volunteers.length,
        trees: trees.length,
        alerts: 25,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    res.status(500).json({
      success: false,
      message: "Error seeding database: " + error.message,
    });
  }
});
