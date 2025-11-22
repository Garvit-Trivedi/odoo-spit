const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');

const generateOTP = () => {
  return otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });
};

const sendOTP = async (email, otp) => {
  try {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email credentials not configured. OTP email will not be sent.');
      console.warn('OTP for', email, ':', otp);
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Add connection timeout
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    // Verify connection
    await transporter.verify();

    const mailOptions = {
      from: `"StockMaster" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'StockMaster - Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You have requested to reset your password. Use the following OTP:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0;">${otp}</h1>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully to', email);
    return true;
  } catch (error) {
    console.error('Error sending OTP:', error.message);
    
    // Provide helpful error messages
    if (error.code === 'EAUTH') {
      console.error('\n❌ EMAIL AUTHENTICATION ERROR:');
      console.error('   Your email credentials are incorrect or not properly configured.');
      console.error('   For Gmail, you MUST use an App Password, not your regular password.');
      console.error('   Steps to fix:');
      console.error('   1. Go to: https://myaccount.google.com/security');
      console.error('   2. Enable 2-Step Verification');
      console.error('   3. Go to: https://myaccount.google.com/apppasswords');
      console.error('   4. Generate an App Password for "Mail"');
      console.error('   5. Use that App Password in your .env file as EMAIL_PASS');
      console.error('\n   Current OTP for', email, ':', otp);
      console.error('   (You can manually provide this OTP to the user)\n');
    } else {
      console.error('   OTP for', email, ':', otp);
      console.error('   (You can manually provide this OTP to the user)');
    }
    
    return false;
  }
};

module.exports = { generateOTP, sendOTP };

