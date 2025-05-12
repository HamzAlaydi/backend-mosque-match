const mongoose = require("mongoose");
const User = require("../models/User");
const Mosque = require("../models/Mosque");

// @desc    Find matches for a male user within a distance
// @route   GET /api/matches/search
// @access  Private
exports.findMatches = async (req, res) => {
  try {
    const male = await User.findById(req.user.id).populate("mosque"); // Populate the mosque field
    if (male.role !== "male") {
      return res
        .status(400)
        .json({ message: "Only males can search for matches" });
    }

    const { distance } = req.query; // Distance in kilometers
    if (!distance) {
      return res.status(400).json({ message: "Distance is required" });
    }
    const userLocation = male.location;

    // Find mosques within the specified distance
    const nearbyMosques = await Mosque.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: userLocation.coordinates,
          },
          $maxDistance: distance * 1000, // Convert km to meters
        },
      },
    });

    // Get females associated with those mosques
    let femaleIds = [];
    nearbyMosques.forEach((mosque) => {
      femaleIds = femaleIds.concat(mosque.females);
    });

    const females = await User.find({
      _id: { $in: femaleIds },
      role: "female",
    }).select("-password");

    res.json(females);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get matches for a male user by mosque ID
// @route   GET /api/matches/mosque/:mosqueId
// @access  Private
exports.findMatchesByMosque = async (req, res) => {
  try {
    const male = await User.findById(req.user.id);
    if (male.role !== "male") {
      return res
        .status(400)
        .json({ message: "Only males can search for matches" });
    }
    const mosqueId = req.params.mosqueId;

    const mosque = await Mosque.findById(mosqueId);
    if (!mosque) {
      return res.status(404).json({ message: "Mosque not found" });
    }
    // Find females associated with the specified mosque
    const females = await User.find({
      mosque: mosqueId,
      role: "female",
    }).select("-password");

    res.json(females);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
