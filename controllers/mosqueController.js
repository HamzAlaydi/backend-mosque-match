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
    const mosques = await Mosque.find().select("-imams -imamRequests -females");

    // Transform to match frontend format
    const formattedMosques = mosques.map((mosque) => ({
      id: mosque.externalId || mosque._id,
      name: mosque.name,
      location: {
        lat: mosque.location.coordinates[1], // latitude
        lng: mosque.location.coordinates[0], // longitude
      },
      address: mosque.address,
      rating: mosque.rating,
      reviewCount: mosque.reviewCount,
    }));

    res.json(formattedMosques);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get mosques by location (within radius)
// @route   GET /api/mosques/nearby
// @access  Public
exports.getMosquesNearby = async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query; // radius in miles

    if (!lat || !lng) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude are required" });
    }

    const radiusInMeters = radius * 1609.34; // Convert miles to meters

    const mosques = await Mosque.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: radiusInMeters,
        },
      },
    }).select("-imams -imamRequests -females");

    // Transform to match frontend format
    const formattedMosques = mosques.map((mosque) => ({
      id: mosque.externalId || mosque._id,
      name: mosque.name,
      location: {
        lat: mosque.location.coordinates[1],
        lng: mosque.location.coordinates[0],
      },
      address: mosque.address,
      rating: mosque.rating,
      reviewCount: mosque.reviewCount,
    }));

    res.json(formattedMosques);
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
    const mosque = await Mosque.findById(req.params.id)
      .populate("imams", "firstName lastName email")
      .populate("females", "firstName lastName email");

    if (!mosque) {
      return res.status(404).json({ message: "Mosque not found" });
    }

    res.json(mosque);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Create a new mosque
// @route   POST /api/mosques
// @access  Private (Super Admin only)
exports.createMosque = async (req, res) => {
  try {
    const { name, address, location, externalId } = req.body;

    // Check if mosque already exists
    const existingMosque = await Mosque.findOne({
      $or: [{ name }, { externalId: externalId }],
    });

    if (existingMosque) {
      return res.status(400).json({ message: "Mosque already exists" });
    }

    const mosque = new Mosque({
      name,
      address,
      externalId,
      location: {
        type: "Point",
        coordinates: [location.lng, location.lat],
      },
    });

    await mosque.save();

    res.status(201).json({
      message: "Mosque created successfully",
      mosque: {
        id: mosque._id,
        name: mosque.name,
        address: mosque.address,
        location: {
          lat: mosque.location.coordinates[1],
          lng: mosque.location.coordinates[0],
        },
      },
    });
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
