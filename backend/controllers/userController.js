import User from '../models/User.js';
import Topic from '../models/Topic.js';

// 🎯 User sets their schedule AFTER email verification
export const setSchedule = async (req, res) => {
  // ✅✅✅ 1. GET the timeZone from the request body ✅✅✅
  const { language, level, deliveryTime, whatsapp, timeZone } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) return res.status(404).json({ message: 'User not found' });

  user.language = language;
  user.level = level;
  user.deliveryTime = deliveryTime;
  user.whatsapp = whatsapp;
  
  // ✅✅✅ 2. SAVE the timeZone to the user's document ✅✅✅
  user.timeZone = timeZone;

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

// In controllers/userController.js
export const togglePause = async (req, res) => {
  const user = await User.findById(req.user._id);
  const wasPaused = user.isPaused;
  user.isPaused = !user.isPaused;

  // If resuming, reset streak to 0 but keep course progress
  if (wasPaused && !user.isPaused) {
    user.streakCount = 0; 
  }
  
  await user.save();
  // ... send back the full user object in the response
  const userObject = user.toObject();
  delete userObject.password;
  res.json({ message: `Course ${user.isPaused ? 'paused' : 'resumed'}.`, user: userObject });
};

export const deleteUser = async (req, res) => {
  try {
    // The user's ID is available from the 'protect' middleware (req.user)
    const userId = req.user._id;

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Success!
    res.status(200).json({ message: 'Account deleted successfully.' });

  } catch (error)
   {
    console.error('Error deleting user account:', error);
    res.status(500).json({ message: 'Server error while deleting account.' });
  }
};

// In controllers/userController.js

// ... (after your existing functions)

export const updateTime = async (req, res) => {
  const { deliveryTime } = req.body;
  if (!deliveryTime) return res.status(400).json({ message: 'Delivery time is required.' });

  const user = await User.findByIdAndUpdate(req.user._id, { deliveryTime }, { new: true });
  res.json({ message: 'Delivery time updated successfully!', user });
};

export const updateNumber = async (req, res) => {
  const { whatsapp } = req.body;
  if (!whatsapp) return res.status(400).json({ message: 'WhatsApp number is required.' });

  const user = await User.findByIdAndUpdate(req.user._id, { whatsapp }, { new: true });
  res.json({ message: 'WhatsApp number updated successfully!', user });
};