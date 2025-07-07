const axios = require("axios");
import { rootRoute } from "../mosque-match/shared/constants/backendLink";

// Test data - you'll need to replace these with actual values from your database
const IMAM_TOKEN = "YOUR_IMAM_TOKEN_HERE"; // Replace with actual imam token
const REQUEST_ID = "YOUR_REQUEST_ID_HERE"; // Replace with actual request ID

async function testImamApproval() {
  try {
    console.log("Testing imam approval endpoints...\n");

    // Test 1: Get imam requests
    console.log("1. Testing GET /mosque-attachments/imam-requests");
    try {
      const response = await axios.get(
        `${rootRoute}/mosque-attachments/imam-requests`,
        {
          headers: {
            Authorization: `Bearer ${IMAM_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("✅ Success:", response.data);
      console.log("Number of requests:", response.data.length);

      if (response.data.length > 0) {
        console.log("First request:", response.data[0]);
      }
    } catch (error) {
      console.log("❌ Error:", error.response?.data || error.message);
    }

    // Test 2: Approve a request
    console.log("\n2. Testing POST /mosque-attachments/:requestId/approve");
    try {
      const response = await axios.post(
        `${rootRoute}/mosque-attachments/${REQUEST_ID}/approve`,
        {
          imamResponse: "User verified successfully",
        },
        {
          headers: {
            Authorization: `Bearer ${IMAM_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("✅ Success:", response.data);
    } catch (error) {
      console.log("❌ Error:", error.response?.data || error.message);
    }

    // Test 3: Deny a request
    console.log("\n3. Testing POST /mosque-attachments/:requestId/deny");
    try {
      const response = await axios.post(
        `${rootRoute}/mosque-attachments/${REQUEST_ID}/deny`,
        {
          denialReason: "Verification denied by imam",
          imamResponse: "User verification denied",
        },
        {
          headers: {
            Authorization: `Bearer ${IMAM_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("✅ Success:", response.data);
    } catch (error) {
      console.log("❌ Error:", error.response?.data || error.message);
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Instructions for running the test
console.log("IMPORTANT: Before running this test, you need to:");
console.log(
  "1. Replace IMAM_TOKEN with an actual imam token from your database"
);
console.log(
  "2. Replace REQUEST_ID with an actual request ID from your database"
);
console.log("3. Make sure your backend server is running on port 5000");
console.log("\nTo get these values:");
console.log("- Check your database for imam users and their tokens");
console.log("- Check the MosqueAttachmentRequest collection for request IDs");
console.log("\nRun with: node test-imam-approval.js");

// Uncomment the line below to run the test
// testImamApproval();
