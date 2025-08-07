import User from '../models/User.js';
import Topic from '../models/Topic.js';
import razorpay from '../config/razorpay.js';
import crypto from 'crypto'; // ✅ IMPORT CRYPTO


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

// Add these two new functions at the end of controllers/userController.js

// FUNCTION 1: Creates a payment order when a user wants to buy.
// In controllers/userController.js

// Make sure you have `import crypto from 'crypto';` at the top of the file!

export const createOrder = async (req, res) => {
  try {
    const { level } = req.body;
    
    let amount;
    if (level === 'Advanced') {
      amount = 99 * 100;
    } else if (level === 'Pro') {
      amount = 299 * 100;
    } else {
      return res.status(400).json({ message: 'Invalid subscription level for payment.' });
    }

    // ✅✅✅ THE FIX IS HERE ✅✅✅
    // We create a shorter, but still highly unique, receipt ID.
    const receiptId = `rcpt_${req.user._id.toString().slice(-6)}_${crypto.randomBytes(4).toString('hex')}`;

    const options = {
      amount: amount,
      currency: "INR",
      receipt: receiptId, // Use the new, shorter ID
    };

    const order = await razorpay.orders.create(options);
    
    res.json({ 
        orderId: order.id, 
        keyId: process.env.RAZORPAY_KEY_ID, 
        amount: order.amount 
    });

  } catch (error) {
    console.error("Razorpay order creation error:", error);
    res.status(500).json({ message: 'Server error while creating payment order.' });
  }
};

// FUNCTION 2: Verifies the payment is real and then saves the user's schedule.
export const verifyPaymentAndSetSchedule = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      // We also receive the schedule data to save it after verification
      language, level, deliveryTime, whatsapp, timeZone
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    // This is Razorpay's security step to verify the payment is authentic.
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed. Signature mismatch.' });
    }
    
    // --- Payment is VERIFIED! Now, we save everything. ---
    
    const user = await User.findById(req.user._id);

    // Save subscription details
    user.isSubscribed = true;
    user.subscriptionLevel = level;
    user.razorpayOrderId = razorpay_order_id;
    user.razorpayPaymentId = razorpay_payment_id;

    // Save schedule details
    user.language = language;
    user.level = level;
    user.deliveryTime = deliveryTime;
    user.whatsapp = whatsapp.replace(/[^0-9+]/g, ''); // Clean the number
    user.timeZone = timeZone;
    
    // Reset progress for the new course
    user.currentDay = 1;
    user.streakCount = 0;
    user.lastSentDate = null;
    user.completedTopics = [];

    await user.save();
    
    res.json({ message: 'Payment successful! Your schedule is set and your streak begins now.' });

  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ message: 'Server error during payment verification.' });
  }
};