const mongoose = require("mongoose");

const connectDB = async () => {
  mongoose.set("bufferCommands", false);

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is not set");
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      family: 4,
    });

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB runtime error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.error("MongoDB disconnected");
    });

    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
