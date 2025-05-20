const mongoose = require("mongoose");
const Interest = require("../models/Interest");
const User = require("../models/User"); // Import the User model
const Notification = require("../models/Notification");
// @desc    Add a female to a male user's interest list
// @route   POST /api/interests/add
// @access  Private
exports.addToInterestList = async (req, res) => {
  try {
    const maleId = req.user.id;
    const femaleId = req.body.femaleId;

    // Check if the users exist and are of the correct role
    const male = await User.findById(maleId);
    const female = await User.findById(femaleId);

    if (!male || male.role !== "male") {
      return res.status(400).json({ message: "Invalid male user" });
    }
    if (!female || female.role !== "female") {
      return res.status(400).json({ message: "Invalid female user" });
    }

    // Check if the interest entry already exists
    const existingInterest = await Interest.findOne({ maleId, femaleId });
    if (existingInterest) {
      return res.status(400).json({ message: "Interest already recorded" });
    }

    const newInterest = new Interest({
      maleId,
      femaleId,
    });

    await newInterest.save();

    // Create notification for the female user
    // Create notification
    const newNotification = new Notification({
      userId: femaleId,
      type: "interest",
      fromUserId: maleId,
      content: `${male.firstName} has shown interest in your profile`,
      isRead: false,
    });

    await newNotification.save();

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      const apiNamespace = io.of("/api"); // Get the /api namespace
      apiNamespace.to(femaleId.toString()).emit("newNotification", {
        // Emit to the /api namespace
        _id: newNotification._id,
        userId: femaleId,
        type: "interest",
        fromUserId: maleId,
        content: newNotification.content,
        isRead: false,
        createdAt: newNotification.createdAt,
      });
    }

    res.status(201).json({ message: "Interest added successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Remove a female from a male user's interest list
// @route   POST /api/interests/remove
// @access  Private
exports.removeFromInterestList = async (req, res) => {
  try {
    const maleId = req.user.id;
    const femaleId = req.body.femaleId;

    // Check if the users exist
    const male = await User.findById(maleId);
    const female = await User.findById(femaleId);

    if (!male || male.role !== "male") {
      return res.status(400).json({ message: "Invalid male user" });
    }
    if (!female || female.role !== "female") {
      return res.status(400).json({ message: "Invalid female user" });
    }

    const result = await Interest.deleteOne({ maleId, femaleId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Interest not found" });
    }

    res.json({ message: "Interest removed successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get the interest list for the logged-in male user
// @route   GET /api/interests
// @access  Private
exports.getUserInterestList = async (req, res) => {
  try {
    const maleId = req.user.id;

    // Find all interests where the logged-in user is the maleId
    const interests = await Interest.find({ maleId }).populate(
      "femaleId",
      "-password"
    ); // Populate the femaleId and exclude the password

    // Extract the female users from the interest list
    const females = interests.map((interest) => interest.femaleId);

    res.json(females);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
