const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const User = require("../models/User");
const Notification = require("../models/Notification");
const socketService = require("../services/socketService");

// @desc    Get all chats for a user
// @route   GET /api/chats
// @access  Private
exports.getChatList = async (req, res) => {
  try {
    const userId = req.user.id;

    // Aggregate to get chat list with participant details and last message
    const chatList = await Chat.aggregate([
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId(userId) },
            { receiver: new mongoose.Types.ObjectId(userId) },
          ],
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", new mongoose.Types.ObjectId(userId)] },
              "$receiver",
              "$sender",
            ],
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiver", new mongoose.Types.ObjectId(userId)] },
                    { $eq: ["$isRead", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "otherUser",
        },
      },
      {
        $unwind: "$otherUser",
      },
      {
        $project: {
          _id: { $toString: "$_id" },
          participants: [
            {
              _id: { $toString: "$otherUser._id" },
              firstName: "$otherUser.firstName",
              lastName: "$otherUser.lastName",
              profilePicture: "$otherUser.profilePicture",
              gender: "$otherUser.gender",
              birthDate: "$otherUser.birthDate",
              currentLocation: "$otherUser.currentLocation",
            },
          ],
          lastMessage: {
            _id: { $toString: "$lastMessage._id" },
            sender: { $toString: "$lastMessage.sender" },
            receiver: { $toString: "$lastMessage.receiver" },
            text: "$lastMessage.text",
            timestamp: "$lastMessage.timestamp",
            isRead: "$lastMessage.isRead",
          },
          unreadCount: 1,
        },
      },
      {
        $sort: { "lastMessage.timestamp": -1 },
      },
    ]);

    // Update user's online status
    try {
      if (socketService.getIO()) {
        socketService.emitUserStatusUpdate(userId, {
          status: "online",
          lastSeen: new Date(),
        });
      }
    } catch (socketError) {
      console.error("Socket status update error:", socketError);
    }

    res.json(chatList);
  } catch (err) {
    console.error("Get chat list error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get chat messages between two users
// @route   GET /api/chats/:userId
// @access  Private
exports.getChatMessages = async (req, res) => {
  try {
    const userId1 = req.user.id;
    const userId2 = req.params.userId;

    // Validate userId2
    if (!mongoose.Types.ObjectId.isValid(userId2)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Check if the other user exists
    const otherUser = await User.findById(userId2);
    if (!otherUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get existing messages between the users
    const messages = await Chat.find({
      $or: [
        { sender: userId1, receiver: userId2 },
        { sender: userId2, receiver: userId1 },
      ],
    })
      .sort({ timestamp: 1 })
      .populate("sender", "firstName lastName profilePicture")
      .populate("receiver", "firstName lastName profilePicture");

    // Mark messages as read and emit socket event
    const unreadMessages = await Chat.find({
      sender: userId2,
      receiver: userId1,
      isRead: false,
    });

    if (unreadMessages.length > 0) {
      await Chat.updateMany(
        { sender: userId2, receiver: userId1, isRead: false },
        { isRead: true }
      );

      // Emit read receipt to the sender
      try {
        socketService.emitMessagesRead(userId2, {
          readBy: userId1,
          chatWith: userId2,
          readCount: unreadMessages.length,
          messageIds: unreadMessages.map((msg) => msg._id.toString()),
        });
      } catch (socketError) {
        console.error("Socket emission error for messages read:", socketError);
      }
    }

    res.json(messages);
  } catch (err) {
    console.error("Get chat messages error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Send a new chat message
// @route   POST /api/chats/send
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const senderId = req.user.id;

    console.log("Send message request:", { senderId, receiverId, text });

    // Validation
    if (!receiverId || !text || !text.trim()) {
      return res
        .status(400)
        .json({ message: "Receiver ID and message text are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid receiver ID" });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    // Get sender details for notification
    const sender = await User.findById(senderId);

    // Prevent sending message to self
    if (senderId === receiverId) {
      return res
        .status(400)
        .json({ message: "Cannot send message to yourself" });
    }

    const newMessage = new Chat({
      sender: senderId,
      receiver: receiverId,
      text: text.trim(),
      timestamp: new Date(),
      isRead: false,
    });

    await newMessage.save();

    await newMessage.populate([
      { path: "sender", select: "firstName lastName profilePicture" },
      { path: "receiver", select: "firstName lastName profilePicture" },
    ]);

    console.log("Message saved and populated:", newMessage);

    // Create notification for the receiver
    const newNotification = new Notification({
      userId: receiverId,
      type: "message",
      fromUserId: senderId,
      content: `${sender.firstName} sent you a message: ${
        text.trim().length > 50
          ? text.trim().substring(0, 50) + "..."
          : text.trim()
      }`,
      isRead: false,
    });

    await newNotification.save();

    // Emit the message to both users using Socket.IO
    try {
      socketService.emitNewMessage(senderId, receiverId, newMessage);

      const roomId = [senderId, receiverId].sort().join("_");
      socketService.emitToRoom(roomId, "newMessage", newMessage);

      // Emit notification to receiver
      const io = req.app.get("io");
      if (io) {
        const apiNamespace = io.of("/api");
        apiNamespace.to(receiverId.toString()).emit("newNotification", {
          _id: newNotification._id,
          userId: receiverId,
          type: "message",
          fromUserId: senderId,
          content: newNotification.content,
          isRead: false,
          createdAt: newNotification.createdAt,
        });
      }

      console.log("Message emitted via socket to:", {
        receiverId,
        senderId,
        roomId,
      });
    } catch (socketError) {
      console.error("Socket emission error:", socketError);
    }

    res.status(201).json(newMessage);
  } catch (err) {
    console.error("Send message error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/chats/:userId/read
// @access  Private
exports.markMessagesAsRead = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Get unread messages before marking them as read
    const unreadMessages = await Chat.find({
      sender: otherUserId,
      receiver: currentUserId,
      isRead: false,
    });

    // Mark all messages from otherUser to currentUser as read
    const result = await Chat.updateMany(
      {
        sender: otherUserId,
        receiver: currentUserId,
        isRead: false,
      },
      { isRead: true }
    );

    // Emit read receipt to the other user with message IDs
    try {
      socketService.emitMessagesRead(otherUserId, {
        readBy: currentUserId,
        chatWith: otherUserId,
        readCount: result.modifiedCount,
        messageIds: unreadMessages.map((msg) => msg._id.toString()),
        timestamp: new Date(),
      });

      // Also emit to chat room
      const roomId = [currentUserId, otherUserId].sort().join("_");
      socketService.emitToRoom(roomId, "messagesRead", {
        readBy: currentUserId,
        chatWith: otherUserId,
        readCount: result.modifiedCount,
      });
    } catch (socketError) {
      console.error("Socket emission error:", socketError);
    }

    res.json({
      message: "Messages marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("Mark messages as read error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Request photo access from another user
// @route   POST /api/chats/request-photo/:userId
// @access  Private
exports.requestPhotoAccess = async (req, res) => {
  try {
    const senderId = req.user.id;
    const receiverId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    const sender = await User.findById(senderId).select(
      "firstName lastName profilePicture"
    );

    // Create notification for photo request
    const newNotification = new Notification({
      userId: receiverId,
      type: "photo_request",
      fromUserId: senderId,
      content: `${sender.firstName} ${sender.lastName} has requested access to your photos`,
      isRead: false,
    });

    await newNotification.save();

    const photoRequestData = {
      senderId,
      senderInfo: sender,
      receiverId,
      message: `${sender.firstName} ${sender.lastName} has requested access to your photos`,
      timestamp: new Date(),
      type: "photo_request",
    };

    // Emit the photo request to the receiver using Socket.IO
    try {
      socketService.emitPhotoRequest(receiverId, photoRequestData);

      // Also emit to receiver's personal room
      socketService.emitToRoom(receiverId, "photoRequest", photoRequestData);

      // Emit notification
      const io = req.app.get("io");
      if (io) {
        const apiNamespace = io.of("/api");
        apiNamespace.to(receiverId.toString()).emit("newNotification", {
          _id: newNotification._id,
          userId: receiverId,
          type: "photo_request",
          fromUserId: senderId,
          content: newNotification.content,
          isRead: false,
          createdAt: newNotification.createdAt,
        });
      }

      console.log("Photo request emitted:", photoRequestData);
    } catch (socketError) {
      console.error("Socket emission error:", socketError);
    }

    res.json({
      message: "Photo access request sent",
      data: photoRequestData,
    });
  } catch (err) {
    console.error("Request photo access error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Approve photo access request
// @route   POST /api/chats/approve-photo/:userId
// @access  Private
exports.approvePhotoAccess = async (req, res) => {
  try {
    const approverId = req.user.id;
    const requesterId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(requesterId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const requester = await User.findById(requesterId);
    if (!requester) {
      return res.status(404).json({ message: "Requester not found" });
    }

    // Find the user who is approving the request
    const approvingUser = await User.findById(approverId);

    // Add to approved list if not already there
    if (!approvingUser.approvedPhotosFor.includes(requesterId)) {
      approvingUser.approvedPhotosFor.push(requesterId);
      await approvingUser.save();
    }

    // Create notification for photo approval
    const newNotification = new Notification({
      userId: requesterId,
      type: "photo_approval",
      fromUserId: approverId,
      content: `${approvingUser.firstName} ${approvingUser.lastName} has approved your photo access request`,
      isRead: false,
    });

    await newNotification.save();

    const approvalData = {
      approverId,
      approverInfo: {
        _id: approvingUser._id,
        firstName: approvingUser.firstName,
        lastName: approvingUser.lastName,
        profilePicture: approvingUser.profilePicture,
      },
      requesterId,
      message: `${approvingUser.firstName} ${approvingUser.lastName} has approved your photo access request`,
      timestamp: new Date(),
      type: "photo_approval",
    };

    // Emit the photo access approval to the requester using Socket.IO
    try {
      socketService.emitPhotoAccessApproved(requesterId, approvalData);

      // Also emit to requester's personal room
      socketService.emitToRoom(
        requesterId,
        "photoAccessApproved",
        approvalData
      );

      // Emit notification
      const io = req.app.get("io");
      if (io) {
        const apiNamespace = io.of("/api");
        apiNamespace.to(requesterId.toString()).emit("newNotification", {
          _id: newNotification._id,
          userId: requesterId,
          type: "photo_approval",
          fromUserId: approverId,
          content: newNotification.content,
          isRead: false,
          createdAt: newNotification.createdAt,
        });
      }

      console.log("Photo approval emitted:", approvalData);
    } catch (socketError) {
      console.error("Socket emission error:", socketError);
    }

    res.json({
      message: "Photo access approved",
      data: approvalData,
    });
  } catch (err) {
    console.error("Approve photo access error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a message
// @route   DELETE /api/chats/message/:messageId
// @access  Private
exports.deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }

    const message = await Chat.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only allow sender to delete their own messages
    if (message.sender.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this message" });
    }

    const deletionData = {
      messageId,
      deletedBy: userId,
      timestamp: new Date(),
    };

    await Chat.findByIdAndDelete(messageId);

    // Emit message deletion to both users and chat room
    try {
      socketService.emitMessageDeleted(
        message.receiver.toString(),
        deletionData
      );
      socketService.emitMessageDeleted(message.sender.toString(), deletionData);

      // Emit to chat room
      const roomId = [message.sender.toString(), message.receiver.toString()]
        .sort()
        .join("_");
      socketService.emitToRoom(roomId, "messageDeleted", deletionData);

      console.log("Message deletion emitted:", deletionData);
    } catch (socketError) {
      console.error("Socket emission error:", socketError);
    }

    res.json({
      message: "Message deleted successfully",
      data: deletionData,
    });
  } catch (err) {
    console.error("Delete message error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get online users
// @route   GET /api/chats/online-users
// @access  Private
exports.getOnlineUsers = async (req, res) => {
  try {
    const onlineUsers = socketService.getConnectedUsers();
    res.json(onlineUsers);
  } catch (err) {
    console.error("Get online users error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update typing status
// @route   POST /api/chats/typing
// @access  Private
exports.updateTypingStatus = async (req, res) => {
  try {
    const { receiverId, isTyping } = req.body;
    const senderId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid receiver ID" });
    }

    const sender = await User.findById(senderId).select(
      "firstName lastName profilePicture"
    );

    const roomId = [senderId, receiverId].sort().join("_");

    try {
      socketService.emitTypingStatus(roomId, senderId, isTyping, sender);

      // Also emit directly to receiver
      const event = isTyping ? "userTyping" : "userStoppedTyping";
      const typingData = {
        userId: senderId,
        userInfo: isTyping ? sender : undefined,
        chatRoomId: roomId,
      };

      socketService.emitToRoom(receiverId, event, typingData);
    } catch (socketError) {
      console.error("Socket emission error:", socketError);
    }

    res.json({ message: "Typing status updated" });
  } catch (err) {
    console.error("Update typing status error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Request photo access with chat message
// @route   POST /api/chats/request-photo/:userId
// @access  Private
exports.requestPhotoAccessWithMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const receiverId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    const sender = await User.findById(senderId).select(
      "firstName lastName profilePicture"
    );

    // Create a special chat message for photo request
    const photoRequestMessage = new Chat({
      sender: senderId,
      receiver: receiverId,
      text: `${sender.firstName} has requested access to your profile photos. Please respond below.`,
      timestamp: new Date(),
      isRead: false,
      messageType: "photo_request",
      photoRequestData: {
        requesterId: senderId,
        status: "pending",
      },
    });

    await photoRequestMessage.save();

    await photoRequestMessage.populate([
      { path: "sender", select: "firstName lastName profilePicture" },
      { path: "receiver", select: "firstName lastName profilePicture" },
    ]);

    // Create notification
    const newNotification = new Notification({
      userId: receiverId,
      type: "photo_request",
      fromUserId: senderId,
      content: `${sender.firstName} ${sender.lastName} has requested access to your photos`,
      isRead: false,
    });

    await newNotification.save();

    // Emit the message and notification via socket
    try {
      socketService.emitNewMessage(senderId, receiverId, photoRequestMessage);

      const roomId = [senderId, receiverId].sort().join("_");
      socketService.emitToRoom(roomId, "newMessage", photoRequestMessage);

      // Emit notification
      const io = req.app.get("io");
      if (io) {
        const apiNamespace = io.of("/api");
        apiNamespace.to(receiverId.toString()).emit("newNotification", {
          _id: newNotification._id,
          userId: receiverId,
          type: "photo_request",
          fromUserId: senderId,
          content: newNotification.content,
          isRead: false,
          createdAt: newNotification.createdAt,
        });
      }

      console.log("Photo request message sent:", photoRequestMessage);
    } catch (socketError) {
      console.error("Socket emission error:", socketError);
    }

    res.status(201).json({
      message: "Photo request sent successfully",
      data: photoRequestMessage,
    });
  } catch (err) {
    console.error("Request photo access error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Respond to photo request
// @route   POST /api/chats/respond-photo/:userId
// @access  Private
exports.respondToPhotoRequest = async (req, res) => {
  try {
    const responderId = req.user.id;
    const requesterId = req.params.userId;
    const { response, originalMessageId } = req.body; // Accept originalMessageId from frontend

    if (!["accept", "deny", "later"].includes(response)) {
      return res.status(400).json({
        message: "Invalid response. Must be 'accept', 'deny', or 'later'",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(requesterId)) {
      return res.status(400).json({ message: "Invalid requester ID" });
    }

    // Validate originalMessageId if provided
    if (
      originalMessageId &&
      !mongoose.Types.ObjectId.isValid(originalMessageId)
    ) {
      return res.status(400).json({ message: "Invalid original message ID" });
    }

    const requester = await User.findById(requesterId);
    const responder = await User.findById(responderId);

    if (!requester || !responder) {
      return res.status(404).json({ message: "User not found" });
    }

    let responseMessage = "";
    let shouldUpdateAccess = false;

    switch (response) {
      case "accept":
        responseMessage = `${responder.firstName} has accepted your photo request. You can now view their photos.`;
        shouldUpdateAccess = true;
        break;
      case "deny":
        responseMessage = `${responder.firstName} has declined your photo request.`;
        break;
      case "later":
        responseMessage = `${responder.firstName} will respond to your photo request later.`;
        break;
    }

    // Update approvedPhotosFor array if accepted
    if (shouldUpdateAccess) {
      await User.findByIdAndUpdate(responderId, {
        $addToSet: { approvedPhotosFor: requesterId },
      });
    }

    // Create response message
    const responseChat = new Chat({
      sender: responderId,
      receiver: requesterId,
      text: responseMessage,
      timestamp: new Date(),
      isRead: false,
      messageType: "photo_response",
      photoResponseData: {
        originalRequesterId: requesterId,
        originalMessageId: originalMessageId, // Store the original message ID
        response: response,
        responderId: responderId,
      },
    });

    await responseChat.save();

    await responseChat.populate([
      { path: "sender", select: "firstName lastName profilePicture" },
      { path: "receiver", select: "firstName lastName profilePicture" },
    ]);

    // Create notification
    const newNotification = new Notification({
      userId: requesterId,
      type: "photo_response",
      fromUserId: responderId,
      content: responseMessage,
      isRead: false,
    });

    await newNotification.save();

    // Emit via socket
    try {
      socketService.emitNewMessage(responderId, requesterId, responseChat);

      const roomId = [responderId, requesterId].sort().join("_");
      socketService.emitToRoom(roomId, "newMessage", responseChat);

      // If accepted, emit photo access granted event
      if (shouldUpdateAccess) {
        socketService.emitToRoom(requesterId, "photoAccessGranted", {
          grantedBy: responderId,
          granterInfo: {
            _id: responder._id,
            firstName: responder.firstName,
            lastName: responder.lastName,
            profilePicture: responder.profilePicture,
          },
        });
      }

      // Emit notification
      const io = req.app.get("io");
      if (io) {
        const apiNamespace = io.of("/api");
        apiNamespace.to(requesterId.toString()).emit("newNotification", {
          _id: newNotification._id,
          userId: requesterId,
          type: "photo_response",
          fromUserId: responderId,
          content: newNotification.content,
          isRead: false,
          createdAt: newNotification.createdAt,
        });
      }

      console.log(`Photo request ${response} response sent:`, responseChat);
    } catch (socketError) {
      console.error("Socket emission error:", socketError);
    }

    // Return the data structure expected by frontend
    res.json({
      message: `Photo request ${response} response sent successfully`,
      data: responseChat, // The new photo_response message
      originalMessageId: originalMessageId, // The original request message ID
      responseType: response, // The response type (accept/deny/later)
      accessGranted: shouldUpdateAccess,
    });
  } catch (err) {
    console.error("Respond to photo request error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Request wali information access
// @route   POST /api/chats/request-wali/:userId
// @access  Private
exports.requestWaliAccessWithMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const receiverId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    const sender = await User.findById(senderId).select(
      "firstName lastName profilePicture"
    );

    // Create a special chat message for wali request
    const waliRequestMessage = new Chat({
      sender: senderId,
      receiver: receiverId,
      text: `${sender.firstName} has requested access to your wali information. Please respond below.`,
      timestamp: new Date(),
      isRead: false,
      messageType: "wali_request",
      waliRequestData: {
        requesterId: senderId,
        status: "pending",
      },
    });

    await waliRequestMessage.save();

    await waliRequestMessage.populate([
      { path: "sender", select: "firstName lastName profilePicture" },
      { path: "receiver", select: "firstName lastName profilePicture" },
    ]);

    // Create notification
    const newNotification = new Notification({
      userId: receiverId,
      type: "wali_request",
      fromUserId: senderId,
      content: `${sender.firstName} ${sender.lastName} has requested access to your wali information`,
      isRead: false,
    });

    await newNotification.save();

    // Emit via socket
    try {
      socketService.emitNewMessage(senderId, receiverId, waliRequestMessage);

      const roomId = [senderId, receiverId].sort().join("_");
      socketService.emitToRoom(roomId, "newMessage", waliRequestMessage);

      // Emit notification
      const io = req.app.get("io");
      if (io) {
        const apiNamespace = io.of("/api");
        apiNamespace.to(receiverId.toString()).emit("newNotification", {
          _id: newNotification._id,
          userId: receiverId,
          type: "wali_request",
          fromUserId: senderId,
          content: newNotification.content,
          isRead: false,
          createdAt: newNotification.createdAt,
        });
      }

      console.log("Wali request message sent:", waliRequestMessage);
    } catch (socketError) {
      console.error("Socket emission error:", socketError);
    }

    res.status(201).json({
      message: "Wali request sent successfully",
      data: waliRequestMessage,
    });
  } catch (err) {
    console.error("Request wali access error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Respond to wali request
// @route   POST /api/chats/respond-wali/:userId
// @access  Private
exports.respondToWaliRequest = async (req, res) => {
  try {
    const responderId = req.user.id;
    const requesterId = req.params.userId;
    const { response, originalMessageId } = req.body;

    if (!["accept", "deny", "later"].includes(response)) {
      return res.status(400).json({
        message: "Invalid response. Must be 'accept', 'deny', or 'later'",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(requesterId)) {
      return res.status(400).json({ message: "Invalid requester ID" });
    }

    if (
      originalMessageId &&
      !mongoose.Types.ObjectId.isValid(originalMessageId)
    ) {
      return res.status(400).json({ message: "Invalid original message ID" });
    }

    const requester = await User.findById(requesterId);
    const responder = await User.findById(responderId);

    if (!requester || !responder) {
      return res.status(404).json({ message: "User not found" });
    }

    let responseMessage = "";
    let shouldUpdateAccess = false;

    switch (response) {
      case "accept":
        responseMessage = `${responder.firstName} has accepted your wali information request. You can now view their wali details.`;
        shouldUpdateAccess = true;
        break;
      case "deny":
        responseMessage = `${responder.firstName} has declined your wali information request.`;
        break;
      case "later":
        responseMessage = `${responder.firstName} will respond to your wali information request later.`;
        break;
    }

    // Update approvedWaliFor array if accepted
    if (shouldUpdateAccess) {
      await User.findByIdAndUpdate(responderId, {
        $addToSet: { approvedWaliFor: requesterId },
      });
    }

    // Create response message
    const responseChat = new Chat({
      sender: responderId,
      receiver: requesterId,
      text: responseMessage,
      timestamp: new Date(),
      isRead: false,
      messageType: "wali_response",
      waliResponseData: {
        originalRequesterId: requesterId,
        originalMessageId: originalMessageId,
        response: response,
        responderId: responderId,
      },
    });

    await responseChat.save();

    await responseChat.populate([
      { path: "sender", select: "firstName lastName profilePicture" },
      { path: "receiver", select: "firstName lastName profilePicture" },
    ]);

    // Create notification
    const newNotification = new Notification({
      userId: requesterId,
      type: "wali_response",
      fromUserId: responderId,
      content: responseMessage,
      isRead: false,
    });

    await newNotification.save();

    // Emit via socket
    try {
      socketService.emitNewMessage(responderId, requesterId, responseChat);

      const roomId = [responderId, requesterId].sort().join("_");
      socketService.emitToRoom(roomId, "newMessage", responseChat);

      // Emit notification
      const io = req.app.get("io");
      if (io) {
        const apiNamespace = io.of("/api");
        apiNamespace.to(requesterId.toString()).emit("newNotification", {
          _id: newNotification._id,
          userId: requesterId,
          type: "wali_response",
          fromUserId: responderId,
          content: newNotification.content,
          isRead: false,
          createdAt: newNotification.createdAt,
        });
      }

      console.log(`Wali request ${response} response sent:`, responseChat);
    } catch (socketError) {
      console.error("Socket emission error:", socketError);
    }

    res.json({
      message: `Wali request ${response} response sent successfully`,
      data: responseChat,
      originalMessageId: originalMessageId,
      responseType: response,
      accessGranted: shouldUpdateAccess,
    });
  } catch (err) {
    console.error("Respond to wali request error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
