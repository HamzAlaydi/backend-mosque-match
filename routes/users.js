const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  updateUserProfile,
  updateProfilePicture,
  requestUnblur,
  approveUnblur,
  getUserById,
} = require("../controllers/userController");
const roles = require("../middleware/roles");
const upload = require("../middleware/upload");
const { userUpdateValidation } = require("../utils/validation");

// @route   patch /api/users/profile
// @desc    Update user profile
// @access  Private
router.patch("/profile", auth, userUpdateValidation, updateUserProfile);
// @route   PUT /api/users/profile/picture
// @desc    Update user profile picture
// @access  Private
router.put(
  "/profile/picture",
  auth,
  upload.single("profilePicture"),
  updateProfilePicture
);

// @route   POST /api/users/profile/picture/unblur
// @desc    Request to unblur profile picture
// @access  Private
router.post("/profile/picture/unblur", auth, requestUnblur);

// @route   POST /api/users/profile/picture/unblur/:userId
// @desc    Approve profile picture unblur request
// @access  Private (only for Imams)
router.post(
  "/profile/picture/unblur/:userId",
  auth,
  roles(["imam", "superadmin"]),
  approveUnblur
);

// @route   GET /api/users/:id
// @desc    Get user profile by ID
// @access  Private
router.get("/:id", auth, getUserById);

module.exports = router;
