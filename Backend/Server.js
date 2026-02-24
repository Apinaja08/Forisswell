//server.js
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });

const connectDB = require("./config/db");
const app = require("./app");

const preferredPort = Number.parseInt(process.env.PORT || "5000", 10);

const listen = (port) =>
  new Promise((resolve, reject) => {
    const server = app.listen(port);
    server.once("listening", () => resolve(server));
    server.once("error", (err) => reject(err));
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

module.exports = app;
