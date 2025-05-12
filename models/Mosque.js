const mongoose = require("mongoose");
const { Schema } = mongoose;

const MosqueSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    location: {
      // GeoJSON Point for location
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    address: { type: String, required: true },
    imams: [{ type: Schema.Types.ObjectId, ref: "User" }], // Array of Imam IDs
    imamRequests: [{ type: Schema.Types.ObjectId, ref: "User" }], // Array of Imam IDs who have requested to manage
    females: [{ type: Schema.Types.ObjectId, ref: "User" }], // Array of Female User IDs connected to this mosque
  },
  {
    timestamps: true,
  }
);

// Ensure location is indexed for geospatial queries
MosqueSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Mosque", MosqueSchema);
