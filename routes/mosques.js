const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const roles = require("../middleware/roles");
const {
  getAllMosques,
  createMosque,
  getMosqueById,
  requestManageMosque,
  approveImamRequest,
  getFemalesInMosque,
} = require("../controllers/mosqueController");
const { createMosqueValidation } = require("../utils/validation");

// @route   GET /api/mosques
// @desc    Get all mosques
// @access  Public
router.get("/", getAllMosques);

// @route   POST /api/mosques
// @desc    Create a new mosque
// @access  Private (Imam or Super Admin)
router.post(
  "/",
  auth,
  roles(["imam", "superadmin"]),
  createMosqueValidation,
  createMosque
);

// @route   GET /api/mosques/:id
// @desc    Get mosque by ID
// @access  Public
router.get("/:id", getMosqueById);

// @route   POST /api/mosques/:mosqueId/request-manage
// @desc    Request to manage a mosque
// @access  Private (Imam)
router.post(
  "/:mosqueId/request-manage",
  auth,
  roles(["imam"]),
  requestManageMosque
);

// @route   POST /api/mosques/:mosqueId/approve-imam/:imamId
// @desc    Approve Imam's request to manage a mosque
// @access  Private (Super Admin)
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
