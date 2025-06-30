const axios = require("axios");

// Test the imam signup endpoint with frontend form data structure
async function testImamSignupFrontend() {
  try {
    console.log("Testing Imam Signup with Frontend Form Data Structure...\n");

    // Simulate the data that would be sent from the frontend form
    const formData = new FormData();

    // Step 1 data (from ImamSignupStep1)
    formData.append("firstName", "Ahmed");
    formData.append("lastName", "Hassan");
    formData.append("email", "ahmed.hassan@example.com");
    formData.append("phone", "+44 20 7946 0958");
    formData.append("mosqueAddress", "123 Baker Street, London, UK");
    formData.append(
      "message",
      "Experienced imam looking to serve the community"
    );
    formData.append("languages", JSON.stringify(["english", "arabic", "urdu"]));
    formData.append("password", "SecurePassword123!");
    formData.append("role", "imam");

    // Step 2 data (from ImamSignupStep2)
    formData.append("distance", "15");
    formData.append(
      "attachedMosques",
      JSON.stringify([
        {
          id: "1",
          name: "Central London Mosque",
          address: "146 Park Road, London NW8 7RG",
          location: { lat: 51.5225, lng: -0.1572 },
        },
        {
          id: "2",
          name: "East London Mosque",
          address: "46 Whitechapel Road, London E1 1JX",
          location: { lat: 51.5175, lng: -0.0637 },
        },
      ])
    );

    // Mosque details object
    const mosqueData = {
      name: "Ahmed Hassan",
      address: "123 Baker Street, London, UK",
      location: { lat: 51.5074, lng: -0.1278 },
      imam: {
        name: "Ahmed Hassan",
        email: "ahmed.hassan@example.com",
        phone: "+44 20 7946 0958",
        languages: ["english", "arabic", "urdu"],
        message: "Experienced imam looking to serve the community",
      },
    };
    formData.append("mosqueDetails", JSON.stringify(mosqueData));

    console.log("Form Data being sent:");
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }
    console.log("\n");

    const response = await axios.post(
      "http://localhost:5000/api/auth/imam-signup",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    console.log("✅ Success! Response:");
    console.log("Status:", response.status);
    console.log("Data:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
    if (error.response?.data?.errors) {
      console.error("Validation Errors:");
      error.response.data.errors.forEach((err) => {
        console.error(`- ${err.msg} (${err.param})`);
      });
    }
  }
}

// Test with different scenarios
async function testMultipleScenarios() {
  console.log("=== Testing Multiple Imam Signup Scenarios ===\n");

  // Test 1: Valid data
  console.log("Test 1: Valid Imam Signup Data");
  await testImamSignupFrontend();

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 2: Missing required fields
  console.log("Test 2: Missing Required Fields");
  try {
    const formData = new FormData();
    formData.append("firstName", "Test");
    formData.append("email", "test@example.com");
    // Missing lastName, phone, etc.

    const response = await axios.post(
      "http://localhost:5000/api/auth/imam-signup",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    console.log("Unexpected success:", response.data);
  } catch (error) {
    console.log("✅ Expected validation error:");
    console.log(error.response?.data?.message || error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 3: Invalid email format
  console.log("Test 3: Invalid Email Format");
  try {
    const formData = new FormData();
    formData.append("firstName", "Test");
    formData.append("lastName", "User");
    formData.append("email", "invalid-email");
    formData.append("phone", "+44 20 7946 0958");
    formData.append("mosqueAddress", "123 Test Street");
    formData.append("languages", JSON.stringify(["english"]));
    formData.append("password", "password123");
    formData.append("role", "imam");

    const response = await axios.post(
      "http://localhost:5000/api/auth/imam-signup",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    console.log("Unexpected success:", response.data);
  } catch (error) {
    console.log("✅ Expected validation error:");
    console.log(error.response?.data?.message || error.message);
  }
}

// Run the tests
if (require.main === module) {
  testMultipleScenarios();
}

module.exports = { testImamSignupFrontend };
