const Tree = require("../models/Tree");

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

// @route   POST /api/trees (PROTECTED)
exports.createTree = asyncHandler(async (req, res) => {
  const treeData = { ...req.body, owner: req.user.id };
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

// @route   GET /api/trees/:id (PROTECTED)
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

// @route   PUT /api/trees/:id (PROTECTED)
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

  Object.assign(tree, updates);
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

// @route   DELETE /api/trees/:id (PROTECTED) - soft delete
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

