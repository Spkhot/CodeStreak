import User from '../models/User.js';
import Topic from '../models/Topic.js';

// 🎯 User sets their schedule AFTER email verification
export const setSchedule = async (req, res) => {
  const { language, level, deliveryTime, whatsapp } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) return res.status(404).json({ message: 'User not found' });

  user.language = language;
  user.level = level;
  user.deliveryTime = deliveryTime;
  user.whatsapp = whatsapp;
  user.currentDay = 1; // Reset streak
  await user.save();

  res.json({ message: 'Schedule set successfully!' });
};

// 🎯 Get user dashboard data
export const getMe = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -verifyToken -resetToken -resetTokenExpires');

  if (!user) return res.status(404).json({ message: 'User not found' });

  res.json(user);
};

// 🎯 Pause/resume daily delivery
export const togglePause = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) return res.status(404).json({ message: 'User not found' });

  user.isPaused = !user.isPaused;
  await user.save();

  res.json({ message: `Schedule ${user.isPaused ? 'paused' : 'resumed'}.` });
};
