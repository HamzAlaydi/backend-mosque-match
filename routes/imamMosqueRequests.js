const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const roles = require("../middleware/roles");
const {
  createImamMosqueRequest,
  getImamMosqueRequests,
  approveImamMosqueRequest,
  denyImamMosqueRequest,
  getImamRequestsByImam,
} = require("../controllers/imamMosqueRequestController");

// @route   POST /api/imam-mosque-requests/request
// @desc    Create a new imam mosque request
// @access  Private (Imam)
router.post("/request", auth, roles(["imam"]), createImamMosqueRequest);

// @route   GET /api/imam-mosque-requests
// @desc    Get all imam mosque requests (for superadmin)
// @access  Private (Superadmin)
router.get("/", auth, roles(["superadmin"]), getImamMosqueRequests);

// @route   GET /api/imam-mosque-requests/my-requests
// @desc    Get imam's own requests
// @access  Private (Imam)
router.get("/my-requests", auth, roles(["imam"]), getImamRequestsByImam);

// @route   POST /api/imam-mosque-requests/:requestId/approve
// @desc    Approve an imam mosque request
// @access  Private (Superadmin)
router.post(
  "/:requestId/approve",
  auth,
  roles(["superadmin"]),
  approveImamMosqueRequest
);

// @route   POST /api/imam-mosque-requests/:requestId/deny
// @desc    Deny an imam mosque request
// @access  Private (Superadmin)
router.post(
  "/:requestId/deny",
  auth,
  roles(["superadmin"]),
  denyImamMosqueRequest
);

module.exports = router;
