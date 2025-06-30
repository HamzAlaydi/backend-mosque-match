// Test script for Imam Signup functionality
const mongoose = require("mongoose");
const User = require("./models/User");
require("dotenv").config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/mosque-match")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Connection Error:", err));

async function testImamSignup() {
  try {
    console.log("🧪 Testing Imam Signup Functionality...\n");

    // 1. Test data for imam signup
    const imamData = {
      imamName: "Ahmed Abdullah",
      email: "ahmed.imam@test.com",
      phone: "+44 123 456 7890",
      mosqueAddress: "82-92 Whitechapel Rd, London E1 1JQ",
      mosqueLocation: {
        lat: 51.5154,
        lng: -0.0722,
      },
      message:
        "I have been serving as an imam for over 10 years and would like to register our mosque on your platform.",
      languages: ["English", "Arabic", "Urdu"],
      password: "password123",
      attachedMosques: [
        {
          id: 1,
          name: "East London Mosque",
          address: "82-92 Whitechapel Rd, London E1 1JQ",
          location: {
            coordinates: [-0.0722, 51.5154],
          },
        },
      ],
      distance: 10,
    };

    console.log("1. Testing imam data structure...");
    console.log("✅ Imam data prepared:", {
      name: imamData.imamName,
      email: imamData.email,
      phone: imamData.phone,
      mosqueAddress: imamData.mosqueAddress,
    });

    // 2. Check if email already exists
    console.log("\n2. Checking if email already exists...");
    const existingUser = await User.findOne({ email: imamData.email });
    if (existingUser) {
      console.log("⚠️  Email already exists, deleting for test...");
      await User.findByIdAndDelete(existingUser._id);
    }
    console.log("✅ Email check completed");

    // 3. Create imam user manually to test the structure
    console.log("\n3. Creating test imam user...");
    const nameParts = imamData.imamName.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const testImam = new User({
      firstName,
      lastName,
      email: imamData.email,
      password: imamData.password,
      role: "imam",
      phone: imamData.phone,
      currentLocation: imamData.mosqueAddress,
      messageToCommunity: imamData.message,
      languages: imamData.languages,
      attachedMosques: imamData.attachedMosques,
      distance: imamData.distance,
      imamApprovalStatus: "pending",
      terms: true,
      isEmailVerified: false,
    });

    await testImam.save();
    console.log("✅ Test imam created successfully");

    // 4. Verify the imam was created correctly
    console.log("\n4. Verifying imam creation...");
    const savedImam = await User.findOne({ email: imamData.email }).select(
      "-password"
    );
    console.log("✅ Imam saved with ID:", savedImam._id);
    console.log("✅ Name:", `${savedImam.firstName} ${savedImam.lastName}`);
    console.log("✅ Role:", savedImam.role);
    console.log("✅ Approval Status:", savedImam.imamApprovalStatus);
    console.log("✅ Languages:", savedImam.languages);
    console.log("✅ Attached Mosques:", savedImam.attachedMosques.length);

    // 5. Test finding imams for super admin
    console.log("\n5. Testing super admin imam requests query...");
    const imamRequests = await User.find({
      role: "imam",
      isEmailVerified: false, // Should include unverified imams
    }).select("-password");

    console.log("✅ Found imam requests:", imamRequests.length);
    imamRequests.forEach((req) => {
      console.log(
        `   - ${req.firstName} ${req.lastName} (${req.imamApprovalStatus})`
      );
    });

    // 6. Test email verification requirement
    console.log("\n6. Testing email verification requirement...");
    const verifiedImamRequests = await User.find({
      role: "imam",
      isEmailVerified: true, // Only verified imams
    }).select("-password");

    console.log(
      "✅ Found verified imam requests:",
      verifiedImamRequests.length
    );

    // 7. Test approval status updates
    console.log("\n7. Testing approval status updates...");
    savedImam.imamApprovalStatus = "approved";
    savedImam.isVerified = true;
    await savedImam.save();
    console.log("✅ Imam approved successfully");

    const approvedImam = await User.findOne({ email: imamData.email });
    console.log("✅ Updated approval status:", approvedImam.imamApprovalStatus);
    console.log("✅ Updated verification status:", approvedImam.isVerified);

    console.log("\n🎉 All imam signup tests completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   - Test Imam: ${imamData.imamName}`);
    console.log(`   - Email: ${imamData.email}`);
    console.log(`   - Role: ${savedImam.role}`);
    console.log(`   - Initial Status: pending`);
    console.log(`   - Final Status: ${approvedImam.imamApprovalStatus}`);
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Run the test
testImamSignup();
