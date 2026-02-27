const Tree = require("../models/Tree");
const { reverseGeocode } = require("../services/reverseGeocodingService");

const asyncHandler =
  (fn) =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const canAccessTree = (user, tree) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return tree.owner && tree.owner.toString() === user.id;
};

exports.createTree = asyncHandler(async (req, res) => {
  const treeData = { ...req.body, owner: req.user.id };

  const coordinates = treeData?.location?.coordinates;
  if (Array.isArray(coordinates) && coordinates.length === 2) {
    const lon = Number(coordinates[0]);
    const lat = Number(coordinates[1]);

    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      console.log("[createTree] Reverse geocoding:", { lon, lat });
      const address = await reverseGeocode(lon, lat);
      if (address) {
        treeData.location = treeData.location || {};
        treeData.location.address = address;
        console.log("[createTree] Address resolved:", address);
      } else {
        console.warn("[createTree] Reverse geocoding failed/empty; saving without address.");
      }
    } else {
      console.warn("[createTree] Invalid coordinates; skipping reverse geocoding:", coordinates);
    }
  }

  const tree = await Tree.create(treeData);

  const populatedTree = await Tree.findById(tree._id).populate(
    "owner",
    "fullName email role"
  );

  res.status(201).json({
    success: true,
    message: "Tree created successfully",
    data: { tree: populatedTree },
  });
});

// @route   GET /api/trees (PROTECTED)
exports.getTrees = asyncHandler(async (req, res) => {
  const filter = { isActive: true };

  if (req.user.role !== "admin") {
    filter.owner = req.user.id;
  }

  if (req.query.species) filter.species = req.query.species;
  if (req.query.status) filter.status = req.query.status;

  const trees = await Tree.find(filter)
    .sort({ createdAt: -1 })
    .populate("owner", "fullName email role");

  res.status(200).json({
    success: true,
    message: "Trees fetched successfully",
    count: trees.length,
    data: { trees },
  });
});

exports.getTree = asyncHandler(async (req, res) => {
  const tree = await Tree.findOne({ _id: req.params.id, isActive: true }).populate(
    "owner",
    "fullName email role"
  );

  if (!tree) {
    throw createError(404, "Tree not found");
  }

  if (!canAccessTree(req.user, tree)) {
    throw createError(403, "Not authorized to access this tree");
  }

  res.status(200).json({
    success: true,
    message: "Tree fetched successfully",
    data: { tree },
  });
});

exports.updateTree = asyncHandler(async (req, res) => {
  const tree = await Tree.findOne({ _id: req.params.id, isActive: true });
  if (!tree) {
    throw createError(404, "Tree not found");
  }

  if (!canAccessTree(req.user, tree)) {
    throw createError(403, "Not authorized to update this tree");
  }

  const updates = { ...req.body };
  delete updates.owner;
  delete updates.isActive;
  delete updates.createdAt;
  delete updates.updatedAt;

  const incomingCoordinates = updates?.location?.coordinates;
  const hasCoordinateUpdate =
    updates?.location &&
    Object.prototype.hasOwnProperty.call(updates.location, "coordinates");

  Object.assign(tree, updates);

  if (hasCoordinateUpdate) {
    if (Array.isArray(incomingCoordinates) && incomingCoordinates.length === 2) {
      const lon = Number(incomingCoordinates[0]);
      const lat = Number(incomingCoordinates[1]);

      if (Number.isFinite(lon) && Number.isFinite(lat)) {
        console.log("[updateTree] Reverse geocoding:", { lon, lat });
        const address = await reverseGeocode(lon, lat);
        if (address) {
          tree.location.address = address;
          console.log("[updateTree] Address resolved:", address);
        } else {
          tree.location.address = undefined;
          console.warn(
            "[updateTree] Reverse geocoding failed/empty; clearing location.address."
          );
        }
      } else {
        console.warn(
          "[updateTree] Invalid coordinates; skipping reverse geocoding:",
          incomingCoordinates
        );
      }
    } else {
      console.warn(
        "[updateTree] Coordinates provided but not [lon, lat]; skipping reverse geocoding:",
        incomingCoordinates
      );
    }
  }

  await tree.save();

  const populatedTree = await Tree.findById(tree._id).populate(
    "owner",
    "fullName email role"
  );

  res.status(200).json({
    success: true,
    message: "Tree updated successfully",
    data: { tree: populatedTree },
  });
});

exports.deleteTree = asyncHandler(async (req, res) => {
  const tree = await Tree.findOne({ _id: req.params.id, isActive: true });
  if (!tree) {
    throw createError(404, "Tree not found");
  }

  if (!canAccessTree(req.user, tree)) {
    throw createError(403, "Not authorized to delete this tree");
  }

  tree.isActive = false;
  await tree.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "Tree deleted successfully",
  });
});
