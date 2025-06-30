const mongoose = require("mongoose");
const { Schema } = mongoose;

const MosqueSchema = new Schema(
  {
    name: { type: String, required: true },
    externalId: { type: Schema.Types.Mixed, unique: true, sparse: true }, // Can be Number or String for handling duplicates
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
    rating: { type: Number, default: null },
    reviewCount: { type: Number, default: null },
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
MosqueSchema.index({ externalId: 1 });

module.exports = mongoose.model("Mosque", MosqueSchema);
