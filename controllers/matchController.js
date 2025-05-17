const mongoose = require("mongoose");
const User = require("../models/User");
const Mosque = require("../models/Mosque");

// @desc    Find matches for a male user within a distance
// @route   GET /api/matches/search
// @access  Private
exports.findMatches = async (req, res) => {
  try {
    // Validate current user
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Determine target gender based on current user's role
    let targetRole;
    if (currentUser.role === "male") {
      targetRole = "female";
    } else if (currentUser.role === "female") {
      targetRole = "male";
    } else {
      return res
        .status(403)
        .json({ message: "Only males and females can search" });
    }

    // Validate distance parameter
    const distance = Math.min(Number(req.query.distance) || 20);
    if (distance > 500) {
      return res.status(400).json({ message: "Max distance 500 miles" });
    }

    // Validate attached mosques
    if (!currentUser.attachedMosques?.length) {
      return res.status(400).json({ message: "Attach mosques to search" });
    }

    // Convert miles to radians (Earth radius: 3958.8 miles)
    const radius = distance / 3958.8;

    // Build search conditions
    const searchConditions = currentUser.attachedMosques.map((mosque) => ({
      "attachedMosques.location": {
        $geoWithin: {
          $centerSphere: [
            // Validate coordinate order: [longitude, latitude]
            [mosque.location.coordinates[0], mosque.location.coordinates[1]],
            radius,
          ],
        },
      },
    }));

    // Execute search with validation
    const matches = await User.find({
      role: targetRole,
      $or: searchConditions,
    })
      .select("-password -managedMosques -approvedPhotosFor")
      .lean();

    // Add distance calculations to results
    const results = matches.map((match) => {
      const closest = match.attachedMosques.reduce((min, mosque) => {
        const dist = getDistance(
          currentUser.attachedMosques[0].location.coordinates,
          mosque.location.coordinates
        );
        return dist < min ? dist : min;
      }, Infinity);

      return { ...match, distance: Math.round(closest) };
    });

    res.json(results.sort((a, b) => a.distance - b.distance));
  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ message: "Search failed", error: err.message });
  }
};

// Haversine distance calculation
function getDistance([lon1, lat1], [lon2, lat2]) {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
// @desc    Get matches for a male user by mosque ID
// @route   GET /api/matches/mosque/:mosqueId
// @access  Private
exports.findMatchesByMosque = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const mosqueId = req.params.mosqueId;

    // Determine target role based on current user's role
    let targetRole;
    if (currentUser.role === "male") {
      targetRole = "female";
    } else if (currentUser.role === "female") {
      targetRole = "male";
    } else {
      return res
        .status(403)
        .json({ message: "Only males and females can search" });
    }

    // Find users of the opposite gender associated with the specified mosque ID
    const matches = await User.find({
      "attachedMosques.id": mosqueId,
      role: targetRole,
    }).select("-password");

    res.json(matches);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
