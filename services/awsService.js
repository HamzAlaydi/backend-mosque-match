const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

// Configure AWS SDK (Moved credentials to environment variables)
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

/**
 * Uploads a file to AWS S3.
 *
 * @param {Buffer} fileBuffer - The file content as a Buffer.
 * @param {string} fileName - The desired name of the file in S3.  A unique prefix will be added.
 * @param {string} bucketName - The name of the S3 bucket.
 * @param {string} contentType - The content type of the file (e.g., 'image/jpeg', 'application/pdf').
 * @returns {Promise<{ s3Url: string, s3Key: string }>} - A promise that resolves with the S3 URL and key of the uploaded file.  Handles errors.
 */
const uploadToS3 = async (fileBuffer, fileName, bucketName, contentType) => {
  // Generate a unique key for the file in S3.  This avoids overwrites.
  const key = `${uuidv4()}-${fileName}`;

  const uploadParams = {
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType, // Set the content type explicitly
    ACL: "public-read", // Make the file publicly accessible.  Consider security implications.
  };

  try {
    // Upload the file to S3
    const result = await s3.upload(uploadParams).promise();
    console.log(`File uploaded successfully to S3: ${result.Location}`);
    return {
      s3Url: result.Location, // URL of the uploaded file
      s3Key: key, // The key used to store the file in S3
    };
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    // Wrap the error for consistent handling.  Include original error for debugging.
    throw new Error(`Failed to upload file to S3: ${error.message}`, {
      cause: error,
    });
  }
};

module.exports = { uploadToS3 };
