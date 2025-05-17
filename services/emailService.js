const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

const sendVerificationEmail = async (user, verificationUrl) => {
  const message = `
    <h1>Email Confirmation</h1>
    <p>Thank you for registering with our app. Please confirm your email by clicking on the following link:</p>
    <a href="${verificationUrl}" target="_blank">Verify Your Email</a>
    <p>This link will expire in 24 hours.</p>
  `;

  await sendEmail({
    email: user.email,
    subject: "Email Confirmation",
    html: message,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
};
