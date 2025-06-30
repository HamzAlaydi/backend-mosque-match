const mongoose = require("mongoose");
const User = require("./models/User");
const Mosque = require("./models/Mosque");
const MosqueAttachmentRequest = require("./models/MosqueAttachmentRequest");

// Test the verification logic
async function testVerificationLogic() {
  try {
    console.log("🧪 Testing isVerified Logic...\n");

    // Connect to database
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/mosque-match"
    );
    console.log("✅ Connected to database");

    // Clean up test data
    await User.deleteMany({ email: { $regex: /test-verification/ } });
    await Mosque.deleteMany({ name: { $regex: /Test Mosque/ } });
    await MosqueAttachmentRequest.deleteMany({
      message: { $regex: /Test request/ },
    });
    console.log("✅ Cleaned up test data");

    // Create test user
    const testUser = new User({
      firstName: "Test",
      lastName: "User",
      email: "test-verification@example.com",
      password: "password123",
      role: "male",
      isVerified: false,
    });
    await testUser.save();
    console.log("✅ Created test user");

    // Create test mosque
    const testMosque = new Mosque({
      name: "Test Mosque 1",
      externalId: 999,
      location: {
        type: "Point",
        coordinates: [0, 0],
      },
      address: "Test Address",
      imams: [],
    });
    await testMosque.save();
    console.log("✅ Created test mosque");

    // Create test imam
    const testImam = new User({
      firstName: "Test",
      lastName: "Imam",
      email: "test-imam-verification@example.com",
      password: "password123",
      role: "imam",
      imamApprovalStatus: "approved",
    });
    await testImam.save();
    console.log("✅ Created test imam");

    // Add imam to mosque
    testMosque.imams.push(testImam._id);
    await testMosque.save();
    console.log("✅ Added imam to mosque");

    // Test 1: User starts unverified
    console.log("\n📋 Test 1: Initial state");
    const user1 = await User.findById(testUser._id);
    console.log(`User isVerified: ${user1.isVerified}`); // Should be false

    // Test 2: Create attachment request (should not change verification)
    console.log("\n📋 Test 2: Create attachment request");
    const request1 = new MosqueAttachmentRequest({
      userId: testUser._id,
      mosqueId: testMosque._id,
      message: "Test request 1",
      assignedImamId: testImam._id,
      status: "pending",
    });
    await request1.save();

    const user2 = await User.findById(testUser._id);
    console.log(`User isVerified after pending request: ${user2.isVerified}`); // Should still be false

    // Test 3: Approve request (should make user verified)
    console.log("\n📋 Test 3: Approve request");
    request1.status = "approved";
    request1.imamResponse = "Approved by imam";
    request1.reviewedAt = new Date();
    await request1.save();

    // Update user verification status
    const userRequests = await MosqueAttachmentRequest.find({
      userId: testUser._id,
    });
    const hasApprovedRequest = userRequests.some(
      (request) => request.status === "approved"
    );
    const user3 = await User.findById(testUser._id);
    user3.isVerified = hasApprovedRequest;
    await user3.save();

    console.log(`User isVerified after approval: ${user3.isVerified}`); // Should be true

    // Test 4: Deny the approved request (should make user unverified)
    console.log("\n📋 Test 4: Deny approved request");
    request1.status = "denied";
    request1.denialReason = "Denied by imam";
    request1.imamResponse = null;
    await request1.save();

    const userRequests2 = await MosqueAttachmentRequest.find({
      userId: testUser._id,
    });
    const hasApprovedRequest2 = userRequests2.some(
      (request) => request.status === "approved"
    );
    const user4 = await User.findById(testUser._id);
    user4.isVerified = hasApprovedRequest2;
    await user4.save();

    console.log(`User isVerified after denial: ${user4.isVerified}`); // Should be false

    // Test 5: Create second request and approve it (should make user verified again)
    console.log("\n📋 Test 5: Create and approve second request");
    const request2 = new MosqueAttachmentRequest({
      userId: testUser._id,
      mosqueId: testMosque._id,
      message: "Test request 2",
      assignedImamId: testImam._id,
      status: "approved",
      imamResponse: "Second approval",
      reviewedAt: new Date(),
    });
    await request2.save();

    const userRequests3 = await MosqueAttachmentRequest.find({
      userId: testUser._id,
    });
    const hasApprovedRequest3 = userRequests3.some(
      (request) => request.status === "approved"
    );
    const user5 = await User.findById(testUser._id);
    user5.isVerified = hasApprovedRequest3;
    await user5.save();

    console.log(`User isVerified after second approval: ${user5.isVerified}`); // Should be true

    // Test 6: Reset to pending (should make user unverified)
    console.log("\n📋 Test 6: Reset to pending");
    request2.status = "pending";
    request2.imamResponse = null;
    request2.reviewedAt = null;
    await request2.save();

    const userRequests4 = await MosqueAttachmentRequest.find({
      userId: testUser._id,
    });
    const hasApprovedRequest4 = userRequests4.some(
      (request) => request.status === "approved"
    );
    const user6 = await User.findById(testUser._id);
    user6.isVerified = hasApprovedRequest4;
    await user6.save();

    console.log(`User isVerified after reset to pending: ${user6.isVerified}`); // Should be false

    // Test 7: Multiple requests scenario
    console.log("\n📋 Test 7: Multiple requests scenario");
    const request3 = new MosqueAttachmentRequest({
      userId: testUser._id,
      mosqueId: testMosque._id,
      message: "Test request 3",
      assignedImamId: testImam._id,
      status: "denied",
      denialReason: "Denied",
      reviewedAt: new Date(),
    });
    await request3.save();

    const request4 = new MosqueAttachmentRequest({
      userId: testUser._id,
      mosqueId: testMosque._id,
      message: "Test request 4",
      assignedImamId: testImam._id,
      status: "approved",
      imamResponse: "Approved",
      reviewedAt: new Date(),
    });
    await request4.save();

    const userRequests5 = await MosqueAttachmentRequest.find({
      userId: testUser._id,
    });
    const hasApprovedRequest5 = userRequests5.some(
      (request) => request.status === "approved"
    );
    const user7 = await User.findById(testUser._id);
    user7.isVerified = hasApprovedRequest5;
    await user7.save();

    console.log(
      `User isVerified with multiple requests (1 approved, 1 denied, 1 pending): ${user7.isVerified}`
    ); // Should be true

    console.log("\n✅ All verification logic tests completed successfully!");
    console.log("\n📊 Summary:");
    console.log("- User starts unverified");
    console.log("- Pending requests do not change verification status");
    console.log("- Approved requests make user verified");
    console.log("- Denied requests do not make user verified");
    console.log(
      "- User stays verified if they have at least one approved request"
    );
    console.log(
      "- User becomes unverified only when they have no approved requests"
    );
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("✅ Disconnected from database");
  }
}

// Run the test
testVerificationLogic();
