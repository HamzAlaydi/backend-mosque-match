const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Schema } = mongoose;
const jwt = require("jsonwebtoken");

const UserSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    // Password reset fields
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    password: { type: String, required: true, minlength: 6 },
    gender: { type: String, enum: ["male", "female"] },
    role: {
      type: String,
      enum: ["male", "female", "imam", "superadmin"],
      required: true,
    },

    // Profile and Personal Details
    tagLine: String,
    about: String,
    lookingFor: String,
    firstName: String,
    lastName: String,
    birthDate: Date,
    height: String,
    build: String,
    ethnicity: String,
    disability: { type: Boolean, default: false },

    // Location
    currentLocation: String,
    countryOfBirth: String,
    citizenship: String,
    originCountry: String,
    willingToRelocate: { type: Boolean, default: false },

    // Education & Career
    educationLevel: String,
    profession: String,
    jobTitle: String,
    income: String,

    // Languages
    languages: [String],
    firstLanguage: String,
    secondLanguage: String,

    // Family
    maritalStatus: String,
    childrenDesire: String,
    hasChildren: String,
    livingArrangement: String,
    marriageWithin: String,

    // Religious Info
    religiousness: String,
    sector: String,
    isRevert: { type: Boolean, default: false },
    keepsHalal: { type: Boolean, default: true },
    prayerFrequency: String,
    quranReading: String,

    // Habits
    smokes: { type: Boolean, default: false },
    drinks: { type: Boolean, default: false },
    phoneUsage: String,

    // Female-specific
    wali: {
      name: String,
      phone: String,
      email: String,
    },
    hijab: { type: String, enum: ["yes", "no", "sometimes"] },
    wearsHijab: Boolean,

    // Male-specific
    beard: { type: String, enum: ["yes", "no", "some"] },
    hasBeard: Boolean,

    // Profile Pictures
    profilePicture: { type: String, default: null },
    blurPhotoForEveryone: { type: Boolean, default: true }, // New field for photo privacy control
    blurredProfilePicture: String,
    unblurRequest: { type: Boolean, default: false },

    // Account Status
    isVerified: { type: Boolean, default: false },
    terms: { type: Boolean, default: false },

    // Imam-specific
    phone: String,
    mosque: String,
    managedMosques: [String],
    messageToCommunity: String,
    approvedPhotosFor: [{ type: Schema.Types.ObjectId, ref: "User" }],
    approvedWaliFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Imam approval status
    imamApprovalStatus: {
      type: String,
      enum: ["pending", "approved", "denied"],
      default: "pending",
    },
    deniedReason: String,
    // Attached Mosques
    distance: { type: Number, default: 6 },
    attachedMosques: [
      {
        id: { type: Number, required: false }, // Accept both string and number
        name: String,
        address: String,
        location: {
          type: {
            type: String,
            enum: ["Point"],
            default: "Point",
          },
          coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
          },
        },
      },
    ],
    // Add this field to your existing UserSchema
    savedMosqueSelection: [
      {
        id: { type: Number, required: false },
        name: String,
        address: String,
        location: {
          type: {
            type: String,
            enum: ["Point"],
            default: "Point",
          },
          coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
          },
        },
      },
    ],
    // Block functionality
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    blockedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    // Persistent per-user action tracking
    userActionHistory: [
      {
        targetUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        photoRequested: { type: Boolean, default: false },
        waliRequested: { type: Boolean, default: false },
        messageSent: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

UserSchema.index({ "attachedMosques.location": "2dsphere" });
UserSchema.methods.generateVerificationToken = function () {
  const verificationToken = jwt.sign(
    { id: this._id },
    process.env.EMAIL_SECRET || "your_email_secret_key",
    { expiresIn: "24h" }
  );

  this.emailVerificationToken = verificationToken;
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  return verificationToken;
};
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

UserSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", UserSchema);
