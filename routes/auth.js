const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUser,
  verifyEmail,
  resendVerification,
} = require("../controllers/authController");
const auth = require("../middleware/auth");
const {
  userRegisterValidation,
  userLoginValidation,
} = require("../utils/validation"); // Import validations

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post("/register", userRegisterValidation, registerUser);

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


module.exports = router;
