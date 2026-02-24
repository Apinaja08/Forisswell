/**
 * volunteerService.js
 *
 * Pure business logic for Volunteer CRUD.
 * No req/res — all errors thrown with statusCode so asyncHandler in
 * controllers forwards them to the centralised error handler in app.js.
 */

const Volunteer = require("../models/Volunteer");

const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

/**
 * Register a new volunteer.
 * Returns the saved document (password excluded).
 */
const registerVolunteer = async (data) => {
  const existing = await Volunteer.findOne({ email: data.email });
  if (existing) throw createError(409, "A volunteer with this email already exists");

  const volunteer = await Volunteer.create(data);
  // Return without password (select:false already hides it, but make explicit)
  const saved = await Volunteer.findById(volunteer._id);
  return saved;
};

/**
 * Authenticate a volunteer and return the document (with password for comparison).
 * Caller must verify password and then strip it before sending to client.
 */
const loginVolunteer = async (email, password) => {
  if (!email || !password) throw createError(400, "Please provide email and password");

  const volunteer = await Volunteer.findOne({ email }).select("+password");
  if (!volunteer) throw createError(401, "Invalid credentials");

  const isMatch = await volunteer.comparePassword(password);
  if (!isMatch) throw createError(401, "Invalid credentials");

  if (!volunteer.isActive) throw createError(401, "Account has been deactivated");

  return volunteer;
};

/**
 * Get a single volunteer by ID (no password).
 */
const getVolunteerById = async (id) => {
  const volunteer = await Volunteer.findById(id);
  if (!volunteer || !volunteer.isActive) throw createError(404, "Volunteer not found");
  return volunteer;
};

/**
 * Update volunteer profile.
 * Protected fields (password, role, email) are stripped before update.
 */
const updateVolunteer = async (id, data) => {
  const updates = { ...data };
  // Strip fields that must not be changed via this route
  delete updates.password;
  delete updates.role;
  delete updates.email;
  delete updates.availabilityStatus; // availability is managed by the alert workflow only
  delete updates.isActive;

  const volunteer = await Volunteer.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!volunteer) throw createError(404, "Volunteer not found");
  return volunteer;
};

/**
 * Soft-delete a volunteer (sets isActive = false).
 */
const deleteVolunteer = async (id) => {
  const volunteer = await Volunteer.findById(id);
  if (!volunteer) throw createError(404, "Volunteer not found");
  if (volunteer.availabilityStatus === "busy") {
    throw createError(400, "Cannot delete a volunteer who is currently on an assignment");
  }
  volunteer.isActive = false;
  await volunteer.save({ validateBeforeSave: false });
};

/**
 * Get all volunteers — admin use.
 * Optional filter: { availabilityStatus }
 */
const getAllVolunteers = async (filters = {}) => {
  const query = { isActive: true };
  if (filters.availabilityStatus) query.availabilityStatus = filters.availabilityStatus;
  return Volunteer.find(query).sort({ createdAt: -1 });
};

module.exports = {
  registerVolunteer,
  loginVolunteer,
  getVolunteerById,
  updateVolunteer,
  deleteVolunteer,
  getAllVolunteers,
};
