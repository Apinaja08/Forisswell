const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");

/**
 * Initialize Socket.io with authentication
 * @param {http.Server} server - HTTP server instance
 * @returns {Server} Socket.io server instance
 */
function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      // Verify JWT token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key-change-this-in-production"
      );

      // Get user from database
      const user = await User.findById(decoded.id).select("-password");

      if (!user || !user.isActive) {
        return next(new Error("User not found or inactive"));
      }

      // Attach user to socket
      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.userEmail = user.email;

      next();
    } catch (error) {
      logger.error("Socket authentication error:", error);
      next(new Error("Invalid authentication token"));
    }
  });

  // Connection handler
  io.on("connection", (socket) => {
    logger.info(
      `Socket connected: ${socket.id} | User: ${socket.userId} (${socket.userRole})`
    );

    // Auto-join user to their personal room
    socket.join(`volunteer-${socket.userId}`);

    // If user is admin, join admin room
    if (socket.userRole === "admin") {
      socket.join("admin");
    }

    // Handle volunteer status updates
    socket.on("update-status", (data) => {
      logger.debug(`Status update from ${socket.userId}:`, data);
      // Broadcast to admins if needed
      socket.to("admin").emit("volunteer-status-changed", {
        volunteerId: socket.userId,
        status: data.status,
      });
    });

    // Handle location updates (for real-time tracking)
    socket.on("update-location", (data) => {
      logger.debug(`Location update from ${socket.userId}`);
      // Could be used for real-time volunteer tracking on admin dashboard
      socket.to("admin").emit("volunteer-location-updated", {
        volunteerId: socket.userId,
        location: data.location,
      });
    });

    // Handle alert room joining (for real-time updates on specific alert)
    socket.on("join-alert", (alertId) => {
      socket.join(`alert-${alertId}`);
      logger.debug(`User ${socket.userId} joined alert room: ${alertId}`);
    });

    socket.on("leave-alert", (alertId) => {
      socket.leave(`alert-${alertId}`);
      logger.debug(`User ${socket.userId} left alert room: ${alertId}`);
    });

    // Ping-pong for connection health
    socket.on("ping", () => {
      socket.emit("pong");
    });

    // Disconnection handler
    socket.on("disconnect", (reason) => {
      logger.info(
        `Socket disconnected: ${socket.id} | User: ${socket.userId} | Reason: ${reason}`
      );
    });

    // Error handler
    socket.on("error", (error) => {
      logger.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  // Store io instance globally for use in services
  global.io = io;

  logger.info("Socket.io initialized successfully");
  return io;
}

module.exports = { initializeSocket };
