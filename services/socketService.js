// backend/services/socketService.js
const socketio = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

let io;

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

    const apiNamespace = io.of("/api"); // Create the /api namespace

    apiNamespace.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error("Authentication error"));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) return next(new Error("User not found"));

        socket.userId = user._id.toString();
        next();
      } catch (err) {
        console.error("Socket authentication error:", err);
        next(new Error("Invalid token"));
      }
    });

    apiNamespace.on("connection", (socket) => {
      console.log(`User ${socket.userId} connected to /api`);
      socket.join(socket.userId);

      socket.on("disconnect", () => {
        console.log(`User ${socket.userId} disconnected from /api`);
      });
    });

    io.on("connection", (socket) => {
      console.log(
        `User connected to root namespace (/). This connection might not be intended.`
      );
      // You might not need any logic here if you intend to use /api exclusively
    });

    return io;
  },
  getIO: () => {
    if (!io) throw new Error("Socket.IO not initialized!");
    return io;
  },
  emitNotification: (userId, notification) => {
    if (!io) throw new Error("Socket.IO not initialized!");
    console.log(
      `Emitting notification to user ${userId} in root namespace:`,
      notification
    );
    io.to(userId).emit("newNotification", notification); // Ensure you emit to the correct namespace if you choose Option 2
  },
};
