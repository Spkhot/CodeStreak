require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.sendMail({
  from: `"CodeStreak" <${process.env.EMAIL_USER}>`,
  to: 'YOUR_OWN_EMAIL@gmail.com',
  subject: 'Test Mail',
  text: 'This is a test mail!',
}, (err, info) => {
  if (err) {
    console.error('❌ ERROR:', err);
  } else {
    console.log('✅ Email sent:', info.response);
  }
});
