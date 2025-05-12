const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const User = require("../models/User");

// @desc    Get chat messages between two users
// @route   GET /api/chats/:userId
// @access  Private
exports.getChatMessages = async (req, res) => {
  try {
    const userId1 = req.user.id;
    const userId2 = req.params.userId;

    // Find chat messages between the two users, sorted by timestamp
    const messages = await Chat.find({
      $or: [
        { sender: userId1, receiver: userId2 },
        { sender: userId2, receiver: userId1 },
      ],
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Send a new chat message
// @route   POST /api/chats/send
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const senderId = req.user.id;

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    const newMessage = new Chat({
      sender: senderId,
      receiver: receiverId,
      text,
      timestamp: Date.now(),
    });

    await newMessage.save();

    // Emit the message to the receiver using Socket.IO
    const io = req.app.get("io"); // Get the Socket.IO instance
    io.to(receiverId).emit("message", newMessage); // Emit to a specific user (using their ID as room)

    res.status(201).json(newMessage);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Request photo access from another user
// @route   POST /api/chats/request-photo/:userId
// @access  Private
exports.requestPhotoAccess = async (req, res) => {
  try {
    const senderId = req.user.id;
    const receiverId = req.params.userId;

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    // Emit the photo request to the receiver using Socket.IO
    const io = req.app.get("io");
    io.to(receiverId).emit("photoRequest", { senderId });

    res.json({ message: "Photo access request sent" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Approve photo access request
// @route   POST /api/chats/approve-photo/:userId
// @access  Private
exports.approvePhotoAccess = async (req, res) => {
  try {
    const approverId = req.user.id;
    const requesterId = req.params.userId;

    const requester = await User.findById(requesterId);
    if (!requester) {
      return res.status(404).json({ message: "Requester not found" });
    }

    // Find the user who is approving the request
    const approvingUser = await User.findById(approverId);

    approvingUser.approvedPhotosFor.push(requesterId); // Store the user ID of who they approved.
    await approvingUser.save();

    // Emit the photo access approval to the requester using Socket.IO
    const io = req.app.get("io");
    io.to(requesterId).emit("photoAccessApproved", { approverId });

    res.json({ message: "Photo access approved" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
