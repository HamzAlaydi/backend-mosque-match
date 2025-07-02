module.exports = function parseBooleanFields(fields) {
  return (req, res, next) => {
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] === "string") {
          req.body[field] = req.body[field] === "true";
        } else if (typeof req.body[field] === "boolean") {
          // Already boolean, keep as is
          req.body[field] = req.body[field];
        }
      }
    });
    next();
  };
};
