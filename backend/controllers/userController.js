import User from '../models/User.js';
import Topic from '../models/Topic.js'; // Keep this if you need it for other functions
import razorpay from '../config/razorpay.js';
import crypto from 'crypto';

// // --- CORE USER ACTIONS ---

// // Get data for the logged-in user's dashboard
// export const getMe = async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id).select('-password -verifyToken -resetToken -resetTokenExpires');
//     if (!user) return res.status(404).json({ message: 'User not found' });
//     res.json(user);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error fetching user data.' });
//   }
// };

// // Set the schedule for FREE tiers ("Beginner", "Intermediate")
// export const setSchedule = async (req, res) => {
//   try {
//     const { language, level, deliveryTime, whatsapp, timeZone } = req.body;
//     const user = await User.findById(req.user._id);

//     if (!user) return res.status(404).json({ message: 'User not found' });

//     user.language = language;
//     user.level = level;
//     user.deliveryTime = deliveryTime;
//     user.whatsapp = whatsapp.replace(/[^0-9+]/g, '');
//     user.timeZone = timeZone;
    
//     // Reset progress when setting a new schedule
//     user.currentDay = 1;
//     user.streakCount = 0;
//     user.completedTopics = [];
//     user.lastSentDate = null;
    
//     await user.save();
//     res.json({ message: 'Schedule set successfully!' });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error setting schedule.' });
//   }
// };

// // Pause or resume the user's course
// export const togglePause = async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id);
//     if (!user) return res.status(404).json({ message: 'User not found' });
    
//     const wasPaused = user.isPaused;
//     user.isPaused = !user.isPaused;

//     // When resuming from a pause, reset the streak but not the course progress
//     if (wasPaused && !user.isPaused) {
//       user.streakCount = 0;
//     }
    
//     await user.save();
    
//     const userObject = user.toObject();
//     delete userObject.password;
//     res.json({ message: `Course ${user.isPaused ? 'paused' : 'resumed'}.`, user: userObject });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error pausing course.' });
//   }
// };

// // --- PAYMENT FLOW ---

// // Create a Razorpay order for paid tiers
// export const createOrder = async (req, res) => {
//   try {
//     const { level } = req.body;
    
//     const prices = { 'Advanced': 99, 'Pro': 299, 'Bundle': 199 };
//     const price = prices[level];

//     if (!price) {
//       return res.status(400).json({ message: 'Invalid subscription level for payment.' });
//     }

//     const receiptId = `rcpt_${req.user._id.toString().slice(-6)}_${crypto.randomBytes(4).toString('hex')}`;
//     const options = {
//       amount: price * 100, // Amount in paise
//       currency: "INR",
//       receipt: receiptId,
//     };

//     const order = await razorpay.orders.create(options);
//     res.json({ orderId: order.id, keyId: process.env.RAZORPAY_KEY_ID, amount: order.amount });
//   } catch (error) {
//     console.error("Razorpay order creation error:", error);
//     res.status(500).json({ message: 'Server error while creating payment order.' });
//   }
// };

// // In controllers/userController.js

// export const verifyPaymentAndSetSchedule = async (req, res) => {
//   try {
//     const { 
//       razorpay_order_id, 
//       razorpay_payment_id, 
//       razorpay_signature,
//       language, level, deliveryTime, whatsapp, timeZone 
//     } = req.body;

//     const body = `${razorpay_order_id}|${razorpay_payment_id}`;
//     const expectedSignature = crypto.createHmac('sha2sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');

//     if (expectedSignature !== razorpay_signature) {
//       return res.status(400).json({ message: 'Payment verification failed. Signature mismatch.' });
//     }
    
//     const user = await User.findById(req.user._id);
//     if (!user) return res.status(404).json({ message: 'User not found.' });

//     // ✅✅✅ THIS IS THE CORRECT LOGIC FOR YOUR SCHEMA ✅✅✅
    
//     // 1. Mark the user as subscribed
//     user.isSubscribed = true;

//     // 2. Set their subscription level
//     // For the bundle, we set the level to "Pro" to grant them full access.
//     if (level === 'Bundle') {
//         user.subscriptionLevel = 'Pro';
//     } else {
//         user.subscriptionLevel = level;
//     }
    
//     // 3. Save the payment IDs
//     user.razorpayOrderId = razorpay_order_id;
//     user.razorpayPaymentId = razorpay_payment_id;

//     // 4. Save the schedule details
//     // If it's a bundle, set a default language. The user can change this later.
//     if (level === 'Bundle') {
//         user.language = 'C++';
//         user.level = 'Pro';
//     } else {
//         user.language = language;
//         user.level = level;
//     }
    
