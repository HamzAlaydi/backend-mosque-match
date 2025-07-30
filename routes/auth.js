const express = require("express");
const router = express.Router();
const {
  registerUser,
  registerImam,
  loginUser,
  getUser,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  checkEmail,
} = require("../controllers/authController");
const auth = require("../middleware/auth");
const {
  userRegisterValidation,
  imamSignupValidation,
  userLoginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require("../utils/validation"); // Import validations
const upload = require("../middleware/upload");
const multer = require("multer");
const parseJsonFields = require("../middleware/parseJsonFields");
const parseBooleanFields = require("../middleware/parseBooleanFields");

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post(
  "/register",
  upload.single("profilePicture"),
  parseJsonFields(["wali", "attachedMosques"]),
  parseBooleanFields([
    "terms",
    "isRevert",
    "keepsHalal",
    "willingToRelocate",
    "smokes",
    "drinks",
    "disability",
    "hasBeard",
    "wearsHijab",
    "blurPhotoForEveryone",
  ]),
  userRegisterValidation,
  registerUser
);

// @route   POST /api/auth/imam-signup
// @desc    Register imam
// @access  Public
router.post(
  "/imam-signup",
  upload.single("profilePicture"),
  parseJsonFields(["languages", "attachedMosques"]),
  parseBooleanFields(["blurPhotoForEveryone"]),
  imamSignupValidation,
  registerImam
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", userLoginValidation, loginUser);

// @route   GET /api/auth/user
// @desc    Get current user
// @access  Private
router.get("/user", auth, getUser);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
// Password reset routes
router.post("/forgot-password", forgotPasswordValidation, forgotPassword);
router.post("/reset-password", resetPasswordValidation, resetPassword);

// @route   POST /api/auth/check-email
// @desc    Check if email exists
// @access  Public
router.post("/check-email", checkEmail);

module.exports = router;
