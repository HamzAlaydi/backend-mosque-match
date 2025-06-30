const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  createAttachmentRequest,
  getImamAttachmentRequests,
  approveAttachmentRequest,
  denyAttachmentRequest,
  getUserAttachmentRequests,
  updateImamResponse,
  updateDenialReason,
  resetToPending,
} = require("../controllers/mosqueAttachmentController");

// @route   POST /api/mosque-attachments/request
// @desc    Create a mosque attachment request
// @access  Private
router.post("/request", auth, createAttachmentRequest);

// @route   GET /api/mosque-attachments/imam-requests
// @desc    Get attachment requests for an imam
// @access  Private (Imam only)
router.get("/imam-requests", auth, getImamAttachmentRequests);

// @route   POST /api/mosque-attachments/:requestId/approve
// @desc    Approve a mosque attachment request
// @access  Private (Imam only)
router.post("/:requestId/approve", auth, approveAttachmentRequest);

// @route   POST /api/mosque-attachments/:requestId/deny
// @desc    Deny a mosque attachment request
// @access  Private (Imam only)
router.post("/:requestId/deny", auth, denyAttachmentRequest);

// @route   PUT /api/mosque-attachments/:requestId/update-response
// @desc    Update imam response for an approved request
// @access  Private (Imam only)
router.put("/:requestId/update-response", auth, updateImamResponse);

// @route   PUT /api/mosque-attachments/:requestId/update-denial
// @desc    Update denial reason for a denied request
// @access  Private (Imam only)
router.put("/:requestId/update-denial", auth, updateDenialReason);

// @route   PUT /api/mosque-attachments/:requestId/reset-to-pending
// @desc    Reset a request to pending status
// @access  Private (Imam only)
router.put("/:requestId/reset-to-pending", auth, resetToPending);

// @route   GET /api/mosque-attachments/user-requests
// @desc    Get user's attachment requests
// @access  Private
router.get("/user-requests", auth, getUserAttachmentRequests);

module.exports = router;
 