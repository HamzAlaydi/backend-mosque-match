// Test script for Super Admin functionality
const mongoose = require("mongoose");
const User = require("./models/User");
const Mosque = require("./models/Mosque");
require("dotenv").config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/mosque-match")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Connection Error:", err));

async function testSuperAdminFunctionality() {
  try {
    console.log("🧪 Testing Super Admin Functionality...\n");

    // 1. Create a test super admin
    console.log("1. Creating test super admin...");
    const superAdmin = new User({
      firstName: "Super",
      lastName: "Admin",
      email: "superadmin@test.com",
      password: "password123",
      role: "superadmin",
      isEmailVerified: true,
      isVerified: true,
    });
    await superAdmin.save();
    console.log("✅ Super admin created:", superAdmin.email);

    // 2. Create a test mosque
    console.log("\n2. Creating test mosque...");
    const mosque = new Mosque({
      name: "Test Mosque",
      address: "123 Test Street, London",
      location: {
        type: "Point",
        coordinates: [-0.1276, 51.5074], // London coordinates
      },
    });
    await mosque.save();
    console.log("✅ Mosque created:", mosque.name);

    // 3. Create a test imam (pending approval)
    console.log("\n3. Creating test imam...");
    const imam = new User({
      firstName: "Test",
      lastName: "Imam",
      email: "imam@test.com",
      password: "password123",
      role: "imam",
      phone: "+44 123 456 7890",
      mosque: mosque._id,
      messageToCommunity: "Test message from imam",
      isEmailVerified: true,
      imamApprovalStatus: "pending",
      currentLocation: "London, UK",
    });
    await imam.save();
    console.log("✅ Imam created:", imam.email);

    // 4. Test fetching imam requests
    console.log("\n4. Testing fetch imam requests...");
    const imamRequests = await User.find({
      role: "imam",
      isEmailVerified: true,
    }).select("-password");
    console.log("✅ Found imam requests:", imamRequests.length);
    imamRequests.forEach((req) => {
      console.log(
        `   - ${req.firstName} ${req.lastName} (${req.imamApprovalStatus})`
      );
    });

    // 5. Test approving imam
    console.log("\n5. Testing imam approval...");
    imam.imamApprovalStatus = "approved";
    imam.isVerified = true;
    imam.managedMosques.push(mosque._id);
    await imam.save();

    // Add imam to mosque
    mosque.imams.push(imam._id);
    await mosque.save();
    console.log("✅ Imam approved and assigned to mosque");

    // 6. Verify the assignment
    console.log("\n6. Verifying assignment...");
    const updatedMosque = await Mosque.findById(mosque._id).populate(
      "imams",
      "firstName lastName email"
    );
    console.log(
      "✅ Mosque imams:",
      updatedMosque.imams.map((i) => `${i.firstName} ${i.lastName}`)
    );

    // 7. Test denying an imam
    console.log("\n7. Testing imam denial...");
    const imam2 = new User({
      firstName: "Denied",
      lastName: "Imam",
      email: "denied@test.com",
      password: "password123",
      role: "imam",
      phone: "+44 987 654 3210",
      messageToCommunity: "This imam will be denied",
      isEmailVerified: true,
      imamApprovalStatus: "pending",
      currentLocation: "Manchester, UK",
    });
    await imam2.save();
    console.log("✅ Created imam for denial test");

    imam2.imamApprovalStatus = "denied";
    imam2.deniedReason = "Test denial reason";
    imam2.isVerified = false;
    await imam2.save();
    console.log("✅ Imam denied");

    console.log("\n🎉 All tests completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   - Super Admin: ${superAdmin.email}`);
    console.log(`   - Mosque: ${mosque.name}`);
    console.log(`   - Approved Imam: ${imam.email}`);
    console.log(`   - Denied Imam: ${imam2.email}`);
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Run the test
testSuperAdminFunctionality();
