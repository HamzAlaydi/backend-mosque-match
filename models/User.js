const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["male", "female", "imam", "superadmin"],
      required: true,
    },
    firstName: { type: String },
    lastName: { type: String },
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
    countryOfBirth: { type: String },
    dateOfBirth: { type: Date },
    citizenship: { type: String },
    originCountry: { type: String },
    languages: [{ type: String }],
    maritalStatus: { type: String },
    profilePicture: { type: String },
    blurredProfilePicture: { type: String }, // initially same as profilePicture
    unblurRequest: { type: Boolean, default: false },
    // Female-specific fields
    wali: {
      name: { type: String },
      relationship: { type: String },
      contact: { type: String },
    },
    hijab: { type: String, enum: ["yes", "no", "sometimes"] },
    // Male-specific fields
    beard: { type: String, enum: ["yes", "no", "some"] },
    isVerified: { type: Boolean, default: false },
    // Imam-specific fields
    phone: { type: String },
    mosque: { type: Schema.Types.ObjectId, ref: "Mosque" }, // Imam's primary mosque
    managedMosques: [{ type: Schema.Types.ObjectId, ref: "Mosque" }], // Mosques managed by the imam
    messageToCommunity: { type: String },
    approvedPhotosFor: [{ type: Schema.Types.ObjectId, ref: "User" }], // Array of user IDs for whom photo access is granted
  },
  {
    timestamps: true, // Add createdAt and updatedAt fields
  }
);

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    return next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", UserSchema);
