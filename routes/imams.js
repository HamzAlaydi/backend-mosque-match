const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const roles = require("../middleware/roles");
const {
  getImams,
  getImamById,
  approveMaleVerification,
  rejectMaleVerification,
} = require("../controllers/imamController");

// @route   GET /api/imams
// @desc    Get all Imams
// @access  Private
router.get("/", auth, roles(["superadmin"]), getImams); // Only superadmins can see all imams

// @route   GET /api/imams/:id
// @desc    Get Imam by ID
// @access  Private
router.get("/:id", auth, roles(["superadmin", "imam"]), getImamById); // Superadmins and the imam themselves can see their profile

// @route   POST /api/imams/:imamId/verify-male/:maleId
// @desc    Approve a male user's verification request
// @access  Private (Imam)
router.post(
  "/:imamId/verify-male/:maleId",
  auth,
  roles(["imam"]),
  approveMaleVerification
);

// @route   DELETE /api/imams/:imamId/verify-male/:maleId
// @desc    Reject a male user's verification request
// @access  Private (Imam)
router.delete(
  "/:imamId/verify-male/:maleId",
  auth,
  roles(["imam"]),
  rejectMaleVerification
);

module.exports = router;
