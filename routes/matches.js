const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  findMatches,
  findMatchesByMosque,
  saveMosqueSelection,
  loadMosqueSelection,
} = require("../controllers/matchController");

// @route   GET /api/matches/search
// @desc    Find matches for a male user within a distance
// @access  Private
router.get("/search", auth, findMatches);

// @route   GET /api/matches/mosque/:mosqueId
// @desc    Get matches for a male user by mosque ID
// @access  Private
router.get("/mosque/:mosqueId", auth, findMatchesByMosque);

// @route   POST /api/matches/save-mosques
// @desc    Save selected mosques for user
// @access  Private
router.post("/save-mosques", auth, saveMosqueSelection);

// @route   GET /api/matches/saved-mosques
// @desc    Load saved mosques for user
// @access  Private
router.get("/saved-mosques", auth, loadMosqueSelection);

module.exports = router;
