//server.js
const path = require("path");
const dotenv = require("dotenv");
const http = require("http");

dotenv.config({ path: path.join(__dirname, ".env") });

const connectDB = require("./config/db");
const app = require("./app");
const { initializeSocket } = require("./config/socket");
const alertService = require("./services/alertService");
// PWA Push Notifications disabled - user preference
// const pushNotificationService = require("./services/pushNotificationService");

const preferredPort = Number.parseInt(process.env.PORT || "5000", 10);

const listen = (port, server) =>
  new Promise((resolve, reject) => {
    server.listen(port);
    server.once("listening", () => resolve(server));
    server.once("error", (err) => reject(err));
  });

const start = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set");
  }

  // Connect to database
  await connectDB();
  console.log("✅ Database connected");

  // Create HTTP server
  const httpServer = http.createServer(app);

  // Initialize Socket.io
  initializeSocket(httpServer);
  console.log("✅ Socket.io initialized");

  // PWA Push Notifications disabled - user preference
  // Initialize push notification service
  // pushNotificationService.initialize();

  let server;
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const port = preferredPort + attempt;
    try {
      server = await listen(port, httpServer);
      break;
    } catch (err) {
      if (err && err.code === "EADDRINUSE" && attempt < maxAttempts - 1) {
        continue;
      }
      throw err;
    }
  }

  const address = server.address();
  const port = address && typeof address === "object" ? address.port : preferredPort;
  console.log(`✅ Server running on port ${port}`);

  // Start automated weather monitoring after server is up
  alertService.startWeatherMonitoring();
  console.log("✅ Weather monitoring started");

  // Graceful shutdown handlers
  const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    // Stop alert monitoring
    alertService.stopWeatherMonitoring();
    console.log("✅ Weather monitoring stopped");

    // Close server
    server.close(() => {
      console.log("✅ HTTP server closed");
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error("❌ Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
};

start().catch((err) => {
  console.error("❌ Startup error:", err.message);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err.message);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  process.exit(1);
});

module.exports = app;

