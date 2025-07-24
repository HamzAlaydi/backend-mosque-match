const mongoose = require("mongoose");
const User = require("../models/User");
const Mosque = require("../models/Mosque");

// @desc    Find matches for a user within a distance with filters
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
    const distance = Math.min(Number(req.query.distance) || 20, 500);

    // Validate attached mosques
    if (!currentUser.attachedMosques?.length) {
      return res.status(400).json({ message: "Attach mosques to search" });
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Convert miles to radians (Earth radius: 3958.8 miles)
    const radius = distance / 3958.8;

    // Extract filter parameters from query
    const {
      religiousness,
      maritalStatus,
      minAge,
      maxAge,
      hasChildren,
      childrenDesire,
      educationLevel,
      profession,
      willingToRelocate,
    } = req.query;

    // Build search conditions
    const searchConditions = currentUser.attachedMosques.map((mosque) => ({
      "attachedMosques.location": {
        $geoWithin: {
          $centerSphere: [
            [mosque.location.coordinates[0], mosque.location.coordinates[1]],
            radius,
          ],
        },
      },
    }));

    const filterConditions = {
      role: targetRole,
      $or: searchConditions,
      // Exclude blocked users and users who blocked current user
      _id: {
        $nin: [
          ...(currentUser.blockedUsers || []),
          ...(currentUser.blockedBy || []),
        ],
      },
    };

    // Add demographic filters if provided
    if (religiousness) {
      // Handle both array and string formats
      const religionValues = Array.isArray(religiousness)
        ? religiousness
        : religiousness.split(",").map((val) => val.toLowerCase());
      filterConditions.religiousness = { $in: religionValues };
    }

    if (maritalStatus) {
      const statusValues = Array.isArray(maritalStatus)
        ? maritalStatus
        : maritalStatus.split(",").map((val) => val.toLowerCase());
      filterConditions.maritalStatus = { $in: statusValues };
    }

    // Add age range filters
    const currentYear = new Date().getFullYear();
    let birthDateConditions = {};

    if (minAge) {
      const minBirthYear = currentYear - minAge;
      birthDateConditions.$lte = new Date(
        `${minBirthYear}-12-31T23:59:59.999Z`
      );
    }

    if (maxAge) {
      const maxBirthYear = currentYear - maxAge;
      birthDateConditions.$gte = new Date(
        `${maxBirthYear}-01-01T00:00:00.000Z`
      );
    }

    if (Object.keys(birthDateConditions).length > 0) {
      filterConditions.birthDate = birthDateConditions;
    }

    if (hasChildren) {
      const childrenValues = Array.isArray(hasChildren)
        ? hasChildren
        : hasChildren.split(",").map((val) => val.toLowerCase());
      filterConditions.hasChildren = { $in: childrenValues };
    }

    if (childrenDesire) {
      const desireValues = Array.isArray(childrenDesire)
        ? childrenDesire
        : childrenDesire.split(",").map((val) => val.toLowerCase());
      filterConditions.childrenDesire = { $in: desireValues };
    }

    if (educationLevel) {
      const educationValues = Array.isArray(educationLevel)
        ? educationLevel
        : educationLevel.split(",").map((val) => val.toLowerCase());
      filterConditions.educationLevel = { $in: educationValues };
    }

    if (profession) {
      const professionValues = Array.isArray(profession)
        ? profession
        : profession.split(",").map((val) => val.toLowerCase());
      filterConditions.profession = { $in: professionValues };
    }

    if (willingToRelocate !== undefined) {
      // Convert string 'true'/'false' to boolean
      filterConditions.willingToRelocate =
        willingToRelocate === "true" || willingToRelocate === true;
    }

    // Execute search with validation and pagination
    const matches = await User.find(filterConditions)
      .select("-password -managedMosques -blockedUsers -blockedBy")
      .skip(skip)
      .limit(limit)
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

      // Find action history for this match
      const action = (currentUser.userActionHistory || []).find(
        (a) => a.targetUserId && a.targetUserId.toString() === match._id.toString()
      ) || {};

      return {
        ...match,
        distance: Math.round(closest),
        photoRequested: !!action.photoRequested,
        waliRequested: !!action.waliRequested,
        messageSent: !!action.messageSent,
      };
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

// @desc    Get matches for a user by mosque ID with filters
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

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Extract filter parameters from query (same as findMatches)
    const {
      religiousness,
      maritalStatus,
      minAge,
      maxAge,
      hasChildren,
      childrenDesire,
      educationLevel,
      profession,
      willingToRelocate,
    } = req.query;

    // Build filter conditions
    const filterConditions = {
      "attachedMosques.id": mosqueId,
      role: targetRole,
      // Exclude blocked users and users who blocked current user
      _id: {
        $nin: [
          ...(currentUser.blockedUsers || []),
          ...(currentUser.blockedBy || []),
        ],
      },
    };

    // Add demographic filters if provided (same logic as findMatches)
    if (religiousness) {
      // Handle both array and string formats
      const religionValues = Array.isArray(religiousness)
        ? religiousness
        : religiousness.split(",").map((val) => val.toLowerCase());
      filterConditions.religiousness = { $in: religionValues };
    }

    if (maritalStatus) {
      const statusValues = Array.isArray(maritalStatus)
        ? maritalStatus
        : maritalStatus.split(",").map((val) => val.toLowerCase());
      filterConditions.maritalStatus = { $in: statusValues };
    }

    // Add age range filters
    const currentYear = new Date().getFullYear();
    let birthDateConditions = {};

    if (minAge) {
      const minBirthYear = currentYear - minAge;
      birthDateConditions.$lte = new Date(
        `${minBirthYear}-12-31T23:59:59.999Z`
      );
    }

    if (maxAge) {
      const maxBirthYear = currentYear - maxAge;
      birthDateConditions.$gte = new Date(
        `${maxBirthYear}-01-01T00:00:00.000Z`
      );
    }

    if (Object.keys(birthDateConditions).length > 0) {
      filterConditions.birthDate = birthDateConditions;
    }

    if (hasChildren) {
      const childrenValues = Array.isArray(hasChildren)
        ? hasChildren
        : hasChildren.split(",").map((val) => val.toLowerCase());
      filterConditions.hasChildren = { $in: childrenValues };
    }

    if (childrenDesire) {
      const desireValues = Array.isArray(childrenDesire)
        ? childrenDesire
        : childrenDesire.split(",").map((val) => val.toLowerCase());
      filterConditions.childrenDesire = { $in: desireValues };
    }

    if (educationLevel) {
      const educationValues = Array.isArray(educationLevel)
        ? educationLevel
        : educationLevel.split(",").map((val) => val.toLowerCase());
      filterConditions.educationLevel = { $in: educationValues };
    }

    if (profession) {
      const professionValues = Array.isArray(profession)
        ? profession
        : profession.split(",").map((val) => val.toLowerCase());
      filterConditions.profession = { $in: professionValues };
    }

    if (willingToRelocate !== undefined) {
      // Convert string 'true'/'false' to boolean
      filterConditions.willingToRelocate =
        willingToRelocate === "true" || willingToRelocate === true;
    }

    // Execute search with filters and pagination
    const matches = await User.find(filterConditions)
      .select("-password -managedMosques -blockedUsers -blockedBy")
      .skip(skip)
      .limit(limit)
      .lean();

    res.json(matches.map((match) => {
      // Find action history for this match
      const action = (currentUser.userActionHistory || []).find(
        (a) => a.targetUserId && a.targetUserId.toString() === match._id.toString()
      ) || {};
      return {
        ...match,
        photoRequested: !!action.photoRequested,
        waliRequested: !!action.waliRequested,
        messageSent: !!action.messageSent,
      };
    }));
  } catch (err) {
    console.error("Mosque search error:", err);
    res.status(500).json({ message: "Search failed", error: err.message });
  }
};

exports.saveMosqueSelection = async (req, res) => {
  try {
    const { selectedMosques } = req.body;
    const userId = req.user.id;

    await User.findByIdAndUpdate(userId, {
      savedMosqueSelection: selectedMosques,
    });

    res.json({ message: "Mosque selection saved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.loadMosqueSelection = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ savedMosques: user.savedMosqueSelection || [] });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
