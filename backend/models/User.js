import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  googleId: String,
  isVerified: { type: Boolean, default: false },
  verifyToken: String,
  resetToken: String,
  resetTokenExpires: Date,
  language: String,
  level: String,
  deliveryTime: String,
  whatsapp: String,
  
  // ✅✅✅ NEW FIELD ADDED TO STORE THE USER'S TIME ZONE ✅✅✅
  timeZone: {
    type: String, // Will store values like "Asia/Kolkata", "America/New_York", etc.
  },

  currentDay: { type: Number, default: 1 },
  isPaused: { type: Boolean, default: false },
  completedTopics: [
    {
      order: Number,
      explanation: String,
      leetcode: String,
      youtube: String,
    },
  ],
});

export default mongoose.model('User', userSchema);