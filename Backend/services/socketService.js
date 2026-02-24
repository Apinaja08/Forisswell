/**
 * socketService.js
 *
 * Centralised Socket.io emit helpers.
 * All other services/controllers call these functions instead of
 * accessing global.io directly.
 *
 * global.io is initialised in Server.js and follows the same pattern
 * already used in riskAnalysisService.js.
 */

const getIO = () => {
  if (!global.io) {
    // Socket.io not yet initialised (e.g. during unit tests) — silently skip
    return null;
  }
  return global.io;
};

/**
 * Emit to a single volunteer's private room.
 * Room name: "volunteer:<volunteerId>"
 */
const emitToVolunteer = (volunteerId, event, data) => {
  const io = getIO();
  if (!io) return;
  io.to(`volunteer:${volunteerId}`).emit(event, data);
};

/**
 * Emit the same event to multiple volunteers.
 */
const emitToVolunteers = (volunteerIds = [], event, data) => {
  volunteerIds.forEach((id) => emitToVolunteer(id.toString(), event, data));
};

/**
 * Emit to the admin room.
 * All connected admins automatically join "admins" on socket connect.
 */
const emitToAdmins = (event, data) => {
  const io = getIO();
  if (!io) return;
  io.to("admins").emit(event, data);
};

/**
 * Broad global emit for "alert_resolved".
 * The tree-care module subscribes to this event and updates tree.healthStatus.
 */
const emitAlertResolved = (alertId, treeId) => {
  const io = getIO();
  if (!io) return;
  io.emit("alert_resolved", { alertId, treeId });
};

module.exports = {
  emitToVolunteer,
  emitToVolunteers,
  emitToAdmins,
  emitAlertResolved,
};
