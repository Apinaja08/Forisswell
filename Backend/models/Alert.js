const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    treeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tree",
      required: [true, "Tree ID is required"],
    },
    alertType: {
      type: String,
      required: [true, "Alert type is required"],
      enum: [
        "high_temperature", // temperature exceeds threshold — watering needed
        "high_wind",        // wind speed exceeds threshold — branch risk
        "drought",          // rainfall below threshold — watering needed
        "storm",            // storm keyword detected — urgent care needed
        "calendar_event",   // upcoming care event from Google Calendar
      ],
    },
    alertSource: {
      type: String,
      enum: ["weather", "calendar"],
      default: "weather",
    },
    // Snapshot of weather data at the time the alert was created.
    // Stored so volunteers can see the triggering conditions without a live API call.
    weatherSnapshot: {
      temperature: Number,  // °C
      windSpeed: Number,    // km/h
      humidity: Number,     // %
      rainfall: Number,     // mm
      description: String,  // e.g. "thunderstorm with heavy rain"
    },
    // Populated when alertSource === "calendar"
    calendarEventId: {
      type: String,
      default: null,
    },
    // Which field/value/threshold triggered this alert
    thresholdBreached: {
      field: String,     // e.g. "temperature"
      value: Number,     // e.g. 38.2
      threshold: Number, // e.g. 35
    },
    status: {
      type: String,
      enum: ["searching", "accepted", "in_progress", "resolved", "cancelled"],
      default: "searching",
    },
    assignedVolunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Volunteer",
      default: null,
    },
    // Volunteers who received the socket "new_alert" broadcast.
    // Used to send "alert_accepted" dismissal to the right rooms.
    notifiedVolunteers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Volunteer",
      },
    ],
    // Tracks how many times the matching was retried (for the fallback broadcast logic)
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

alertSchema.index({ status: 1 });
alertSchema.index({ treeId: 1 });
alertSchema.index({ assignedVolunteer: 1 });
alertSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Alert", alertSchema);
