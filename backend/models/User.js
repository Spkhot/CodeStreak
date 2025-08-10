// import mongoose from 'mongoose';

// const userSchema = new mongoose.Schema({
//   name: String,
//   email: { type: String, unique: true },
//   password: String,
//   googleId: String,
  
//   // Account Status
//   isVerified: { type: Boolean, default: false },
//   verifyToken: String,
//   resetToken: String,
//   resetTokenExpires: Date,
  
//   // User's Active Schedule
//   language: String, // The language they are currently receiving
//   level: String,    // The level they are currently receiving
//   deliveryTime: String,
//   whatsapp: String,
//   timeZone: String,
  
//   // User's Progress
//   currentDay: { type: Number, default: 1 },
//   streakCount: { type: Number, default: 0 },
//   lastSentDate: String, // Format: "YYYY-MM-DD" in user's timezone
//   isPaused: { type: Boolean, default: false },

//   // ✅✅✅ IMPROVED SUBSCRIPTION STRUCTURE ✅✅✅
//   // This array can hold multiple subscriptions, making the "Bundle" easy to manage.
//   subscriptions: [{
//     language: String, // e.g., "C++", "Java", or "Bundle" for the special offer
//     level: String,    // e.g., "Pro", "Advanced"
//     razorpayOrderId: String,
//     razorpayPaymentId: String,
//     purchaseDate: { type: Date, default: Date.now }
//   }],

//   // User's Saved Progress & Notes
//   completedTopics: [
//     {
//       order: Number,
//       explanation: String,
//       leetcode: String,
//       youtube: String,
//       notes: { type: String, default: '' }
//     },
//   ],
// });

// export default mongoose.model('User', userSchema);
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
   lastSentDate: {
    type: String // We will store the date as a simple string like "2023-11-22"
  },
  currentDay: { type: Number, default: 1 },
  streakCount: {
    type: Number,
    default: 0 // Start all users with a streak of 0
  },
  isSubscribed: {
    type: Boolean,
    default: false // All users start as not subscribed
  },
  subscriptionLevel: {
    type: String, // Will store "Advanced" or "Pro"
    default: null
  },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  isPaused: { type: Boolean, default: false },
  achievements: {
    type: [String], // An array of strings, e.g., ["INITIATED", "7_DAY_STREAK"]
    default: []
  },
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