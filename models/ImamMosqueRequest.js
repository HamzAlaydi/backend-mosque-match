const mongoose = require("mongoose");
const { Schema } = mongoose;

const ImamMosqueRequestSchema = new Schema(
  {
    // Imam making the request
    imamId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Mosque they want to be assigned to
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

    // Message from imam explaining why they want to serve at this mosque
    message: {
      type: String,
      maxlength: 500,
      default: "Request to serve as imam at this mosque",
    },

    // Superadmin who reviewed the request
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Response from superadmin (optional)
    superadminResponse: {
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
ImamMosqueRequestSchema.index({ imamId: 1, mosqueId: 1 }, { unique: true });
ImamMosqueRequestSchema.index({ status: 1 });
ImamMosqueRequestSchema.index({ reviewedBy: 1, status: 1 });

module.exports = mongoose.model("ImamMosqueRequest", ImamMosqueRequestSchema);
