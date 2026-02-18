const mongoose = require("mongoose");

const treeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: [100, "Tree name cannot exceed 100 characters"],
    },
    species: {
      type: String,
      required: [true, "Please provide tree species"],
      trim: true,
      minlength: [2, "Species name must be at least 2 characters"],
    },
    plantedDate: {
      type: Date,
      required: [true, "Please provide planted date"],
      validate: {
        validator: function (value) {
          return value <= Date.now();
        },
        message: "Planted date cannot be in the future",
      },
    },
    status: {
      type: String,
      enum: ["PLANTED", "GROWING", "MATURE", "DEAD"],
      default: "PLANTED",
    },
    imageUrl: String,
    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function (val) {
            return (
              Array.isArray(val) &&
              val.length === 2 &&
              val[0] >= -180 &&
              val[0] <= 180 &&
              val[1] >= -90 &&
              val[1] <= 90
            );
          },
          message: "Coordinates must be valid [longitude, latitude]",
        },
      },
      address: {
        formatted: String,
        city: String,
        district: String,
        country: String,
      },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

treeSchema.index({ location: "2dsphere" });
treeSchema.index({ owner: 1 });
treeSchema.index({ species: 1 });

module.exports = mongoose.model("Tree", treeSchema);
