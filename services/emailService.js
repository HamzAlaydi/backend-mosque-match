// Updated emailService.js with Gmail configuration

const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  // Create a transporter using Gmail
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "hamza.alaydi.99@gmail.com", // Your Gmail address
      pass: "lzfg wwgw imgs kmtm", // Your Gmail app password
    },
  });

  const mailOptions = {
    from: '"Mosque Match" <mosque-match@gmail.com>', // Sender address
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  // Send email
  const info = await transporter.sendMail(mailOptions);
  console.log("Email sent: %s", info.messageId);
  return info;
};

const sendVerificationEmail = async (user, verificationUrl) => {
  const message = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 5px;">
      <h1 style="color: #4CAF50; text-align: center;">Welcome to Mosque Match!</h1>
      <p>Assalamu alaikum ${user.firstName},</p>
      <p>Thank you for registering with Mosque Match. To complete your registration, please verify your email by clicking the button below:</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Your Email</a>
      </div>
      <p>This verification link will expire in 24 hours.</p>
      <p>If you did not create an account with us, please disregard this email.</p>
      <p>Jazak Allah Khair,<br>The Mosque Match Team</p>
    </div>
  `;

  await sendEmail({
    email: user.email,
    subject: "Verify Your Mosque Match Account",
    html: message,
  });
};

const sendPasswordResetEmail = async (user, resetUrl) => {
  const message = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 5px;">
      <h1 style="color: #2196F3; text-align: center;">Password Reset Request</h1>
      <p>Assalamu alaikum ${user.firstName},</p>
      <p>You have requested to reset your password for your Mosque Match account. Click the button below to reset your password:</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${resetUrl}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
      </div>
      <p>This password reset link will expire in 1 hour for security reasons.</p>
      <p>If you did not request a password reset, please disregard this email and your password will remain unchanged.</p>
      <p>Jazak Allah Khair,<br>The Mosque Match Team</p>
    </div>
  `;

  await sendEmail({
    email: user.email,
    subject: "Reset Your Mosque Match Password",
    html: message,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
