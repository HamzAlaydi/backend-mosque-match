const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const { sendVerificationEmail } = require("../services/emailService");

const { validationResult } = require("express-validator");
const config = require("../config/keys");
const {
  userRegisterValidation,
  userLoginValidation,
} = require("../utils/validation"); // Import validations

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    config.jwtSecret,
    { expiresIn: "7d" } // Token expires in 7 days
  );
};

// @desc    Register a new user (Male, Female, or Imam)
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email, password, role, gender } = req.body;
  console.log(req.body);

  try {
    if (await User.findOne({ email }))
      return res.status(400).json({ message: "Email already exists" });

    // Base user data
    const userData = {
      email,
      password,
      role,
      gender,
      terms: req.body.terms,
      currentLocation: req.body.currentLocation,
      attachedMosques:
        req.body.attachedMosques?.map((m) => ({
          id: m.id,
          name: m.name,
          address: m.address,
          location: {
            type: "Point",
            coordinates: m.location.coordinates,
          },
        })) || [],
      // Profile and Personal Details
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      tagLine: req.body.tagLine,
      about: req.body.about,
      lookingFor: req.body.lookingFor,
      birthDate: req.body.birthDate,
      height: req.body.height,
      build: req.body.build,
      ethnicity: req.body.ethnicity,
      disability: req.body.disability,
      // Location
      countryOfBirth: req.body.countryOfBirth,
      citizenship: req.body.citizenship,
      originCountry: req.body.originCountry,
      willingToRelocate: req.body.willingToRelocate,
      // Education & Career
      educationLevel: req.body.educationLevel,
      profession: req.body.profession,
      jobTitle: req.body.jobTitle,
      income: req.body.income,
      // Languages
      languages: req.body.languages,
      firstLanguage: req.body.firstLanguage,
      secondLanguage: req.body.secondLanguage,
      // Family
      maritalStatus: req.body.maritalStatus,
      childrenDesire: req.body.childrenDesire,
      hasChildren: req.body.hasChildren,
      livingArrangement: req.body.livingArrangement,
      marriageWithin: req.body.marriageWithin,
      // Religious Info
      religiousness: req.body.religiousness,
      sector: req.body.sector,
      isRevert: req.body.isRevert,
      keepsHalal: req.body.keepsHalal,
      prayerFrequency: req.body.prayerFrequency,
      quranReading: req.body.quranReading,
      // Habits
      smokes: req.body.smokes,
      drinks: req.body.drinks,
      phoneUsage: req.body.phoneUsage,
      // Profile Pictures
      profilePicture: req.body.profilePicture,
      blurredProfilePicture: req.body.blurredProfilePicture,
      unblurRequest: req.body.unblurRequest,
    };

    // Handle boolean fields with defaults if not provided
    if (typeof req.body.disability !== "undefined")
      userData.disability = req.body.disability;
    if (typeof req.body.willingToRelocate !== "undefined")
      userData.willingToRelocate = req.body.willingToRelocate;
    if (typeof req.body.isRevert !== "undefined")
      userData.isRevert = req.body.isRevert;
    if (typeof req.body.keepsHalal !== "undefined")
      userData.keepsHalal = req.body.keepsHalal;
    if (typeof req.body.smokes !== "undefined")
      userData.smokes = req.body.smokes;
    if (typeof req.body.drinks !== "undefined")
      userData.drinks = req.body.drinks;
    if (typeof req.body.unblurRequest !== "undefined")
      userData.unblurRequest = req.body.unblurRequest;

    // Role-specific fields
    if (role === "female") {
      userData.wali = {
        name: req.body.wali?.name,
        phone: req.body.wali?.phone,
        email: req.body.wali?.email,
        relationship: req.body.wali?.relationship,
      };
      userData.hijab = req.body.hijab;
      userData.wearsHijab = req.body.wearsHijab;
    } else if (role === "male") {
      userData.beard = req.body.beard;
      userData.hasBeard = req.body.hasBeard;
    } else if (role === "imam") {
      userData.phone = req.body.phone;
      userData.mosque = req.body.mosqueDetails?.id;
      userData.managedMosques =
        req.body.attachedMosques?.map((m) => m.id) || [];
      userData.messageToCommunity = req.body.message;
    }

    const user = new User(userData);
    // Generate verification token
    const verificationToken = user.generateVerificationToken();
    await user.save();
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}&email=${user.email}`;
    await sendVerificationEmail(user, verificationUrl);

    res.status(201).json({
      token: generateToken(user),
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if email is verified - uncomment and enable this block
    if (!user.isEmailVerified) {
      return res.status(401).json({
        message: "Please verify your email before logging in",
        emailVerificationRequired: true,
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create and return token
    res.json({
      token: generateToken(user),
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
// @desc    Get logged in user data
// @route   GET /api/auth/user
// @access  Private
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    // Verify the token
    const decoded = jwt.verify(
      token,
      process.env.EMAIL_SECRET || "your_email_secret_key"
    );

    // Find the user
    const user = await User.findOne({
      _id: decoded.id,
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired verification token",
      });
    }

    // Update user as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    res.status(200).json({
      message: "Email verified successfully",
    });
  } catch (error) {
    res.status(400).json({
      message: "Email verification failed",
      error: error.message,
    });
  }
};

// Resend verification email
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        message: "Email already verified",
      });
    }

    // Generate new verification token
    const verificationToken = user.generateVerificationToken();
    await user.save();

    // Create the verification URL
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}&email=${user.email}`;

    // Send the verification email
    await sendVerificationEmail(user, verificationUrl);

    res.status(200).json({
      message: "Verification email sent",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to resend verification email",
      error: error.message,
    });
  }
};

// @desc    Send password reset email
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      // For security reasons, we don't want to reveal that the email doesn't exist
      // We'll still return a success message
      return res.status(200).json({
        message:
          "If your email is registered, you will receive password reset instructions shortly",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash the reset token
    const hashedResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save the hashed token to the user's document
    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // Token valid for 1 hour

    await user.save();

    // Create the reset URL that will be sent to the user's email
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password/${resetToken}`;

    // Send the email
    await sendPasswordResetEmail(user, resetUrl);

    res.status(200).json({
      message:
        "If your email is registered, you will receive password reset instructions shortly",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({
      message: "Something went wrong while processing your request",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token, password } = req.body;

  try {
    // Hash the token from the URL to compare with the one in the database
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with the hashed token and check if the token hasn't expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Password reset token is invalid or has expired",
      });
    }

    // Set the new password
    user.password = password; // Will be hashed by the pre-save middleware in the User model

    // Clear the reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({
      message: "Something went wrong while processing your request",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
