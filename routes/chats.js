const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getChatMessages,
  sendMessage,
  requestPhotoAccess,
  approvePhotoAccess,
} = require("../controllers/chatController");

// @route   GET /api/chats/:userId
// @desc    Get chat messages between two users
// @access  Private
router.get("/:userId", auth, getChatMessages);

// @route   POST /api/chats/send
// @desc    Send a new chat message
// @access  Private
router.post("/send", auth, sendMessage);

// @route   POST /api/chats/request-photo/:userId
// @desc    Request photo access from another user
// @access  Private
router.post("/request-photo/:userId", auth, requestPhotoAccess);

// @route   POST /api/chats/approve-photo/:userId
// @desc    Approve photo access request
// @access  Private
router.post("/approve-photo/:userId", auth, approvePhotoAccess);

module.exports = router;
