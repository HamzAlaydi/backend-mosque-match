const mongoose = require("mongoose");
const ImamMosqueRequest = require("./models/ImamMosqueRequest");
const config = require("./config/db");

async function testRequestStructure() {
  try {
    await mongoose.connect(config.mongoURI);
    console.log("Connected to MongoDB");

    // Get all imam mosque requests
    const requests = await ImamMosqueRequest.find({})
      .populate("mosqueId", "name address externalId")
      .populate("imamId", "name email")
      .limit(5);

    console.log("Found", requests.length, "requests");

    requests.forEach((req, index) => {
      console.log(`\nRequest ${index + 1}:`);
      console.log("ID:", req._id);
      console.log("Status:", req.status);
      console.log("Imam:", req.imamId?.name);
      console.log("Mosque:", {
        name: req.mosqueId?.name,
        id: req.mosqueId?._id,
        externalId: req.mosqueId?.externalId,
      });
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

testRequestStructure();
