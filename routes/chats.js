const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getChatList,
  getChatMessages,
  sendMessage,
  markMessagesAsRead,
  deleteMessage,
  requestPhotoAccess,
  approvePhotoAccess,
  requestPhotoAccessWithMessage,
  respondToPhotoRequest,
  getOnlineUsers,
  updateTypingStatus,
  requestWaliAccessWithMessage,
  respondToWaliRequest,
} = require("../controllers/chatController");

// @route   GET /api/chats
// @desc    Get all chats for a user
// @access  Private
router.get("/", auth, getChatList);

// @route   GET /api/chats/:userId
// @desc    Get chat messages between two users
// @access  Private
router.get("/:userId", auth, getChatMessages);

// @route   POST /api/chats/send
// @desc    Send a new chat message
// @access  Private
router.post("/send", auth, sendMessage);

// @route   PUT /api/chats/:userId/read
// @desc    Mark messages as read
// @access  Private
router.put("/:userId/read", auth, markMessagesAsRead);

// @route   DELETE /api/chats/message/:messageId
// @desc    Delete a message
// @access  Private
router.delete("/message/:messageId", auth, deleteMessage);

// @route   POST /api/chats/request-photo/:userId
// @desc    Request photo access with chat message (Updated)
// @access  Private
router.post("/request-photo/:userId", auth, requestPhotoAccessWithMessage);

// @route   POST /api/chats/respond-photo/:userId
// @desc    Respond to photo request (New)
// @access  Private
router.post("/respond-photo/:userId", auth, respondToPhotoRequest);
router.post("/request-wali/:userId", auth, requestWaliAccessWithMessage);
router.post("/respond-wali/:userId", auth, respondToWaliRequest);

// @route   POST /api/chats/approve-photo/:userId
// @desc    Approve photo access request (Legacy - keep for compatibility)
// @access  Private
router.post("/approve-photo/:userId", auth, approvePhotoAccess);

// @route   GET /api/chats/online-users
// @desc    Get online users
// @access  Private
router.get("/online-users", auth, getOnlineUsers);

// @route   POST /api/chats/typing
// @desc    Update typing status
// @access  Private
router.post("/typing", auth, updateTypingStatus);

module.exports = router;
