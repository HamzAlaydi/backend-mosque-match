const mongoose = require("mongoose");
const User = require("../models/User"); // Import User model

// @desc    Get Imams
// @route   GET /api/imams
// @access  Private
exports.getImams = async (req, res) => {
  try {
    const imams = await User.find({ role: "imam" }).select("-password");
    res.json(imams);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get Imam by ID
// @route   GET /api/imams/:id
// @access  Private
exports.getImamById = async (req, res) => {
  try {
    const imam = await User.findById(req.params.id).select("-password");
    if (!imam) {
      return res.status(404).json({ message: "Imam not found" });
    }
    res.json(imam);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Approve a male user's verification request (Imam)
// @route   POST /api/imams/:imamId/verify-male/:maleId
// @access  Private
exports.approveMaleVerification = async (req, res) => {
  try {
    const imam = await User.findById(req.user.id);
    if (imam.role !== "imam") {
      return res.status(403).json({ message: "Only imams can verify males" });
    }

    const male = await User.findById(req.params.maleId);
    if (!male) {
      return res.status(404).json({ message: "Male user not found" });
    }

    if (male.role !== "male") {
      return res.status(400).json({ message: "User is not a male" });
    }
    if (!imam.managedMosques.includes(male.mosque)) {
      return res.status(400).json({
        message: "Male user is not associated with any mosque you manage",
      });
    }

    male.isVerified = true;
    await male.save();

    res.json({ message: "Male user verified successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Reject a male user's verification request (Imam)
// @route   DELETE /api/imams/:imamId/verify-male/:maleId
// @access  Private
exports.rejectMaleVerification = async (req, res) => {
  try {
    const imam = await User.findById(req.user.id);
    if (imam.role !== "imam") {
      return res
        .status(403)
        .json({ message: "Only imams can reject males verification" });
    }

    const male = await User.findById(req.params.maleId);
    if (!male) {
      return res.status(404).json({ message: "Male user not found" });
    }

    if (male.role !== "male") {
      return res.status(400).json({ message: "User is not a male" });
    }
    if (!imam.managedMosques.includes(male.mosque)) {
      return res.status(400).json({
        message: "Male user is not associated with any mosque you manage",
      });
    }
    male.isVerified = false;
    awaitmale.save();

    res.json({ message: "Male user verification rejected" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
