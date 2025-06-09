// routes/blocks.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  blockUser,
  unblockUser,
  getBlockedUsers,
} = require("../controllers/blockController");

// @route   POST /api/blocks/block
// @desc    Block a user
// @access  Private
router.post("/block", auth, blockUser);

// @route   POST /api/blocks/unblock
// @desc    Unblock a user
// @access  Private
router.post("/unblock", auth, unblockUser);

// @route   GET /api/blocks/blocked
// @desc    Get blocked users list
// @access  Private
router.get("/blocked", auth, getBlockedUsers);

module.exports = router;
