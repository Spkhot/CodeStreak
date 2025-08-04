import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import transporter from '../config/mailer.js';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const signup = async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'Email already in use' });

  const hashed = await bcrypt.hash(password, 10);
  const verifyToken = crypto.randomBytes(32).toString('hex');
  const verifyURL = `${req.protocol}://${req.get('host')}/api/auth/verify?token=${verifyToken}`;

  await User.create({
    name,
    email,
    password: hashed,
    verifyToken,
    isVerified: false,
  });

  await transporter.sendMail({
    to: email,
    subject: 'Verify your CodeStreak account',
    html: `<p>Click below to verify:</p><a href="${verifyURL}">Verify Now</a>`,
  });

  res.json({ message: 'Check your email to verify.' });
};

export const verify = async (req, res) => {
  const { token } = req.query;
  const user = await User.findOne({ verifyToken: token });

  if (!user) return res.send('Invalid or expired token');

  user.isVerified = true;
  user.verifyToken = undefined;
  await user.save();

  const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  // ✅ Redirect with JWT in URL:
  res.redirect(`/set-schedule.html?token=${jwtToken}`);
};


export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ message: 'No user found' });
  if (!user.isVerified) return res.status(400).json({ message: 'Email not verified' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ message: 'Wrong password' });

  const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token: jwtToken });
};

export const googleAuth = async (req, res) => {
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
};

export const forgot = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ message: 'No user found' });

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetToken = resetToken;
  user.resetTokenExpires = Date.now() + 3600000;
  await user.save();

  const resetURL = `${req.protocol}://${req.get('host')}/reset.html?token=${resetToken}`;

  await transporter.sendMail({
    to: email,
    subject: 'Reset your CodeStreak password',
    html: `<p>Click below to reset:</p><a href="${resetURL}">Reset Password</a>`,
  });

  res.json({ message: 'Reset link sent.' });
};

export const reset = async (req, res) => {
  try {
    const { token, password } = req.body; // ✅ MATCHES YOUR FETCH BODY

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

    return res.json({ message: 'Password reset successful.' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};

