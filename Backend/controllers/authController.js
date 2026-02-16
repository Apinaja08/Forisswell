const jwt = require("jsonwebtoken");
const User = require("../models/User");

const asyncHandler =
  (fn) =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const jwtSecret =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

const generateToken = (userId) =>
  jwt.sign({ id: userId }, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const sendTokenResponse = (user, statusCode, res, message) => {
  const token = generateToken(user._id);
  const userObj = user.toObject ? user.toObject() : user;
  delete userObj.password;

  res.status(statusCode).json({
    success: true,
    message,
    token,
    data: { user: userObj },
  });
};

// @route   POST /api/auth/register (PUBLIC)
exports.register = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    throw createError(400, "Please provide all required fields");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw createError(400, "User with this email already exists");
  }

  const user = await User.create({ fullName, email, password });
  sendTokenResponse(user, 201, res, "Registered successfully");
});

// @route   POST /api/auth/login (PUBLIC)
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw createError(400, "Please provide email and password");
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw createError(401, "Invalid credentials");
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw createError(401, "Invalid credentials");
  }

  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res, "Logged in successfully");
});

// @route   POST /api/auth/logout (PROTECTED)
exports.logout = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

// @route   GET /api/auth/me (PROTECTED)
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.status(200).json({ success: true, data: { user } });
});

// @route   PUT /api/auth/update-password (PROTECTED)
exports.updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw createError(400, "Please provide currentPassword and newPassword");
  }

  const user = await User.findById(req.user.id).select("+password");
  if (!user) {
    throw createError(401, "User not found");
  }

  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw createError(401, "Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  sendTokenResponse(user, 200, res, "Password updated successfully");
});

// @route   GET /api/auth/verify-email/:token (PUBLIC - stub)
exports.verifyEmail = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Email verification endpoint (not implemented)",
  });
});

// @route   POST /api/auth/forgot-password (PUBLIC - stub)
exports.forgotPassword = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Password reset email sent (mock)",
  });
});

// @route   PUT /api/auth/reset-password/:token (PUBLIC - stub)
exports.resetPassword = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Password reset successful (mock)",
  });
});