//     user.deliveryTime = deliveryTime;
//     user.whatsapp = whatsapp.replace(/[^0-9+]/g, '');
//     user.timeZone = timeZone;
    
//     // 5. Reset progress for the new course
//     user.currentDay = 1;
//     user.streakCount = 0;
//     user.lastSentDate = null;
//     user.completedTopics = [];

//     await user.save();
    
//     // Send back the full user object so the dashboard can update
//     const userObject = user.toObject();
//     delete userObject.password;

//     res.json({ 
//         message: 'Payment successful! Your schedule is set.',
//         user: userObject 
//     });

//   } catch (error) {
//     console.error("Payment verification error:", error);
//     res.status(500).json({ message: 'Server error during payment verification.' });
//   }
// };
// // --- ACCOUNT MANAGEMENT ---

// // Update just the delivery time
// export const updateTime = async (req, res) => {
//   const { deliveryTime } = req.body;
//   if (!deliveryTime) return res.status(400).json({ message: 'Delivery time is required.' });
//   const user = await User.findByIdAndUpdate(req.user._id, { deliveryTime }, { new: true }).select('-password');
//   res.json({ message: 'Delivery time updated successfully!', user });
// };

// // Update just the WhatsApp number
// export const updateNumber = async (req, res) => {
//   const { whatsapp } = req.body;
//   if (!whatsapp) return res.status(400).json({ message: 'WhatsApp number is required.' });
//   const cleanedWhatsapp = whatsapp.replace(/[^0-9+]/g, '');
//   const user = await User.findByIdAndUpdate(req.user._id, { whatsapp: cleanedWhatsapp }, { new: true }).select('-password');
//   res.json({ message: 'WhatsApp number updated successfully!', user });
// };

// // Save notes for a completed topic (for Pro Dashboard)
// export const saveTopicNotes = async (req, res) => {
//   try {
//     const { topicOrder, notes } = req.body;
//     const user = await User.findById(req.user._id);
//     const topicToUpdate = user.completedTopics.find(t => t.order === parseInt(topicOrder));
//     if (!topicToUpdate) return res.status(404).json({ message: 'Completed topic not found.' });
//     topicToUpdate.notes = notes;
//     await user.save();
//     res.json({ message: 'Notes saved successfully!' });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error while saving notes.' });
//   }
// };

// // Delete the user's account permanently
// export const deleteUser = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     await User.findByIdAndDelete(userId);
//     res.json({ message: 'Account deleted successfully.' });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error while deleting account.' });
//   }
// };




export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -verifyToken -resetToken -resetTokenExpires');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching user data.' });
  }
};

export const togglePause = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const wasPaused = user.isPaused;
    user.isPaused = !user.isPaused;

    // When resuming from a pause, reset the streak but not the course progress
    if (wasPaused && !user.isPaused) {
      user.streakCount = 0;
    }
    
    await user.save();
    
    const userObject = user.toObject();
    delete userObject.password;
    res.json({ message: `Course ${user.isPaused ? 'paused' : 'resumed'}.`, user: userObject });
  } catch (error) {
    res.status(500).json({ message: 'Server error pausing course.' });
  }
};

export const saveTopicNotes = async (req, res) => {
  try {
    const { topicOrder, notes } = req.body;
    const user = await User.findById(req.user._id);
    const topicToUpdate = user.completedTopics.find(t => t.order === parseInt(topicOrder));
    if (!topicToUpdate) return res.status(404).json({ message: 'Completed topic not found.' });
    topicToUpdate.notes = notes;
    await user.save();
    res.json({ message: 'Notes saved successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error while saving notes.' });
  }
};

// Delete the user's account permanently
export const deleteUser = async (req, res) => {
  try {
    const userId = req.user._id;
    await User.findByIdAndDelete(userId);
    res.json({ message: 'Account deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error while deleting account.' });
  }
};

export const updateTime = async (req, res) => {
  const { deliveryTime } = req.body;
  if (!deliveryTime) return res.status(400).json({ message: 'Delivery time is required.' });
  const user = await User.findByIdAndUpdate(req.user._id, { deliveryTime }, { new: true }).select('-password');
  res.json({ message: 'Delivery time updated successfully!', user });
};

