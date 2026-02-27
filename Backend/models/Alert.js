const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    tree: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tree",
      required: [true, "Tree reference is required"],
    },
    type: {
      type: String,
      enum: [
        "high_temperature",
        "heavy_rain",
        "strong_wind",
        "multiple_threats",
      ],
      required: [true, "Alert type is required"],
    },
    priority: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "assigned", "in_progress", "completed", "cancelled", "expired"],
      default: "pending",
    },
    description: {
      type: String,
      required: [true, "Alert description is required"],
    },
    weatherData: {
      temperature: Number,
      humidity: Number,
      rainfall: Number,
      windSpeed: Number,
      conditions: String,
    },
    thresholdViolations: [
      {
        type: {
          type: String,
          enum: ["high_temperature", "heavy_rain", "strong_wind"],
        },
        threshold: String,
        actualValue: Number,
        excessAmount: Number,
      },
    ],
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
      address: {
        formatted: String,
        city: String,
        district: String,
        country: String,
      },
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VolunteerProfile",
      default: null,
    },
    actionRequired: {
      type: [String],
      default: [],
      enum: [
        "water_tree",
        "provide_shade",
        "remove_standing_water",
        "secure_branches",
        "check_stability",
        "mulch_base",
        "inspect_damage",
        "other",
      ],
    },
    acceptedAt: Date,
    startedAt: Date,
    completedAt: Date,
    expiresAt: {
      type: Date,
      index: true,
      comment: "Alert expires if not started within 30 minutes of acceptance",
    },
    volunteerNotes: {
      type: String,
      maxlength: 1000,
    },
    photoUrls: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
alertSchema.index({ tree: 1, status: 1 });
alertSchema.index({ assignedTo: 1, status: 1 });
alertSchema.index({ status: 1, priority: -1, createdAt: -1 });
alertSchema.index({ location: "2dsphere" });
alertSchema.index({ expiresAt: 1 });

// Method to check if alert has expired
alertSchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return Date.now() > this.expiresAt.getTime();
};

// Method to check if alert can be accepted
alertSchema.methods.canBeAccepted = function () {
  return (
    this.status === "pending" &&
    this.isActive &&
    !this.isExpired()
  );
};

// Method to auto-expire and release back to pending
alertSchema.methods.autoExpire = async function () {
  if (
    this.status === "assigned" &&
    this.isExpired() &&
    !this.startedAt
  ) {
    this.status = "pending";
    this.assignedTo = null;
    this.acceptedAt = null;
    this.expiresAt = null;
    await this.save();
    return true;
  }
  return false;
};

// Static method to find nearby pending alerts
alertSchema.statics.findNearbyPending = function (coordinates, radiusKm) {
  return this.find({
    status: "pending",
    isActive: true,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: coordinates,
        },
        $maxDistance: radiusKm * 1000, // Convert km to meters
      },
    },
  })
    .populate("tree", "name species location")
    .sort({ priority: -1, createdAt: 1 });
};

// Static method to get volunteer's active alert
alertSchema.statics.getVolunteerActiveAlert = function (volunteerId) {
  return this.findOne({
    assignedTo: volunteerId,
    status: { $in: ["assigned", "in_progress"] },
    isActive: true,
  })
    .populate("tree", "name species location imageUrl")
    .populate({
      path: "tree",
      populate: {
        path: "owner",
        select: "fullName email",
      },
    });
};

// Pre-save middleware to set expiry time when assigned
alertSchema.pre("save", async function () {
  if (
    this.isModified("status") &&
    this.status === "assigned" &&
    !this.expiresAt
  ) {
    const timeoutMinutes = process.env.ALERT_ACCEPT_TIMEOUT || 30;
    this.expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);
  }
});

module.exports = mongoose.model("Alert", alertSchema);
