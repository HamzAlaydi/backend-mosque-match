const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUser,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const auth = require("../middleware/auth");
const {
  userRegisterValidation,
  userLoginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require("../utils/validation"); // Import validations
const upload = require("../middleware/upload");
const multer = require("multer");

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post(
  "/register",
  userRegisterValidation,
  upload.single("profilePicture"),
  registerUser
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

module.exports = router;
