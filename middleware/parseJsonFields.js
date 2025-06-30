module.exports = function parseJsonFields(fields) {
  return (req, res, next) => {
    fields.forEach((field) => {
      if (req.body[field] && typeof req.body[field] === "string") {
        try {
          req.body[field] = JSON.parse(req.body[field]);
        } catch (e) {
          // ignore, let validation handle it
        }
      }
    });
    next();
  };
};
