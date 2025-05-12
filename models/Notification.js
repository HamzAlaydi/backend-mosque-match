const mongoose = require("mongoose");
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: [
      "photoRequest",
      "photoAccessApproved",
      "imamRequest",
      "imamApproved",
      "verificationRequest",
      "verificationApproved",
      "verificationRejected",
      "message",
    ],
    required: true,
  },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Notification", NotificationSchema);