// Update just the WhatsApp number
export const updateNumber = async (req, res) => {
  const { whatsapp } = req.body;
  if (!whatsapp) return res.status(400).json({ message: 'WhatsApp number is required.' });
  const cleanedWhatsapp = whatsapp.replace(/[^0-9+]/g, '');
  const user = await User.findByIdAndUpdate(req.user._id, { whatsapp: cleanedWhatsapp }, { new: true }).select('-password');
  res.json({ message: 'WhatsApp number updated successfully!', user });
};

export const setSchedule = async (req, res) => {
  try {
    const { language, level, deliveryTime, whatsapp, timeZone } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.language = language;
    user.level = level;
    user.deliveryTime = deliveryTime;
    user.whatsapp = whatsapp.replace(/[^0-9+]/g, '');
    user.timeZone = timeZone;
    
    // Reset progress and clear any old subscriptions
    user.currentDay = 1;
    user.streakCount = 0;
    user.completedTopics = [];
    user.lastSentDate = null;
    user.subscriptions = []; 
    
    await user.save();
    res.json({ message: 'Schedule set successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error setting schedule.' });
  }
};

// --- PAYMENT FLOW ---
export const createOrder = async (req, res) => {
  try {
    const { level } = req.body;
    const prices = { 'Advanced': 99, 'Pro': 299, 'Bundle': 199 };
    const price = prices[level];
    if (!price) return res.status(400).json({ message: 'Invalid subscription level.' });

    const receiptId = `rcpt_${req.user._id.toString().slice(-6)}_${Date.now()}`;
    const options = { amount: price * 100, currency: "INR", receipt: receiptId };

    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id, keyId: process.env.RAZORPAY_KEY_ID, amount: order.amount });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating order.' });
  }
};

// ✅✅✅ CORRECTED `verifyPayment` to use the new schema ✅✅✅
export const verifyPaymentAndSetSchedule = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, language, level, deliveryTime, whatsapp, timeZone } = req.body;
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed.' });
    }
    
    const user = await User.findById(req.user._id);
    const paymentInfo = { razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id };

    if (level === 'Bundle') {
        user.subscriptions.push({ language: 'C++', level: 'Pro', ...paymentInfo });
        user.subscriptions.push({ language: 'Java', level: 'Pro', ...paymentInfo });
        user.language = 'C++';
        user.level = 'Pro';
    } else {
        user.subscriptions.push({ language, level, ...paymentInfo });
        user.language = language;
        user.level = level;
    }
    
    if (deliveryTime && whatsapp && timeZone) {
      user.deliveryTime = deliveryTime;
      user.whatsapp = whatsapp.replace(/[^0-9+]/g, '');
      user.timeZone = timeZone;
    }
    
    user.currentDay = 1;
    user.streakCount = 0;
    user.lastSentDate = null;
    user.completedTopics = [];

    await user.save();
    
    const userObject = user.toObject();
    delete userObject.password;
    res.json({ message: 'Payment successful!', user: userObject });
  } catch (error) {
    res.status(500).json({ message: 'Server error during verification.' });
  }
};
export const addCodingProfile = async (req, res) => {
  try {
    const { platform, url } = req.body;
    
    // Basic validation
    if (!platform || !url) {
      return res.status(400).json({ message: 'Platform and URL are required.' });
    }

    // Find the user by their ID (which the 'protect' middleware gives us in req.user._id)
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add the new profile to the user's codingProfiles array
    user.codingProfiles.push({ platform, url });

    // Save the updated user document to the database
    await user.save();
    
    // Send back a success message and the updated user object (without the password)
    const userObject = user.toObject();
    delete userObject.password;
    
    res.status(201).json({ 
      message: 'Profile added successfully!', 
      user: userObject 
    });

  } catch (error) {
    console.error('Error adding coding profile:', error);
    res.status(500).json({ message: 'Server error while adding profile.' });
  }
};

// controllers/userController.js

// ... after your 'addCodingProfile' function ...

// ✅ START: ADD THIS ENTIRE NEW FUNCTION
export const deleteCodingProfile = async (req, res) => {
  try {
    const { profileId } = req.params; // Get the ID from the URL (e.g., /profiles/12345)
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Use the $pull operator to remove an element from an array
    // that matches a specific condition.
    user.codingProfiles.pull({ _id: profileId });

    // Save the changes to the database
    await user.save();

    const userObject = user.toObject();
    delete userObject.password;

    res.json({
      message: 'Profile deleted successfully!',
      user: userObject
    });

  } catch (error) {
    console.error('Error deleting coding profile:', error);
    res.status(500).json({ message: 'Server error while deleting profile.' });
  }
};
// ✅ END: ADD THIS NEW FUNCTION