// Test script for Imam Signup with actual frontend data format
const mongoose = require("mongoose");
const User = require("./models/User");
require("dotenv").config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/mosque-match")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Connection Error:", err));

async function testImamSignupWithActualData() {
  try {
    console.log("🧪 Testing Imam Signup with Actual Frontend Data Format...\n");

    // 1. Test data matching the actual frontend format
    const actualFrontendData = {
      firstName: "Hamza",
      lastName: "Alaydi",
      email: "hamza.alaydi.99@outlook.sa",
      password: "Hamza1234",
      gender: "male",
      role: "imam",
      phone: "+972595608864",
      mosqueAddress: "Waterford, County Waterford, Ireland",
      message: "Pls Accept me",
      languages: JSON.stringify(["english", "arabic"]),
      attachedMosques: JSON.stringify([
        {
          id: 17080502,
          name: "Prayer Room",
          location: { lat: 51.49914744, lng: -0.119422674 },
          address:
            "Ground floor, South Wing, St Thomas' Hospital, Westminster B.... 020 7188 5588 Westminster,Lambeth,SE1 7EH",
          rating: null,
          reviewCount: null,
          distance: 0.6744906058324082,
          isAttached: false,
          hasFemaleArea: false,
          description: "",
        },
      ]),
      mosqueDetails: JSON.stringify({
        name: "Hamza",
        address: "Waterford, County Waterford, Ireland",
        location: { lat: 0, lng: 0 },
        imam: {
          name: "Hamza",
          email: "hamza.alaydi.99@outlook.sa",
          phone: "+972595608864",
          languages: ["english", "arabic"],
          message: "Pls Accept me",
        },
      }),
    };

    console.log("1. Testing actual frontend data structure...");
    console.log("✅ Data prepared with actual field names");

    // 2. Check if email already exists
    console.log("\n2. Checking if email already exists...");
    const existingUser = await User.findOne({
      email: actualFrontendData.email,
    });
    if (existingUser) {
      console.log("⚠️  Email already exists, deleting for test...");
      await User.findByIdAndDelete(existingUser._id);
    }
    console.log("✅ Email check completed");

    // 3. Simulate the backend processing logic
    console.log("\n3. Processing data like the backend would...");

    // Parse languages
    let parsedLanguages = actualFrontendData.languages;
    if (typeof actualFrontendData.languages === "string") {
      try {
        parsedLanguages = JSON.parse(actualFrontendData.languages);
      } catch (e) {
        parsedLanguages = [actualFrontendData.languages];
      }
    }

    // Parse attached mosques
    let parsedAttachedMosques = actualFrontendData.attachedMosques;
    if (typeof actualFrontendData.attachedMosques === "string") {
      try {
        parsedAttachedMosques = JSON.parse(actualFrontendData.attachedMosques);
      } catch (e) {
        parsedAttachedMosques = [];
      }
    }

    // Parse mosque details
    let parsedMosqueDetails = actualFrontendData.mosqueDetails;
    if (typeof actualFrontendData.mosqueDetails === "string") {
      try {
        parsedMosqueDetails = JSON.parse(actualFrontendData.mosqueDetails);
      } catch (e) {
        parsedMosqueDetails = {};
      }
    }

    // Use imamName if available, otherwise use firstName + lastName
    const imamName =
      actualFrontendData.imamName ||
      `${actualFrontendData.firstName || ""} ${
        actualFrontendData.lastName || ""
      }`.trim();
    const nameParts = imamName.trim().split(" ");
    const firstName = nameParts[0] || actualFrontendData.firstName || "";
    const lastName =
      nameParts.slice(1).join(" ") || actualFrontendData.lastName || "";

    console.log("✅ Data parsing completed");
    console.log("   - Languages:", parsedLanguages);
    console.log("   - Attached Mosques:", parsedAttachedMosques.length);
    console.log("   - Mosque Details:", parsedMosqueDetails.name);

    // 4. Create user data
    console.log("\n4. Creating user data object...");
    const userData = {
      firstName,
      lastName,
      email: actualFrontendData.email,
      password: actualFrontendData.password,
      role: "imam",
      gender: actualFrontendData.gender || "male",
      phone: actualFrontendData.phone,
      currentLocation:
        actualFrontendData.mosqueAddress || actualFrontendData.currentLocation,
      messageToCommunity: actualFrontendData.message || "No message provided",
      languages: parsedLanguages || [],
      attachedMosques: parsedAttachedMosques || [],
      distance: actualFrontendData.distance || 6,
      imamApprovalStatus: "pending",
      terms: true,
      isEmailVerified: false,

      // Additional fields from the form
      educationLevel: actualFrontendData.educationLevel,
      profession: actualFrontendData.profession,
      jobTitle: actualFrontendData.jobTitle,
      firstLanguage: actualFrontendData.firstLanguage,
      secondLanguage: actualFrontendData.secondLanguage,
      religiousness: actualFrontendData.religiousness,
      sector: actualFrontendData.sector,
      isRevert:
        actualFrontendData.isRevert === "true" ||
        actualFrontendData.isRevert === true,
      keepsHalal:
        actualFrontendData.keepsHalal === "true" ||
        actualFrontendData.keepsHalal === true,
      prayerFrequency: actualFrontendData.prayerFrequency,
      quranReading: actualFrontendData.quranReading,
      citizenship: actualFrontendData.citizenship,
      originCountry: actualFrontendData.originCountry,
      willingToRelocate:
        actualFrontendData.willingToRelocate === "true" ||
        actualFrontendData.willingToRelocate === true,
      income: actualFrontendData.income,
      marriageWithin: actualFrontendData.marriageWithin,
      maritalStatus: actualFrontendData.maritalStatus,
      childrenDesire: actualFrontendData.childrenDesire,
      hasChildren: actualFrontendData.hasChildren,
      livingArrangement: actualFrontendData.livingArrangement,
      height: actualFrontendData.height,
      build: actualFrontendData.build,
      ethnicity: actualFrontendData.ethnicity,
      smokes:
        actualFrontendData.smokes === "true" ||
        actualFrontendData.smokes === true,
      drinks:
        actualFrontendData.drinks === "true" ||
        actualFrontendData.drinks === true,
      disability:
        actualFrontendData.disability === "true" ||
        actualFrontendData.disability === true,
      phoneUsage: actualFrontendData.phoneUsage,
      hasBeard:
        actualFrontendData.hasBeard === "true" ||
        actualFrontendData.hasBeard === true,
      wearsHijab:
        actualFrontendData.wearsHijab === "true" ||
        actualFrontendData.wearsHijab === true,
      countryOfBirth: actualFrontendData.countryOfBirth,
      birthDate: actualFrontendData.birthDate,
      tagLine: actualFrontendData.tagLine,
      about: actualFrontendData.about,
      lookingFor: actualFrontendData.lookingFor,
    };

    // Add mosque location if provided
    if (parsedMosqueDetails && parsedMosqueDetails.location) {
      userData.mosqueLocation = parsedMosqueDetails.location;
    }

    console.log("✅ User data object created");

    // 5. Create and save the user
    console.log("\n5. Creating test imam user...");
    const testImam = new User(userData);
    await testImam.save();
    console.log("✅ Test imam created successfully");

    // 6. Verify the imam was created correctly
    console.log("\n6. Verifying imam creation...");
    const savedImam = await User.findOne({
      email: actualFrontendData.email,
    }).select("-password");
    console.log("✅ Imam saved with ID:", savedImam._id);
    console.log("✅ Name:", `${savedImam.firstName} ${savedImam.lastName}`);
    console.log("✅ Role:", savedImam.role);
    console.log("✅ Approval Status:", savedImam.imamApprovalStatus);
    console.log("✅ Languages:", savedImam.languages);
    console.log("✅ Attached Mosques:", savedImam.attachedMosques.length);
    console.log("✅ Mosque Address:", savedImam.currentLocation);
    console.log("✅ Message:", savedImam.messageToCommunity);

    // 7. Test finding imams for super admin
    console.log("\n7. Testing super admin imam requests query...");
    const imamRequests = await User.find({
      role: "imam",
      isEmailVerified: false,
    }).select("-password");

    console.log("✅ Found imam requests:", imamRequests.length);
    imamRequests.forEach((req) => {
      console.log(
        `   - ${req.firstName} ${req.lastName} (${req.imamApprovalStatus})`
      );
    });

    console.log(
      "\n🎉 All imam signup tests with actual data format completed successfully!"
    );
    console.log("\n📊 Summary:");
    console.log(`   - Test Imam: ${savedImam.firstName} ${savedImam.lastName}`);
    console.log(`   - Email: ${savedImam.email}`);
    console.log(`   - Role: ${savedImam.role}`);
    console.log(`   - Status: ${savedImam.imamApprovalStatus}`);
    console.log(`   - Languages: ${savedImam.languages.join(", ")}`);
    console.log(`   - Mosque Address: ${savedImam.currentLocation}`);
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Run the test
testImamSignupWithActualData();
