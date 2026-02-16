const express = require("express");
const router = express.Router();

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

module.exports = router;
