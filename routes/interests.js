const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  addToInterestList,
  removeFromInterestList,
  getUserInterestList,
} = require("../controllers/interestController");

// @route   POST /api/interests/add
// @desc    Add a female to a male user's interest list
// @access  Private
router.post("/add", auth, addToInterestList);

// @route   POST /api/interests/remove
// @desc    Remove a female from a male user's interest list
// @access  Private
router.post("/remove", auth, removeFromInterestList);

// @route   GET /api/interests
// @desc    Get the interest list for the logged-in male user
// @access  Private
router.get("/", auth, getUserInterestList);

module.exports = router;
