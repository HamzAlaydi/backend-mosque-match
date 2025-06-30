const mongoose = require("mongoose");
const { Schema } = mongoose;

const MosqueAttachmentRequestSchema = new Schema(
  {
    // User making the request
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Mosque they want to join
    mosqueId: {
      type: Schema.Types.ObjectId,
      ref: "Mosque",
      required: true,
    },

    // Status of the request
    status: {
      type: String,
      enum: ["pending", "approved", "denied"],
      default: "pending",
    },

    // Message from user explaining why they want to join
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },

    // Imam who will review the request (assigned based on mosque)
    assignedImamId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Response from imam (optional)
    imamResponse: {
      type: String,
      maxlength: 500,
    },

    // Date when request was reviewed
    reviewedAt: {
      type: Date,
    },

    // Reason for denial (if denied)
    denialReason: {
      type: String,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
MosqueAttachmentRequestSchema.index(
  { userId: 1, mosqueId: 1 },
  { unique: true }
);
MosqueAttachmentRequestSchema.index({ assignedImamId: 1, status: 1 });
MosqueAttachmentRequestSchema.index({ status: 1 });

module.exports = mongoose.model(
  "MosqueAttachmentRequest",
  MosqueAttachmentRequestSchema
);
