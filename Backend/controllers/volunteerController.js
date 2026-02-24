/**
 * volunteerController.js
 *
 * HTTP layer for volunteer registration, authentication, and profile management.
 * Business logic is delegated to volunteerService.
 *
 * JWT payload includes { id, userType: "volunteer" } so that middleware/auth.js
 * can route token verification to the Volunteer collection instead of User.
 */

const jwt = require("jsonwebtoken");
const volunteerService = require("../services/volunteerService");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const jwtSecret =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

const generateToken = (volunteerId) =>
  jwt.sign({ id: volunteerId, userType: "volunteer" }, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const sendTokenResponse = (volunteer, statusCode, res, message) => {
  const token = generateToken(volunteer._id);
  const volunteerObj = volunteer.toObject ? volunteer.toObject() : { ...volunteer };
  delete volunteerObj.password;
  res.status(statusCode).json({
    success: true,
    message,
    token,
    data: { volunteer: volunteerObj },
  });
};

// ─── POST /api/volunteers/register ───────────────────────────────────────────
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, location } = req.body;

  if (!name || !email || !password) {
    const err = new Error("Please provide name, email, and password");
    err.statusCode = 400;
    throw err;
  }
  if (!location || !location.coordinates) {
    const err = new Error("Please provide location coordinates [longitude, latitude]");
    err.statusCode = 400;
    throw err;
  }

  const volunteer = await volunteerService.registerVolunteer({
    name,
    email,
    password,
    phone,
    location,
  });

  sendTokenResponse(volunteer, 201, res, "Volunteer registered successfully");
});

// ─── POST /api/volunteers/login ───────────────────────────────────────────────
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const volunteer = await volunteerService.loginVolunteer(email, password);
  sendTokenResponse(volunteer, 200, res, "Logged in successfully");
});

// ─── GET /api/volunteers/me ───────────────────────────────────────────────────
exports.getMe = asyncHandler(async (req, res) => {
  const volunteer = await volunteerService.getVolunteerById(req.user.id);
  res.status(200).json({
    success: true,
    message: "Profile fetched successfully",
    data: { volunteer },
  });
});

// ─── PUT /api/volunteers/me ───────────────────────────────────────────────────
exports.updateMe = asyncHandler(async (req, res) => {
  const volunteer = await volunteerService.updateVolunteer(req.user.id, req.body);
  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: { volunteer },
  });
});

// ─── DELETE /api/volunteers/me ────────────────────────────────────────────────
exports.deleteMe = asyncHandler(async (req, res) => {
  await volunteerService.deleteVolunteer(req.user.id);
  res.status(200).json({
    success: true,
    message: "Account deleted successfully",
  });
});

// ─── GET /api/admin/volunteers ────────────────────────────────────────────────
exports.getAllVolunteers = asyncHandler(async (req, res) => {
  const filters = {};
  if (req.query.availabilityStatus) filters.availabilityStatus = req.query.availabilityStatus;
  const volunteers = await volunteerService.getAllVolunteers(filters);
  res.status(200).json({
    success: true,
    message: "Volunteers fetched successfully",
    count: volunteers.length,
    data: { volunteers },
  });
});
