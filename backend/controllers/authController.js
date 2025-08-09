import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import transporter from '../config/mailer.js';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    
    // ✅✅✅ FIX: Changed to backticks (`) for template literals ✅✅✅
    const verifyURL = `${req.protocol}://${req.get('host')}/api/auth/verify?token=${verifyToken}`;

    await User.create({
      name,
      email,
      password: hashed,
      verifyToken,
      isVerified: false,
    });

    // ✅✅✅ FIX: Changed HTML content to be inside backticks (`) ✅✅✅
    await transporter.sendMail({
      to: email,
      subject: '🔥 Verify your The Habit Loop account & start your daily coding streak!',
      html: `
        <div style="font-family: Arial, sans-serif; color: #0D1117; line-height: 1.6;">
          <h2 style="color: #3B82F6;">Hey there,</h2>
          <p>You're almost ready to unlock daily bite-sized coding tasks straight to your WhatsApp. Just verify your email to get started.</p>
          <p>
            <a href="${verifyURL}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">✅ Verify My Email</a>
          </p>
          <p>If you didn’t sign up for The Habit Loop, you can safely ignore this email.</p>
          <p>Happy coding! 🚀<br/>– The Habit Loop Team</p>
        </div>
      `
    });

    res.json({ message: 'Check your email to verify.' });

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: 'Server error during signup.' });
  }
};

export const verify = async (req, res) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({ verifyToken: token });

    if (!user) return res.status(400).send('<h1>Invalid or expired verification link.</h1>');

    user.isVerified = true;
    user.verifyToken = undefined;
    await user.save();

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    // ✅✅✅ FIX: Changed to backticks (`) for template literals ✅✅✅
    res.redirect(`/set-schedule.html?token=${jwtToken}`);

  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).send('<h1>Server error during verification.</h1>');
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASS) {
      return res.json({ isAdmin: true });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No user found with that email.' });
    if (!user.isVerified) return res.status(400).json({ message: 'Please verify your email before logging in.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: 'Incorrect password.' });

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token: jwtToken, isAdmin: false });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

export const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { name, email, sub } = ticket.getPayload();
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId: sub,
        isVerified: true,
      });
    }

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token: jwtToken });

  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(500).json({ message: 'Google authentication failed.' });
  }
};

export const forgot = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'No user found with that email.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // ✅✅✅ FIX: Changed to backticks (`) and fixed URL ✅✅✅
    const resetURL = `${req.protocol}://${req.get('host')}/reset.html?token=${resetToken}`;

    // ✅✅✅ FIX: Changed HTML to be inside backticks (`) ✅✅✅
    await transporter.sendMail({
      to: email,
      subject: 'Reset your The Habit Loop password',
      html: `<p>Click the link below to reset your password:</p><a href="${resetURL}">Reset Password</a>`,
    });

    res.json({ message: 'Reset link has been sent to your email.' });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: 'Server error while sending reset link.' });
  }
};

export const reset = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset link.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();

    return res.json({ message: 'Password reset successful. You can now log in.' });

  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};