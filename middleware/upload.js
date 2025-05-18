const multer = require("multer");
const path = require("path");

// Change to memory storage for direct buffer access
const storage = multer.memoryStorage(); // <<-- This is the crucial change

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage: storage, // Now using memory storage
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
});

module.exports = upload;
