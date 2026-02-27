const mongoose = require("mongoose");

const volunteerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      unique: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^\+?[\d\s-()]+$/, "Please provide a valid phone number"],
    },
    skills: {
      type: [String],
      default: [],
      enum: [
        "watering",
        "pruning",
        "mulching",
        "pest_control",
        "first_aid",
        "heavy_lifting",
        "carpentry",
        "photography",
        "documentation",
        "other",
      ],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: [true, "Location coordinates are required"],
        validate: {
          validator: function (coords) {
            return (
              coords.length === 2 &&
              coords[0] >= -180 &&
              coords[0] <= 180 &&
              coords[1] >= -90 &&
              coords[1] <= 90
            );
          },
          message:
            "Coordinates must be [longitude, latitude] with valid ranges",
        },
      },
      address: {
        formatted: String,
        city: String,
        district: String,
        country: String,
      },
    },
    preferredRadius: {
      type: Number,
      default: 5,
      min: 1,
      max: 50,
      comment: "Preferred alert radius in kilometers",
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
    status: {
      type: String,
      enum: ["available", "busy", "offline"],
      default: "available",
    },
    isAvailable: {
      type: Boolean,
      default: true,
      comment: "Whether the volunteer is currently accepting alerts",
    },
    stats: {
      totalAlerts: {
        type: Number,
        default: 0,
      },
      completedAlerts: {
        type: Number,
        default: 0,
      },
      acceptedAlerts: {
        type: Number,
        default: 0,
      },
      cancelledAlerts: {
        type: Number,
        default: 0,
      },
      totalHours: {
        type: Number,
        default: 0,
        comment: "Total volunteer hours contributed",
      },
      averageCompletionTime: {
        type: Number,
        default: 0,
        comment: "Average time to complete alerts in minutes",
      },
    },
    // PWA Push Notifications disabled - user preference
    // pushSubscription: {
    //   endpoint: String,
    //   keys: {
    //     p256dh: String,
    //     auth: String,
    //   },
    // },
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
volunteerProfileSchema.index({ location: "2dsphere" });
volunteerProfileSchema.index({ user: 1 });
volunteerProfileSchema.index({ status: 1, isAvailable: 1 });

// Virtual to populate user details
volunteerProfileSchema.virtual("userDetails", {
  ref: "User",
  localField: "user",
  foreignField: "_id",
  justOne: true,
});

// Method to check if volunteer can accept new alerts
volunteerProfileSchema.methods.canAcceptAlerts = function () {
  return this.isActive && this.isAvailable && this.status === "available";
};

// Method to update statistics after alert completion
volunteerProfileSchema.methods.updateStatsAfterCompletion = function (
  completionTimeMinutes
) {
  this.stats.completedAlerts += 1;
  
  // Calculate new average completion time
  const totalCompletedBefore = this.stats.completedAlerts - 1;
  if (totalCompletedBefore === 0) {
    this.stats.averageCompletionTime = completionTimeMinutes;
  } else {
    this.stats.averageCompletionTime =
      (this.stats.averageCompletionTime * totalCompletedBefore +
        completionTimeMinutes) /
      this.stats.completedAlerts;
  }
  
  // Add to total hours (convert minutes to hours)
  this.stats.totalHours += completionTimeMinutes / 60;
};

module.exports = mongoose.model("VolunteerProfile", volunteerProfileSchema);
