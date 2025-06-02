// backend/services/socketService.js
const socketio = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

let io;
let apiNamespace;

module.exports = {
  init: (server) => {
    io = socketio(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    // Create the /api namespace for authenticated connections
    apiNamespace = io.of("/api");

    // Authentication middleware for /api namespace
    apiNamespace.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error("Authentication error"));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) return next(new Error("User not found"));

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (err) {
        console.error("Socket authentication error:", err);
        next(new Error("Invalid token"));
      }
    });

    // Handle connections to /api namespace
    apiNamespace.on("connection", (socket) => {
      console.log(`User ${socket.userId} connected to /api namespace`);

      // Join user's personal room for notifications
      socket.join(socket.userId);

      // Update user online status
      User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastSeen: new Date(),
      }).exec();

      // Emit to other users that this user is online
      socket.broadcast.emit("userOnline", {
        userId: socket.userId,
        lastSeen: new Date(),
      });

      // Chat room management
      socket.on("joinRoom", (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.userId} joined room: ${roomId}`);
      });

      socket.on("leaveRoom", (roomId) => {
        socket.leave(roomId);
        console.log(`User ${socket.userId} left room: ${roomId}`);
      });

      // Typing status
      socket.on("typing", ({ receiverId, isTyping }) => {
        if (isTyping) {
          socket.to(receiverId).emit("userTyping", {
            userId: socket.userId,
            userInfo: {
              firstName: socket.user.firstName,
              lastName: socket.user.lastName,
            },
          });
        } else {
          socket.to(receiverId).emit("userStoppedTyping", {
            userId: socket.userId,
          });
        }
      });

      // Mark messages as read
      socket.on("markMessagesRead", ({ userId }) => {
        // You can implement message read logic here if needed
        console.log(
          `User ${socket.userId} marked messages from ${userId} as read`
        );
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(`User ${socket.userId} disconnected from /api namespace`);

        // Update user offline status
        User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: new Date(),
        }).exec();

        // Emit to other users that this user is offline
        socket.broadcast.emit("userOffline", {
          userId: socket.userId,
          lastSeen: new Date(),
        });
      });
    });

    return io;
  },

  getIO: () => {
    if (!io) throw new Error("Socket.IO not initialized!");
    return io;
  },

  getApiNamespace: () => {
    if (!apiNamespace) throw new Error("API namespace not initialized!");
    return apiNamespace;
  },

  // Emit notification to root namespace (for general notifications)
  emitNotification: (userId, notification) => {
    if (!io) throw new Error("Socket.IO not initialized!");
    console.log(`Emitting notification to user ${userId}:`, notification);
    io.to(userId).emit("newNotification", notification);
  },

  // Emit chat-related events to /api namespace
  emitToApiNamespace: (event, userId, data) => {
    if (!apiNamespace) throw new Error("API namespace not initialized!");
    console.log(`Emitting ${event} to user ${userId} in /api namespace:`, data);
    apiNamespace.to(userId).emit(event, data);
  },

  // Emit new message to both users in the chat
  emitNewMessage: (senderId, receiverId, message) => {
    if (!apiNamespace) throw new Error("API namespace not initialized!");
    console.log(`Emitting new message from ${senderId} to ${receiverId}`);

    // Emit to both sender and receiver
    apiNamespace.to(senderId).emit("newMessage", message);
    apiNamespace.to(receiverId).emit("newMessage", message);
  },

  // Emit messages read status
  emitMessagesRead: (userId, data) => {
    if (!apiNamespace) throw new Error("API namespace not initialized!");
    console.log(`Emitting messages read to user ${userId}:`, data);
    apiNamespace.to(userId).emit("messagesRead", data);
  },

  // Emit message deleted
  emitMessageDeleted: (userId, data) => {
    if (!apiNamespace) throw new Error("API namespace not initialized!");
    console.log(`Emitting message deleted to user ${userId}:`, data);
    apiNamespace.to(userId).emit("messageDeleted", data);
  },

  // Photo request events
  emitPhotoRequest: (userId, data) => {
    if (!apiNamespace) throw new Error("API namespace not initialized!");
    console.log(`Emitting photo request to user ${userId}:`, data);
    apiNamespace.to(userId).emit("photoRequest", data);
  },

  emitPhotoAccessApproved: (userId, data) => {
    if (!apiNamespace) throw new Error("API namespace not initialized!");
    console.log(`Emitting photo access approved to user ${userId}:`, data);
    apiNamespace.to(userId).emit("photoAccessApproved", data);
  },
};
