const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const roles = require("../middleware/roles");
const {
  getImamRequests,
  approveImamRequest,
  denyImamRequest,
  getMosquesForAssignment,
  removeImamFromMosque,
  updateImamStatus,
} = require("../controllers/superAdminController");

// All routes require authentication and super admin role
router.use(auth);
// router.use(roles(["superadmin"]));

// @route   GET /api/superadmin/imam-requests
// @desc    Get all pending imam requests
// @access  Private (Super Admin only)
router.get("/imam-requests", getImamRequests);

// @route   POST /api/superadmin/approve-imam/:imamId
// @desc    Approve imam request and assign to mosque
// @access  Private (Super Admin only)
router.post("/approve-imam/:imamId", approveImamRequest);

// @route   POST /api/superadmin/deny-imam/:imamId
// @desc    Deny imam request
// @access  Private (Super Admin only)
router.post("/deny-imam/:imamId", denyImamRequest);

// @route   GET /api/superadmin/mosques
// @desc    Get all mosques for assignment
// @access  Private (Super Admin only)
router.get("/mosques", getMosquesForAssignment);

// @route   DELETE /api/superadmin/mosque/:mosqueId/imam/:imamId
// @desc    Remove imam from mosque
// @access  Private (Super Admin only)
router.delete("/mosque/:mosqueId/imam/:imamId", removeImamFromMosque);

// @route   PATCH /api/superadmin/imam-status/:imamId
router.patch("/imam-status/:imamId", updateImamStatus);

module.exports = router;
