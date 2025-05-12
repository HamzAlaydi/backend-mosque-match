const roles = (allowedRoles) => (req, res, next) => {
  if (allowedRoles.includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: "Forbidden - Insufficient permissions" });
  }
};

module.exports = roles;
