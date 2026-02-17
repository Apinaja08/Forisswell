const express = require("express");
const router = express.Router();

// Placeholder route
router.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "Tree routes placeholder" });
});

module.exports = router;
