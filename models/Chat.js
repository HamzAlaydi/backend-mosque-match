const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000, // Reasonable limit for message length
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  messageType: {
    type: String,
    enum: ["text", "image", "photo_request", "photo_approval"],
    default: "text",
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

// Index for efficient querying
ChatSchema.index({ sender: 1, receiver: 1, timestamp: -1 });
ChatSchema.index({ receiver: 1, isRead: 1 });
ChatSchema.index({ timestamp: -1 });

// Virtual for formatting timestamp
ChatSchema.virtual("formattedTime").get(function () {
  return this.timestamp.toISOString();
});

// Method to mark message as read
ChatSchema.methods.markAsRead = function () {
  this.isRead = true;
  return this.save();
};

// Static method to get conversation between two users
ChatSchema.statics.getConversation = function (userId1, userId2, limit = 50) {
  return this.find({
    $or: [
      { sender: userId1, receiver: userId2 },
      { sender: userId2, receiver: userId1 },
    ],
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate("sender", "firstName lastName profilePicture")
    .populate("receiver", "firstName lastName profilePicture");
};

// Static method to get unread count for a user
ChatSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    receiver: userId,
    isRead: false,
  });
};

// Static method to mark conversation as read
ChatSchema.statics.markConversationAsRead = function (
  currentUserId,
  otherUserId
) {
  return this.updateMany(
    { sender: otherUserId, receiver: currentUserId, isRead: false },
    { isRead: true }
  );
};

// Pre-save middleware to validate
ChatSchema.pre("save", function (next) {
  if (this.sender.toString() === this.receiver.toString()) {
    return next(new Error("Cannot send message to yourself"));
  }
  next();
});

const Chat = mongoose.model("Chat", ChatSchema);

module.exports = Chat;
