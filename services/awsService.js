const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  signatureVersion: "v4",
});

const uploadToS3 = async (fileBuffer, fileName, bucketName, contentType) => {
  // Add 'profilepictures/' prefix to the key
  const key = `profilepictures/${uuidv4()}-${fileName}`;

  const params = {
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    const s3Url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    return { s3Url, s3Key: key };
  } catch (error) {
    console.error("S3 upload error:", error);
    throw error;
  }
};

module.exports = { uploadToS3 };
