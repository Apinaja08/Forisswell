const express = require("express");
const router = express.Router();

<<<<<<< HEAD
// Placeholder route
router.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "Tree routes placeholder" });
});
=======
const {
  createTree,
  getTrees,
  getTree,
  updateTree,
  deleteTree
} = require("../controllers/treeController");

const { protect } = require("../middleware/auth");

router.use(protect);

router.route("/").get(getTrees).post(createTree);
router.route("/:id").get(getTree).put(updateTree).delete(deleteTree);
>>>>>>> origin/Tree-Tracking-Component

module.exports = router;
