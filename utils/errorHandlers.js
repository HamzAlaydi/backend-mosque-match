const multer = require("multer");

exports.errorHandler = (err, req, res, next) => {
  console.error(err); // Log the error for debugging

  // Check if the error is a Mongoose validation error
  if (err.name === "ValidationError") {
    let errors = {};
    for (const field in err.errors) {
      errors[field] = err.errors[field].message;
    }
    return res
      .status(400)
      .json({ message: "Validation error", errors: errors });
  }

  // Handle other specific errors (e.g., Multer file size error)
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File size too large (max 5MB)" });
    }
    return res
      .status(400)
      .json({ message: `File upload error: ${err.message}` });
  }
  // Default to 500 server error
  res.status(500).json({ message: "Server error", error: err.message });
};
