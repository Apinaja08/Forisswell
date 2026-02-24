//server.js
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });

const http = require("http");
const { Server: SocketServer } = require("socket.io");
const cron = require("node-cron");
const jwt = require("jsonwebtoken");

const connectDB = require("./config/db");
const app = require("./app");
const weatherThresholdService = require("./services/weatherThresholdService");
const alertService = require("./services/alertService");

const preferredPort = Number.parseInt(process.env.PORT || "5000", 10);
const jwtSecret = process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

// Wrap express app in a raw HTTP server so Socket.io can share the same port
const httpServer = http.createServer(app);

// ─── Socket.io Setup ─────────────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  },
});

// Expose io globally so services can emit events (consistent with riskAnalysisService pattern)
global.io = io;

// Authenticate socket connections using the same JWT as HTTP requests
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    const decoded = jwt.verify(token, jwtSecret);
    socket.userId = decoded.id;
    socket.userType = decoded.userType || "user";
    socket.userRole = decoded.role;
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", async (socket) => {
  if (socket.userType === "volunteer") {
    // Each volunteer joins their private room for targeted alerts
    socket.join(`volunteer:${socket.userId}`);
  } else {
    // Admins and regular users join the admin broadcast room
    socket.join("admins");
  }

  socket.on("disconnect", () => {
    // Rooms are automatically cleaned up by Socket.io on disconnect
  });
});

// ─── Cron Schedules ───────────────────────────────────────────────────────────

// Weather threshold check — every 15 minutes (configurable via WEATHER_POLL_INTERVAL)
const weatherPollInterval = process.env.WEATHER_POLL_INTERVAL || "*/15 * * * *";
cron.schedule(weatherPollInterval, () => {
  weatherThresholdService.runScheduledCheck().catch((err) => {
    console.error("[cron] Weather check error:", err.message);
  });
});

// Alert retry broadcast — every 2 minutes for "searching" alerts with no takers
cron.schedule("*/2 * * * *", () => {
  alertService.runRetryChecks().catch((err) => {
    console.error("[cron] Alert retry error:", err.message);
  });
});

// ─── Server Start ─────────────────────────────────────────────────────────────

const listen = (port) =>
  new Promise((resolve, reject) => {
    httpServer.listen(port);
    httpServer.once("listening", () => resolve(httpServer));
    httpServer.once("error", (err) => reject(err));
  });

const start = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set");
  }

  await connectDB();

  let server;
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const port = preferredPort + attempt;
    try {
      server = await listen(port);
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
  console.log(`Server running on port ${port}`);
  console.log(`Socket.io ready on port ${port}`);
};

start().catch((err) => {
  console.error("Startup error:", err.message);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err.message);
  process.exit(1);
});
