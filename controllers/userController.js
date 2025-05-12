const mongoose = require("mongoose");
const User = require("../models/User");
const { validationResult } = require("express-validator");
const { userUpdateValidation } = require("../utils/validation");
const { uploadToS3 } = require("../services/awsService"); // Import the upload function

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  // Validate user input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Update user fields
    const updates = Object.keys(req.body);
    const allowedUpdates = [
      "firstName",
      "lastName",
      "location",
      "countryOfBirth",
      "dateOfBirth",
      "citizenship",
      "originCountry",
      "languages",
      "maritalStatus",
      "hijab",
      "beard",
    ]; // Add fields you want to be updatable here
    updates.forEach((update) => {
      if (allowedUpdates.includes(update)) {
        user[update] = req.body[update];
      }
    });

    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Update user profile picture
// @route   PUT /api/users/profile/picture
// @access  Private
exports.updateProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    // Upload to S3
    const result = await uploadToS3(req.file);
    user.profilePicture = result.Location; // Save the S3 URL
    user.blurredProfilePicture = result.Location; // initially the blurred and unblurred are the same
    await user.save();

    res.json({
      message: "Profile picture updated successfully",
      profilePicture: result.Location,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Request to unblur profile picture
// @route   POST /api/users/profile/picture/unblur
// @access  Private
exports.requestUnblur = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    //  Logic for requesting unblur.
    user.unblurRequest = true; // Set unblur request to true
    await user.save();

    //send notification
    const io = req.app.get("io"); // Get the Socket.IO instance
    io.emit("unblurRequest", { userId: user._id });

    res.json({ message: "Unblur request sent" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Approve profile picture unblur request
// @route   POST /api/users/profile/picture/unblur/:userId
// @access  Private (only for Imams)
exports.approveUnblur = async (req, res) => {
  try {
    const approver = await User.findById(req.user.id);
    if (approver.role !== "imam") {
      return res
        .status(403)
        .json({ message: "Only imams can approve unblur requests" });
    }
    const userToUnblur = await User.findById(req.params.userId);
    if (!userToUnblur) {
      return res.status(404).json({ message: "User not found" });
    }

    userToUnblur.blurredProfilePicture = null; // Set blurred picture to null, showing the original
    userToUnblur.unblurRequest = false;
    await userToUnblur.save();

    res.json({ message: "Profile picture unblurred" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get user profile by ID
// @route   GET /api/users/:id
// @access  Private
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
