const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const roles = require("../middleware/roles");
const {
  getAllMosques,
  getMosquesNearby,
  getMosqueById,
  createMosque,
  requestManageMosque,
  approveImamRequest,
  getFemalesInMosque,
} = require("../controllers/mosqueController");
const { createMosqueValidation } = require("../utils/validation");

// @route   GET /api/mosques
// @desc    Get all mosques
// @access  Public
router.get("/", getAllMosques);

// @route   GET /api/mosques/nearby
// @desc    Get mosques within radius
// @access  Public
router.get("/nearby", getMosquesNearby);

// @route   GET /api/mosques/:id
// @desc    Get mosque by ID
// @access  Public
router.get("/:id", getMosqueById);

// @route   POST /api/mosques
// @desc    Create a new mosque
// @access  Private (Super Admin only)
router.post(
  "/",
  auth,
  roles(["superadmin"]),
  createMosqueValidation,
  createMosque
);

// @route   POST /api/mosques/:mosqueId/request-management
// @desc    Request to manage a mosque (Imam)
// @access  Private (Imam only)
router.post(
  "/:mosqueId/request-management",
  auth,
  roles(["imam"]),
  requestManageMosque
);

// @route   POST /api/mosques/:mosqueId/approve-imam/:imamId
// @desc    Approve imam request to manage mosque
// @access  Private (Super Admin only)
router.post(
  "/:mosqueId/approve-imam/:imamId",
  auth,
  roles(["superadmin"]),
  approveImamRequest
);

// @route   GET /api/mosques/:mosqueId/females
// @desc    Get females attached to a mosque
// @access  Private
router.get("/:mosqueId/females", auth, getFemalesInMosque);

module.exports = router;
