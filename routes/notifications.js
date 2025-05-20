const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getNotifications,
  markAsRead,
  deleteNotification,
  getUnreadCount,
} = require("../controllers/notificationController");

// @route   GET /api/notifications
// @desc    Get all notifications for the logged-in user
// @access  Private
router.get("/", auth, getNotifications);

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put("/:id/read", auth, markAsRead);

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete("/:id", auth, deleteNotification);
router.get("/unread-count", auth, getUnreadCount);

module.exports = router;
