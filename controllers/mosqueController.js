const mongoose = require("mongoose");
const Mosque = require("../models/Mosque");
const User = require("../models/User"); // Import User model
const { validationResult } = require("express-validator");
const { createMosqueValidation } = require("../utils/validation");

// @desc    Get all mosques
// @route   GET /api/mosques
// @access  Public
exports.getAllMosques = async (req, res) => {
  try {
    const mosques = await Mosque.find();
    res.json(mosques);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Create a new mosque (Imam or Super Admin)
// @route   POST /api/mosques
// @access  Private
exports.createMosque = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { name, location, address } = req.body;

    // Check if mosque exists
    let mosque = await Mosque.findOne({ name });
    if (mosque) {
      return res.status(400).json({ message: "Mosque already exists" });
    }

    // Create new mosque
    mosque = new Mosque({
      name,
      location, // { type: 'Point', coordinates: [longitude, latitude] }
      address,
    });

    await mosque.save();
    res.status(201).json(mosque);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get mosque by ID
// @route   GET /api/mosques/:id
// @access  Public
exports.getMosqueById = async (req, res) => {
  try {
    const mosque = await Mosque.findById(req.params.id);
    if (!mosque) {
      return res.status(404).json({ message: "Mosque not found" });
    }
    res.json(mosque);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Request to manage a mosque (Imam)
// @route   POST /api/mosques/:mosqueId/request-manage
// @access  Private
exports.requestManageMosque = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== "imam") {
      return res
        .status(403)
        .json({ message: "Only imams can request to manage mosques" });
    }

    const mosque = await Mosque.findById(req.params.mosqueId);
    if (!mosque) {
      return res.status(404).json({ message: "Mosque not found" });
    }

    // Check if the imam is already managing this mosque or has requested before
    if (
      mosque.imams.includes(user.id) ||
      mosque.imamRequests.includes(user.id)
    ) {
      return res.status(400).json({
        message: "Request already sent or Imam already manages this mosque",
      });
    }
    mosque.imamRequests.push(user.id); // Add imam's ID to the mosque's imamRequests array
    await mosque.save();

    //send notification to super admin
    const io = req.app.get("io"); // Get the Socket.IO instance
    io.emit("imamRequest", { mosqueId: mosque._id, imamId: user._id });

    res.json({ message: "Request to manage mosque sent" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Approve Imam's request to manage a mosque (Super Admin)
// @route   POST /api/mosques/:mosqueId/approve-imam/:imamId
// @access  Private
exports.approveImamRequest = async (req, res) => {
  try {
    const superAdmin = await User.findById(req.user.id);
    if (superAdmin.role !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Only super admins can approve imam requests" });
    }

    const mosque = await Mosque.findById(req.params.mosqueId);
    if (!mosque) {
      return res.status(404).json({ message: "Mosque not found" });
    }

    const imamId = req.params.imamId;
    // Check if the imam has requested to manage this mosque
    if (!mosque.imamRequests.includes(imamId)) {
      return res
        .status(400)
        .json({ message: "Imam has not requested to manage this mosque" });
    }

    // Add the imam to the mosque's imams array and remove from requests
    mosque.imams.push(imamId);
    mosque.imamRequests = mosque.imamRequests.filter(
      (id) => id.toString() !== imamId
    ); // Remove the imamId
    await mosque.save();

    // Also update the user role.
    await User.findByIdAndUpdate(imamId, {
      $addToSet: { managedMosques: mosque._id },
    });

    res.json({ message: "Imam approved to manage mosque" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get females attached to a mosque
// @route   GET /api/mosques/:mosqueId/females
// @access  Private
exports.getFemalesInMosque = async (req, res) => {
  try {
    const mosque = await Mosque.findById(req.params.mosqueId);
    if (!mosque) {
      return res.status(404).json({ message: "Mosque not found" });
    }

    // Find females associated with the mosque.
    const females = await User.find({
      role: "female",
      mosque: req.params.mosqueId, // Filter by the mosque ID
    }).select("-password");

    res.json(females);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
