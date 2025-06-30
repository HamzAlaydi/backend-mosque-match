const { body } = require("express-validator");

// Validation rules for user registration
exports.userRegisterValidation = [
  body("firstName").notEmpty().withMessage("firstName Is Required"),
  body("lastName").notEmpty().withMessage("lastName Is Required"),
  body("email").isEmail().normalizeEmail().withMessage("Invalid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("gender")
    .notEmpty()
    .isIn(["male", "female"])
    .withMessage("Gender is required"),
  body("role")
    .notEmpty()
    .isIn(["male", "female", "imam", "superadmin"])
    .withMessage("Role is required"),

  // Female validations
  body("wali.name")
    .if(body("gender").equals("female"))
    .notEmpty()
    .withMessage("Wali name is required for females"),
  body("wali.phone")
    .if(body("gender").equals("female"))
    .notEmpty()
    .withMessage("Wali phone is required for females"),
  body("wali.email")
    .if(body("gender").equals("female"))
    .notEmpty()
    .withMessage("Wali email is required for females")
    .isEmail()
    .withMessage("Invalid Wali email"),

  // Imam validations
  body("phone")
    .if(body("role").equals("imam"))
    .notEmpty()
    .withMessage("Phone is required for imams"),
  body("mosqueDetails.id")
    .if(body("role").equals("imam"))
    .notEmpty()
    .withMessage("Mosque ID is required for imams"),
  body("languages")
    .if(body("role").equals("imam"))
    .isArray({ min: 1 })
    .withMessage("Languages is required for imams"),
  body("message")
    .if(body("role").equals("imam"))
    .notEmpty()
    .withMessage("Message to community is required for imams"),

  body("terms")
    .isBoolean()
    .withMessage("Terms must be a boolean")
    .custom((value) => value === true)
    .withMessage("You must accept terms"),
];

// Validation rules for user login
exports.userLoginValidation = [
  body("email", "Invalid email").isEmail().normalizeEmail(),
  body("password", "Password is required").not().isEmpty(),
];

// Validation rules for user profile update
exports.userUpdateValidation = [
  body("email", "Invalid email").optional().isEmail().normalizeEmail(),
  body("firstName", "First name must be string").optional().isString(),
  body("lastName", "Last name must be string").optional().isString(),
  body("birthDate", "Birth date must be a valid date").optional().isISO8601(),
  body("countryOfBirth", "Country of birth must be string")
    .optional()
    .isString(),
  body("citizenship", "Citizenship must be string").optional().isString(),
  body("originCountry", "Origin Country must be string").optional().isString(),
  body("maritalStatus", "Marital status must be string").optional().isString(),
  body("educationLevel", "Education level must be string")
    .optional()
    .isString(),
  body("profession", "Profession must be string").optional().isString(),
  body("jobTitle", "Job title must be string").optional().isString(),
  body("income", "Income must be string").optional().isString(),
  body("religiousness", "Religiousness must be string").optional().isString(),
  body("sector", "Sector must be string").optional().isString(),
  body("isRevert", "isRevert must be boolean").optional().isBoolean(),
  body("keepsHalal", "keepsHalal must be boolean").optional().isBoolean(),
  body("prayerFrequency", "Prayer frequency must be string")
    .optional()
    .isString(),
  body("quranReading", "Quran reading must be string").optional().isString(),
  body("childrenDesire", "Children desire must be string")
    .optional()
    .isString(),
  body("hasChildren", "Has children must be string").optional().isString(),
  body("livingArrangement", "Living arrangement must be string")
    .optional()
    .isString(),
  body("height", "Height must be string").optional().isString(),
  body("build", "Build must be string").optional().isString(),
  body("ethnicity", "Ethnicity must be string").optional().isString(),
  body("smokes", "Smokes must be boolean").optional().isBoolean(),
  body("drinks", "Drinks must be boolean").optional().isBoolean(),
  body("disability", "Disability must be boolean").optional().isBoolean(),
  body("phoneUsage", "Phone usage must be string").optional().isString(),
  body("hijab", "Hijab must be string")
    .optional()
    .isString()
    .isIn(["yes", "no", "sometimes"]),
  body("wearsHijab", "WearsHijab must be boolean").optional().isBoolean(),
  body("beard", "Beard must be string")
    .optional()
    .isString()
    .isIn(["yes", "no", "some"]),
  body("hasBeard", "HasBeard must be boolean").optional().isBoolean(),
  body("willingToRelocate", "WillingToRelocate must be boolean")
    .optional()
    .isBoolean(),
  body("tagLine", "Tag line must be string").optional().isString(),
  body("about", "About must be string").optional().isString(),
  body("lookingFor", "Looking for must be string").optional().isString(),
];

// Validation rules for updating user profile controller
exports.userProfileUpdateValidation = [
  body("email", "Invalid email").optional().isEmail().normalizeEmail(),
  body("firstName", "First name is required").optional().notEmpty(),
  body("lastName", "Last name is required").optional().notEmpty(),
  body("countryOfBirth", "Country of birth is required").optional().notEmpty(),
  body("citizenship", "Citizenship is required").optional().notEmpty(),
  body("originCountry", "Origin country is required").optional().notEmpty(),
  body("maritalStatus", "Marital status is required").optional().notEmpty(),
  body("religiousness", "Religiousness is required").optional().notEmpty(),
  body("sector", "Sector is required").optional().notEmpty(),
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

// Forgot password validation
exports.forgotPasswordValidation = [
  body("email", "Please include a valid email").isEmail(),
];

// Reset password validation
exports.resetPasswordValidation = [
  body("token", "Reset token is required").notEmpty(),
  body("password", "Password must be at least 6 characters").isLength({
    min: 6,
  }),
];

// Validation rules for imam signup
exports.imamSignupValidation = [
  body("firstName").notEmpty().withMessage("First name is required"),
  body("lastName").notEmpty().withMessage("Last name is required"),
  body("email").isEmail().normalizeEmail().withMessage("Invalid email"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("phone").notEmpty().withMessage("Phone number is required"),
  body("message").optional().isString().withMessage("Message must be a string"),
  body("languages")
    .isArray({ min: 1 })
    .withMessage("At least one language is required"),
  body("role")
    .equals("imam")
    .withMessage("Role must be imam"),
  
  // Optional fields that might be sent from frontend
  body("gender").optional().isString(),
  body("waliName").optional().isString(),
  body("waliPhone").optional().isString(),
  body("waliEmail").optional().isString(),
  body("educationLevel").optional().isString(),
  body("profession").optional().isString(),
  body("jobTitle").optional().isString(),
  body("firstLanguage").optional().isString(),
  body("secondLanguage").optional().isString(),
  body("religiousness").optional().isString(),
  body("sector").optional().isString(),
  body("isRevert").optional().isBoolean(),
  body("keepsHalal").optional().isBoolean(),
  body("prayerFrequency").optional().isString(),
  body("quranReading").optional().isString(),
  body("citizenship").optional().isString(),
  body("originCountry").optional().isString(),
  body("willingToRelocate").optional().isBoolean(),
  body("income").optional().isString(),
  body("marriageWithin").optional().isString(),
  body("maritalStatus").optional().isString(),
  body("childrenDesire").optional().isString(),
  body("hasChildren").optional().isString(),
  body("livingArrangement").optional().isString(),
  body("height").optional().isString(),
  body("build").optional().isString(),
  body("ethnicity").optional().isString(),
  body("smokes").optional().isBoolean(),
  body("drinks").optional().isBoolean(),
  body("disability").optional().isBoolean(),
  body("phoneUsage").optional().isString(),
  body("hasBeard").optional().isBoolean(),
  body("wearsHijab").optional().isBoolean(),
  body("currentLocation").optional().isString(),
  body("countryOfBirth").optional().isString(),
  body("birthDate").optional().isString(),
  body("tagLine").optional().isString(),
  body("about").optional().isString(),
  body("lookingFor").optional().isString(),
  body("profilePicturePreview").optional().isString(),
  body("distance").optional().isNumeric(),
  body("attachedMosques").optional().isArray(),
  body("mosqueLocation").optional().isString(),
  body("mosqueDetails").optional().isString(),
  body("mosqueAddress").optional().isString(),
];
