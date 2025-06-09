// models/Notification.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: [
      "interest", // When someone adds user to interest list
      "photoRequest", // When someone requests to see unblurred photos
      "photoAccessApproved", // When photo access is approved
      "imamRequest", // When imam verification is requested
      "imamApproved", // When imam verification is approved
      "verificationRequest", // When profile verification is requested
      "verificationApproved", // When profile is verified
      "verificationRejected", // When verification is rejected
      "message", // When a new message is received
      "photo_request",
      "photo_response",
    ],
    required: true,
  },
  fromUserId: { type: Schema.Types.ObjectId, ref: "User" }, // Who caused this notification
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model("Notification", NotificationSchema);
