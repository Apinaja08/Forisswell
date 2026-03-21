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

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const lon = toNumber(coordinates[0]);
  const lat = toNumber(coordinates[1]);
  if (lon === null || lat === null) return null;
  return [lon, lat];
};

const buildFallbackAddress = (lon, lat) => ({
  formatted: `Lat ${lat.toFixed(6)}, Lon ${lon.toFixed(6)}`,
  city: undefined,
  district: undefined,
  country: undefined,
});

const canAccessTree = (user, tree) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return tree.owner && tree.owner.toString() === user.id;
};

exports.createTree = asyncHandler(async (req, res) => {
  const treeData = { ...req.body, owner: req.user.id };

  const normalized = normalizeCoordinates(treeData?.location?.coordinates);
  if (normalized) {
    const [lon, lat] = normalized;
    treeData.location = treeData.location || {};
    treeData.location.coordinates = normalized;

    console.log("[createTree] Reverse geocoding:", { lon, lat });
    const address = await reverseGeocode(lon, lat);
    if (address) {
      treeData.location.address = address;
      console.log("[createTree] Address resolved:", address);
    } else {
      treeData.location.address = buildFallbackAddress(lon, lat);
      console.warn("[createTree] Reverse geocoding failed; fallback address saved.");
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

// @route   GET /api/trees/all (PROTECTED)
// @desc    Get all active trees for any authenticated user (information view)
exports.getAllTrees = asyncHandler(async (req, res) => {
  const filter = { isActive: true };

  if (req.query.species) filter.species = req.query.species;
  if (req.query.status) filter.status = req.query.status;

  const trees = await Tree.find(filter)
    .sort({ createdAt: -1 })
    .populate("owner", "fullName role");

  res.status(200).json({
    success: true,
    message: "All trees fetched successfully",
    count: trees.length,
    data: { trees },
  });
});

// @route   GET /api/trees/nearby (PROTECTED)
// @desc    Get nearby active trees around [lon,lat] point
exports.getNearbyTrees = asyncHandler(async (req, res) => {
  const lon = toNumber(req.query.lon);
  const lat = toNumber(req.query.lat);
  const radiusKm = toNumber(req.query.radiusKm ?? req.query.radius ?? 5);

  if (lon === null || lat === null) {
    throw createError(400, "Please provide valid query params: lon and lat");
  }
  if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
    throw createError(400, "Coordinates out of range");
  }
  if (radiusKm === null || radiusKm <= 0 || radiusKm > 100) {
    throw createError(400, "radiusKm must be between 0 and 100");
  }

  const filter = {
    isActive: true,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lon, lat],
        },
        $maxDistance: radiusKm * 1000,
      },
    },
  };

  if (req.query.species) filter.species = req.query.species;
  if (req.query.status) filter.status = req.query.status;

  const trees = await Tree.find(filter)
    .sort({ createdAt: -1 })
    .populate("owner", "fullName role");

  res.status(200).json({
    success: true,
    message: "Nearby trees fetched successfully",
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

  if (hasCoordinateUpdate) {
    const normalizedIncoming = normalizeCoordinates(incomingCoordinates);
    if (normalizedIncoming) {
      updates.location.coordinates = normalizedIncoming;
    }
  }

  Object.assign(tree, updates);

  if (hasCoordinateUpdate) {
    const normalizedIncoming = normalizeCoordinates(incomingCoordinates);
    if (normalizedIncoming) {
      const [lon, lat] = normalizedIncoming;

      console.log("[updateTree] Reverse geocoding:", { lon, lat });
      const address = await reverseGeocode(lon, lat);
      if (address) {
        tree.location.address = address;
        console.log("[updateTree] Address resolved:", address);
      } else {
        tree.location.address = buildFallbackAddress(lon, lat);
        console.warn("[updateTree] Reverse geocoding failed; fallback address saved.");
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
