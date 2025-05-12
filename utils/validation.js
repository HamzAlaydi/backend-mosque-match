const { body } = require("express-validator");

// Validation rules for user registration
exports.userRegisterValidation = [
  body("email", "Invalid email").isEmail().normalizeEmail(),
  body("password", "Password must be at least 6 characters").isLength({
    min: 6,
  }),
  body("role", "Role is required")
    .not()
    .isEmpty()
    .isIn(["male", "female", "imam", "superadmin"]),
  // Conditional validation based on role
  body("wali.name", "Wali name is required for females")
    .if(body("role").equals("female"))
    .not()
    .isEmpty(),
  body("wali.relationship", "Wali relationship is required for females")
    .if(body("role").equals("female"))
    .not()
    .isEmpty(),
  body("wali.contact", "Wali contact is required for females")
    .if(body("role").equals("female"))
    .not()
    .isEmpty(),
  body("beard", "Beard is required for males")
    .if(body("role").equals("male"))
    .isIn(["yes", "no", "some"]),
  body("phone", "Phone is required for imams")
    .if(body("role").equals("imam"))
    .not()
    .isEmpty(),
  body("mosque", "Mosque is required for imams")
    .if(body("role").equals("imam"))
    .not()
    .isEmpty(),
  body("languages", "Languages is required for imams")
    .if(body("role").equals("imam"))
    .isArray({ min: 1 }),
  body("messageToCommunity", "Message to community is required for imams")
    .if(body("role").equals("imam"))
    .not()
    .isEmpty(),
];

// Validation rules for user login
exports.userLoginValidation = [
  body("email", "Invalid email").isEmail().normalizeEmail(),
  body("password", "Password is required").not().isEmpty(),
];

exports.userUpdateValidation = [
  body("email", "Invalid email").isEmail().normalizeEmail(),
  body("firstName", "First name must be string").optional().isString(),
  body("lastName", "Last name must be string").optional().isString(),
  body("countryOfBirth", "Country of birth must be string")
    .optional()
    .isString(),
  body("citizenship", "citizenship must be string").optional().isString(),
  body("originCountry", "Origin Country must be string").optional().isString(),
  body("maritalStatus", "maritalStatus must be string").optional().isString(),
  body("hijab", "hijab must be string").optional().isString(),
  body("beard", "beard must be string").optional().isString(),
];
// Validation rules for creating a mosque
exports.createMosqueValidation = [
  body("name", "Name is required").not().isEmpty(),
  body(
    "location.coordinates",
    "Location coordinates are required and must be an array of two numbers [longitude, latitude]"
  )
    .isArray({ min: 2, max: 2 })
    .isNumeric(),
  body("address", "Address is required").not().isEmpty(),
];
