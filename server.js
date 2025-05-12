const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const cors = require("cors");
const morgan = require("morgan"); // For logging
const connectDB = require("./config/db");
const { errorHandler } = require("./utils/errorHandlers");
const socketService = require("./services/socketService");

// Route files
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const mosqueRoutes = require("./routes/mosques");
const chatRoutes = require("./routes/chats");
const matchRoutes = require("./routes/matches");
const interestRoutes = require("./routes/interests");
const imamRoutes = require("./routes/imams");
const notificationRoutes = require("./routes/notifications");

const app = express();

// Connect to MongoDB
connectDB();

// Initialize Socket.IO
const server = require("http").createServer(app); // Create an HTTP server
const io = socketService.init(server); // Pass the server to Socket.IO

// Express configuration
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded request bodies
app.use(morgan("dev")); // Use Morgan for logging in development mode
app.use(passport.initialize()); // Initialize Passport
require("./config/passport"); // Import passport configuration

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/mosques", mosqueRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/interests", interestRoutes);
app.use("/api/imams", imamRoutes);
app.use("/api/notifications", notificationRoutes);

// Error handling middleware (must be after route definitions)
app.use(errorHandler);

const port = process.env.PORT || 5000;

server.listen(port, () => console.log(`Server running on port ${port}`)); // Use the HTTP server
