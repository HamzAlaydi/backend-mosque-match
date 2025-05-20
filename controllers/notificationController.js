const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const User = require("../models/User"); // Import the User model

// @desc    Get all notifications for the logged-in user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.find({ userId }).sort({
      createdAt: -1,
    }); // Sort by creation date, newest first
    res.json(notifications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Create a new notification
// @route   POST /api/notifications
// @access  Private (Used internally by other controllers)
exports.createNotification = async (userId, type, content) => {
  try {
    const newNotification = new Notification({
      userId,
      type,
      content,
    });
    await newNotification.save();
    return newNotification; //return the new notification
  } catch (err) {
    console.error(err.message);
    //  Do not send response, as this is called internally.  Throw error, so the original request can handle it.
    throw err;
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    if (notification.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to mark this notification as read" });
    }

    notification.isRead = true;
    await notification.save();
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    if (notification.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this notification" });
    }

    await Notification.findByIdAndDelete(notificationId);
    res.json({ message: "Notification deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.json({ unreadCount: count });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};