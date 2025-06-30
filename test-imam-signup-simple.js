const axios = require("axios");

// Test the imam signup endpoint with the actual frontend data
async function testImamSignup() {
  try {
    console.log("Testing Imam Signup with Frontend Data...\n");

    // Simulate the exact data sent from frontend (only necessary fields)
    const formData = new FormData();

    // Required fields
    formData.append("firstName", "Hamza");
    formData.append("lastName", "ALaydi");
    formData.append("email", "hamza.alaydi.99@outlook.sa");
    formData.append("password", "Hamza1234");
    formData.append("phone", "+972595608864");
    formData.append("mosqueAddress", "Waterford, County Waterford, Ireland");
    formData.append("message", "Pls accecpt me");
    formData.append("languages", JSON.stringify(["english", "arabic"]));
    formData.append("role", "imam");
    formData.append("distance", "6");
    formData.append(
      "attachedMosques",
      JSON.stringify([
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
      ])
    );
    formData.append(
      "mosqueLocation",
      JSON.stringify({ lat: 52.2609997, lng: -7.1119081 })
    );
    formData.append(
      "mosqueDetails",
      JSON.stringify({
        name: "Hamza ALaydi",
        address: "Waterford, County Waterford, Ireland",
        location: { lat: 52.2609997, lng: -7.1119081 },
        imam: {
          name: "Hamza ALaydi",
          email: "hamza.alaydi.99@outlook.sa",
          phone: "+972595608864",
          languages: ["english", "arabic"],
          message: "Pls accecpt me",
        },
      })
    );

    console.log("Sending request to /api/auth/imam-signup...");
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
    console.error(
      "❌ Error:",
      error.response?.status,
      error.response?.statusText
    );
    console.error("Error Data:", error.response?.data);

    if (error.response?.data?.errors) {
      console.error("Validation Errors:");
      error.response.data.errors.forEach((err) => {
        console.error(`- ${err.msg} (${err.param})`);
      });
    }
  }
}

// Run the test
if (require.main === module) {
  testImamSignup();
}

module.exports = { testImamSignup };
