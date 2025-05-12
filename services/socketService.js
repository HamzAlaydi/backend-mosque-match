const socketio = require("socket.io");

let io;

module.exports = {
  init: (server) => {
    io = socketio(server, {
      cors: {
        origin: "*", // Allow all origins during development
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("A user connected:", socket.id);

      // Join room (for private chats)
      socket.on("joinRoom", (userId) => {
        socket.join(userId); // Use the user ID as the room name
        console.log(`User ${socket.id} joined room ${userId}`);
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
      });
    });
    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket.IO not initialized!");
    }
    return io;
  },
};
