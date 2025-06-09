// controllers/blockController.js
const User = require("../models/User");

// @desc    Block a user
// @route   POST /api/blocks/block
// @access  Private
exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user.id;

    // Validate input
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Check if user exists
    const userToBlock = await User.findById(userId);
    if (!userToBlock) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is trying to block themselves
    if (userId === currentUserId) {
      return res.status(400).json({ message: "Cannot block yourself" });
    }

    // Get current user
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ message: "Current user not found" });
    }

    // Check if user is already blocked
    if (currentUser.blockedUsers && currentUser.blockedUsers.includes(userId)) {
      return res.status(400).json({ message: "User is already blocked" });
    }

    // Add user to blocked list
    await User.findByIdAndUpdate(
      currentUserId,
      { $addToSet: { blockedUsers: userId } },
      { new: true }
    );

    // Also add current user to the blocked user's blockedBy list (optional - for mutual blocking)
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { blockedBy: currentUserId } },
      { new: true }
    );

    res.json({ 
      message: "User blocked successfully",
      blockedUserId: userId 
    });
  } catch (error) {
    console.error("Block user error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Unblock a user
// @route   POST /api/blocks/unblock
// @access  Private
exports.unblockUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user.id;

    // Validate input
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Get current user
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ message: "Current user not found" });
    }

    // Check if user is actually blocked
    if (!currentUser.blockedUsers || !currentUser.blockedUsers.includes(userId)) {
      return res.status(400).json({ message: "User is not blocked" });
    }

    // Remove user from blocked list
    await User.findByIdAndUpdate(
      currentUserId,
      { $pull: { blockedUsers: userId } },
      { new: true }
    );

    // Also remove current user from the blocked user's blockedBy list
    await User.findByIdAndUpdate(
      userId,
      { $pull: { blockedBy: currentUserId } },
      { new: true }
    );

    res.json({ 
      message: "User unblocked successfully",
      unblockedUserId: userId 
    });
  } catch (error) {
    console.error("Unblock user error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get blocked users list
// @route   GET /api/blocks/blocked
// @access  Private
exports.getBlockedUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const currentUser = await User.findById(currentUserId)
      .populate('blockedUsers', 'firstName lastName profilePicture')
      .select('blockedUsers');

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(currentUser.blockedUsers || []);
  } catch (error) {
    console.error("Get blocked users error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
