const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

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
  console.log(req.body);
  // Validate user input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, role } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Create new user
    user = new User({
      email,
      password, // Password will be hashed in the model
      role,
      // Include other fields based on the role
      ...(role === "female" && {
        wali: req.body.wali,
        hijab: req.body.hijab,
      }),
      ...(role === "male" && {
        beard: req.body.beard,
      }),
      ...(role === "imam" && {
        phone: req.body.phone,
        mosque: req.body.mosque, //  Imam assigns to mosque.
        languages: req.body.languages,
        messageToCommunity: req.body.messageToCommunity,
      }),
    });

    await user.save();

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    }); // Return token and user
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  // Validate user input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get logged in user data
// @route   GET /api/auth/user
// @access  Private
exports.getUser = async (req, res) => {
  try {
    // req.user is populated by the auth middleware
    const user = await User.findById(req.user.id).select("-password"); // Exclude password
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
