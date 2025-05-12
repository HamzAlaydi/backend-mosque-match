const passport = require("passport");

// Middleware to protect routes
const auth = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }
    req.user = user;
    next();
  })(req, res, next);
};

module.exports = auth;
