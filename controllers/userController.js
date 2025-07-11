const mongoose = require("mongoose");
const User = require("../models/User");
const { validationResult } = require("express-validator");
const { userUpdateValidation } = require("../utils/validation");
const { uploadToS3 } = require("../services/awsService");

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // Exclude password for security
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get multiple users by their IDs
// @route   POST /api/users/details
// @access  Private
exports.getUsersByIds = async (req, res) => {
  const { userIds } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res
      .status(400)
      .json({ message: "userIds must be a non-empty array" });
  }

  try {
    const users = await User.find({ _id: { $in: userIds } }).select(
      "-password"
    );
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
};
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

    // Define all allowed fields for update
    const allowedUpdates = [
      "firstName",
      "lastName",
      "currentLocation",
      "countryOfBirth",
      "birthDate",
      "citizenship",
      "originCountry",
      "languages",
      "maritalStatus",
      "educationLevel",
      "profession",
      "jobTitle",
      "income",
      "firstLanguage",
      "secondLanguage",
      "religiousness",
      "sector",
      "isRevert",
      "keepsHalal",
      "prayerFrequency",
      "quranReading",
      "childrenDesire",
      "hasChildren",
      "livingArrangement",
      "height",
      "build",
      "ethnicity",
      "smokes",
      "drinks",
      "disability",
      "phoneUsage",
      "willingToRelocate",
      "tagLine",
      "about",
      "lookingFor",
      "marriageWithin",
      "wearsHijab",
      "hasBeard",
      "blurPhotoForEveryone", // Photo privacy setting
      "attachedMosques", // Include attachedMosques in allowed updates
    ];

    // Gender-specific fields
    if (user.gender === "female") {
      allowedUpdates.push(
        "hijab",
        "wearsHijab",
        "wali.name",
        "wali.phone",
        "wali.email",
        "wali.relationship"
      );
    } else if (user.gender === "male") {
      allowedUpdates.push("beard", "hasBeard");
    }

    // Update user fields from request body
    Object.keys(req.body).forEach((field) => {
      // Check if it's an allowed field or a nested field
      if (allowedUpdates.includes(field)) {
        user[field] = req.body[field];
      } else if (field.includes(".")) {
        // Handle nested fields like wali.name
        const [parent, child] = field.split(".");
        if (allowedUpdates.includes(`${parent}.${child}`)) {
          if (!user[parent]) user[parent] = {};
          user[parent][child] = req.body[field];
        }
      }
    });

    // Handle specific field updates
    if (
      req.body.currentLocation &&
      typeof req.body.currentLocation === "object"
    ) {
      if (req.body.currentLocation.coordinates) {
        user.currentLocation.coordinates = req.body.currentLocation.coordinates;
      }
      if (req.body.currentLocation.address) {
        user.currentLocation.address = req.body.currentLocation.address;
      }
    }

    // Handle attachedMosques updates
    if (req.body.attachedMosques) {
      user.attachedMosques = req.body.attachedMosques.map((mosque) => ({
        id: mosque.id,
        name: mosque.name,
        address: mosque.address,
        location: {
          type: "Point",
          coordinates: mosque.location.coordinates,
        },
      }));
    }

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
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Get sanitized filename from uploadToS3 result
    const result = await uploadToS3(
      req.file.buffer,
      req.file.originalname, // Original filename will be sanitized in uploadToS3
      process.env.AWS_BUCKET_NAME,
      req.file.mimetype
    );

    user.profilePicture = result.s3Url;
    user.blurredProfilePicture = result.s3Url;

    await user.save();

    res.json({
      message: "Profile picture updated successfully",
      profilePicture: result.s3Url,
    });
  } catch (err) {
    console.error("Profile picture error:", err);
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

    // Logic for requesting unblur
    user.unblurRequest = true; // Set unblur request to true
    await user.save();

    // Send notification
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

    // Add user to approver's list of users with approved photos
    if (!approver.approvedPhotosFor.includes(userToUnblur._id)) {
      approver.approvedPhotosFor.push(userToUnblur._id);
      await approver.save();
    }

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

// @desc    Update mosque attachments
// @route   PUT /api/users/mosques
// @access  Private
exports.updateMosqueAttachments = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { attachedMosques, distance } = req.body;

    if (attachedMosques) {
      user.attachedMosques = attachedMosques;
    }

    if (distance) {
      user.distance = distance;
    }

    await user.save();

    res.json({
      message: "Mosque attachments updated successfully",
      attachedMosques: user.attachedMosques,
      distance: user.distance,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Remove wali access for a user
// @route   DELETE /api/users/wali-access/:id
// @access  Private (e.g., only for superadmin or the user themselves under specific conditions)
exports.removeWaliAccess = async (req, res) => {
  try {
    const userIdToRemoveFromApprovedList = req.params.id; // This is the ID of the user whose wali access is being revoked for the approver.
    const approverId = req.user.id; // The ID of the currently authenticated user (the one logged in, who is an imam/superadmin).

    const approver = await User.findById(approverId);

    if (!approver) {
      return res.status(404).json({ message: "Approver user not found." });
    }

    // Check if the userIdToRemoveFromApprovedList actually exists in the approver's approvedWaliFor array
    const index = approver.approvedWaliFor.indexOf(
      userIdToRemoveFromApprovedList
    );

    if (index === -1) {
      return res.status(404).json({
        message: "User ID not found in approver's approved wali list.",
      });
    }

    // Remove the userId from the approvedWaliFor array
    approver.approvedWaliFor.splice(index, 1); // Remove 1 element at the found index

    await approver.save();

    res.json({
      message: `User ID ${userIdToRemoveFromApprovedList} removed from approvedWaliFor list of ${approver.firstName}.`,
    });
  } catch (error) {
    console.error("Error removing user from approvedWaliFor list:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.removePhotoAccess = async (req, res) => {
  try {
    const userIdToRemoveFromApprovedList = req.params.id; // This is the ID of the user whose photo access is being revoked for the approver.
    const approverId = req.user.id; // The ID of the currently authenticated user (the one logged in, who is an imam/superadmin).

    const approver = await User.findById(approverId);

    if (!approver) {
      return res.status(404).json({ message: "Approver user not found." });
    }

    // Check if the userIdToRemoveFromApprovedList actually exists in the approver's approvedPhotosFor array
    const index = approver.approvedPhotosFor.indexOf(
      userIdToRemoveFromApprovedList
    );

    if (index === -1) {
      return res
        .status(404)
        .json({
          message: "User ID not found in approver's approved photos list.",
        });
    }

    // Remove the userId from the approvedPhotosFor array
    approver.approvedPhotosFor.splice(index, 1); // Remove 1 element at the found index

    await approver.save();

    res.json({
      message: `User ID ${userIdToRemoveFromApprovedList} removed from approvedPhotosFor list of ${approver.firstName}.`,
    });
  } catch (error) {
    console.error("Error removing user from approvedPhotosFor list:", error);
    res.status(500).json({ message: "Server error" });
  }
};
