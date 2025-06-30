const mongoose = require("mongoose");
const Mosque = require("./models/Mosque");
const connectDB = require("./config/db");

async function testMosqueLookup() {
  try {
    await connectDB();

    console.log("Testing mosque lookup...");

    // Check what mosques exist in the database
    const allMosques = await Mosque.find({});
    console.log(`Total mosques in database: ${allMosques.length}`);

    if (allMosques.length > 0) {
      console.log("Sample mosques:");
      allMosques.slice(0, 5).forEach((mosque) => {
        console.log(
          `- ${mosque.name} (ID: ${mosque._id}, externalId: ${mosque.externalId})`
        );
      });
    }

    // Test looking up mosque with ID 1436
    console.log("\nTesting lookup for mosque ID 1436:");

    // Try by externalId
    let mosque = await Mosque.findOne({ externalId: 1436 });
    if (mosque) {
      console.log(`Found by externalId: ${mosque.name}`);
    } else {
      console.log("Not found by externalId");
    }

    // Try by _id
    mosque = await Mosque.findById(1436);
    if (mosque) {
      console.log(`Found by _id: ${mosque.name}`);
    } else {
      console.log("Not found by _id");
    }

    // Check if we need to create the London mosques
    if (allMosques.length === 0) {
      console.log(
        "\nNo mosques found in database. You may need to run a migration script."
      );
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

testMosqueLookup();
