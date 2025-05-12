const mongoose = require("mongoose");
const { Schema } = mongoose;

const InterestSchema = new Schema({
  maleId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  femaleId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

// Define a unique index to prevent duplicate entries
InterestSchema.index({ maleId: 1, femaleId: 1 }, { unique: true });

module.exports = mongoose.model("Interest", InterestSchema);
