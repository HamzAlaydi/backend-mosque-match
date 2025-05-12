// config/keys.js
require("dotenv").config(); // Load environment variables from .env

module.exports = {
  mongoURI: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY, // Add this line
  aws: {
    // If you are using AWS
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucketName: process.env.AWS_BUCKET_NAME,
  },
};
