// import cron from 'node-cron';
// import User from './models/User.js';
// import Topic from './models/Topic.js';
// import twilio from './config/twilio.js';
// import moment from 'moment-timezone';

// // This set stores the IDs of users currently being processed to prevent race conditions.
// const processingUsers = new Set();

// // Schedule the job to run once every minute.
// cron.schedule('* * * * *', async () => {
//   console.log('====================================================');
//   console.log(`⏰ Cron Job Running at: ${moment().format()}`);

//   const nowInUTC = moment.utc();

//   // Find all users who are active and have a schedule.
//   const users = await User.find({
//     isPaused: false,
//     deliveryTime: { $ne: null, $exists: true },
//     timeZone: { $ne: null, $exists: true }
//   });

//   if (users.length === 0) {
//     console.log("-> No active users with a schedule found. Waiting...");
//     console.log('====================================================\n');
//     return;
//   }
  
//   console.log(`--- Checking ${users.length} user(s) ---`);

//   for (const user of users) {
//     // 1. LOCK CHECK: If we are already processing this user, skip them for this run.
//     if (processingUsers.has(user._id.toString())) {
//       console.log(`-> ⏩ User ${user.name} is already being processed. Skipping.`);
//       continue;
//     }

//     // 2. DATE CHECK: The ultimate safeguard against double sending on the same day.
//     const todayInUserTz = moment().tz(user.timeZone).format('YYYY-MM-DD');
//     if (user.lastSentDate === todayInUserTz) {
//       console.log(`-> ⏩ Message for ${user.name} was already sent today (${todayInUserTz}). Skipping.`);
//       continue;
//     }

//     // 3. TIME CHECK: Convert user's local time to UTC for comparison.
//     const userTimeZone = user.timeZone;

// // ✅✅✅ THE FIX: COMPARE THE CURRENT MINUTE IN THE USER'S TIMEZONE ✅✅✅
// // Get the current time and immediately convert it to the user's local timezone.
// const nowInUserTz = moment().tz(userTimeZone);

// // Format both the user's saved time and the current time into a simple "HH:mm" string.
// const userScheduledTime = user.deliveryTime; // e.g., "15:00"
// const currentTimeInUserTz = nowInUserTz.format('HH:mm'); // e.g., "15:00"

// console.log(`-> Checking ${user.name}: Their time is ${userScheduledTime}. Current time in their zone is ${currentTimeInUserTz}.`);

// // Now the check is a simple and perfect string comparison.
// if (userScheduledTime === currentTimeInUserTz) {
//     // ... your logic to send the message
      
//       try {
//         // 4. APPLY LOCK: Prevent another cron run from picking up this user.
//         processingUsers.add(user._id.toString());
//         console.log(`🚀 It's a match for ${user.name}! [LOCKED]`);

//         const topic = await Topic.findOne({
//           order: user.currentDay,
//           language: user.language,
//           level: user.level
//         });

//         if (!topic) {
//           console.log(`❌ No topic found for ${user.name} for course day ${user.currentDay}.`);
//           continue; // Skips to the 'finally' block to release the lock.
//         }

//         // 5. UPDATE DATABASE FIRST (so progress is saved even if Twilio fails)
//         console.log(`💾 Updating progress for ${user.name} from Day ${user.currentDay} to ${user.currentDay + 1}...`);
        
//         user.completedTopics.push({
//           order: topic.order,
//           explanation: topic.explanation,
//           leetcode: topic.leetcode,
//           youtube: topic.youtube
//         });
//         user.currentDay += 1;
//         user.streakCount += 1;
//         user.lastSentDate = todayInUserTz; // Mark that a message was sent today.

//         await user.save();
//         console.log(`✅ Database updated for ${user.name}.`);

//         // 6. SEND WHATSAPP MESSAGE (in a separate try/catch)
//         try {
//           console.log(`📲 Attempting to send WhatsApp message to ${user.name}...`);
//           const maxLength = 1500; // WhatsApp message limit is around 1600 characters
//           const explanationChunks = [];
//           for (let i = 0; i < topic.explanation.length; i += maxLength) {
//             explanationChunks.push(topic.explanation.substring(i, i + maxLength));
//           }

//           // Send the main content in chunks
//           for (const chunk of explanationChunks) {
//             await twilio.messages.create({
//               body: `*📅 Day ${topic.order}: ${topic.title || 'New Topic'}*\n\n${chunk}`,
//               from: 'whatsapp:+14155238886',
//               to: `whatsapp:${user.whatsapp}`
//             });
//           }

//           // Send the links as a separate message
//           const links = `*🔗 Today's Resources:*\n\n*Question:* ${topic.leetcode || 'N/A'}\n*YouTube:* ${topic.youtube || 'N/A'}`;
//           await twilio.messages.create({
//             body: links,
//             from: 'whatsapp:+14155238886',
//             to: `whatsapp:${user.whatsapp}`
//           });
          
//           console.log(`✔️ Message sent successfully to ${user.name}.`);

//         } catch (twilioError) {
//           // If Twilio fails, we just log it. The user's progress is already saved.
//           console.error(`⚠️ Twilio Error for ${user.name} (Progress was already saved):`, twilioError);
//         }

//       } catch (err) {
//         console.error(`❌❌ A critical error occurred for ${user.name}:`, err);
//       } finally {
//         // 7. RELEASE LOCK: ALWAYS remove the user from the processing set.
//         processingUsers.delete(user._id.toString());
//         console.log(`[UNLOCKED] Processing finished for ${user.name}.`);
//       }
//     }
//   }
//   console.log('--- Cron check finished ---');
//   console.log('====================================================\n');
// });

// console.log('✅ Cron job scheduled. It will run every minute.');

import cron from 'node-cron';
import User from './models/User.js';
import Topic from './models/Topic.js';
import twilio from './config/twilio.js';
import moment from 'moment-timezone';

const processingUsers = new Set();

// ✅✅✅ HELPER FUNCTION TO CHECK ACCESS BASED ON YOUR CURRENT SCHEMA ✅✅✅
const getUserAccessLevel = (user) => {
    if (!user.isSubscribed || !user.subscriptionLevel) {
        return 'Free';
    }
    // Handle the "Bundle" by checking if the string includes it.
    // This assumes your controller sets subscriptionLevel to "Pro" for the bundle, which is the best approach.
    if (user.subscriptionLevel.includes('Bundle') || user.subscriptionLevel === 'Pro') {
        return 'Pro';
    }
    if (user.subscriptionLevel === 'Advanced') {
        return 'Advanced';
    }
    return 'Free'; // Fallback
};


cron.schedule('* * * * *', async () => {
  console.log('====================================================');
  console.log(`⏰ Cron Job Running at: ${moment().format()}`);

  const users = await User.find({
    isPaused: false,
    deliveryTime: { $ne: null, $exists: true },
    timeZone: { $ne: null, $exists: true }
  });

  if (users.length === 0) {
    console.log("-> No active users with a schedule found. Waiting...");
    console.log('====================================================\n');
    return;
  }
  
  console.log(`--- Checking ${users.length} user(s) ---`);

  for (const user of users) {
    if (processingUsers.has(user._id.toString())) {
      console.log(`-> ⏩ User ${user.name} is already being processed. Skipping.`);
      continue;
    }

    const todayInUserTz = moment().tz(user.timeZone).format('YYYY-MM-DD');
    if (user.lastSentDate === todayInUserTz) {
      console.log(`-> ⏩ Message for ${user.name} was already sent today (${todayInUserTz}). Skipping.`);
      continue;
    }
    
    const userScheduledTime = user.deliveryTime;
    const currentTimeInUserTz = moment().tz(user.timeZone).format('HH:mm');

    console.log(`-> Checking ${user.name}: Their time is ${userScheduledTime}. Current time in their zone is ${currentTimeInUserTz}.`);

    if (userScheduledTime === currentTimeInUserTz) {
      try {
        processingUsers.add(user._id.toString());
        console.log(`🚀 It's a match for ${user.name}! [LOCKED]`);

        // ✅✅✅ NEW SUBSCRIPTION LOGIC STARTS HERE ✅✅✅
        const userAccess = getUserAccessLevel(user);
        const dayToSend = user.currentDay;

        console.log(`-> User: ${user.name}, Day: ${dayToSend}, Access Level: ${userAccess}`);
        
        let shouldSend = false;
        if (dayToSend <= 20) { // Beginner & Intermediate
            shouldSend = true;
        } else if (dayToSend <= 30) { // Advanced
            if (userAccess === 'Advanced' || userAccess === 'Pro') shouldSend = true;
        } else if (dayToSend <= 40) { // Pro
            if (userAccess === 'Pro') shouldSend = true;
        }

        if (!shouldSend && dayToSend <= 40) {
            console.log(`-|> User ${user.name} has hit the paywall.`);
            const upgradeMessage = `Hey ${user.name}! You've completed all content for your current plan. To unlock Day ${dayToSend} and continue your journey, please upgrade your subscription on our website!\n\nhttps://thehabitloop.onrender.com/#pricing`;
            
            await twilio.messages.create({
                body: upgradeMessage,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `whatsapp:${user.whatsapp}`
            });
            
            user.isPaused = true;
            user.lastSentDate = todayInUserTz; // Mark as "sent" to avoid re-sending today
            await user.save();
            console.log(`-|> Upgrade message sent and user paused.`);
            continue; // Skip to the 'finally' block
        }
        
        if (dayToSend > 40) {
            console.log(`-|> User ${user.name} has completed the course!`);
            user.isPaused = true;
            await user.save();
            continue; // Skip to the 'finally' block
        }
        
        // --- If shouldSend is true, proceed as normal ---
        const topic = await Topic.findOne({
          order: dayToSend,
          language: user.language,
          // Note: The 'level' in the topic model might need to match 'Beginner', 'Intermediate', etc.
          // This logic assumes you have topics for each day number.
        });

        if (!topic) {
          console.log(`❌ No topic content found for ${user.name} for day ${dayToSend}.`);
          continue;
        }

        console.log(`💾 Updating progress for ${user.name} from Day ${dayToSend} to ${dayToSend + 1}...`);
        user.completedTopics.push({ order: topic.order, explanation: topic.explanation, leetcode: topic.leetcode, youtube: topic.youtube });
        user.currentDay += 1;
        user.streakCount += 1;
        user.lastSentDate = todayInUserTz;
        await user.save();
        console.log(`✅ Database updated for ${user.name}.`);

        try {
          console.log(`📲 Attempting to send WhatsApp message to ${user.name}...`);
          const maxLength = 1500;
          const explanationChunks = [];
          for (let i = 0; i < topic.explanation.length; i += maxLength) {
            explanationChunks.push(topic.explanation.substring(i, i + maxLength));
          }
          for (const chunk of explanationChunks) {
            await twilio.messages.create({
              body: `*📅 Day ${topic.order}: ${topic.title || 'New Topic'}*\n\n${chunk}`,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: `whatsapp:${user.whatsapp}`
            });
          }
          const links = `*🔗 Today's Resources:*\n\n*Question:* ${topic.leetcode || 'N/A'}\n*YouTube:* ${topic.youtube || 'N/A'}`;
          await twilio.messages.create({
            body: links,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `whatsapp:${user.whatsapp}`
          });
          console.log(`✔️ Message sent successfully to ${user.name}.`);
        } catch (twilioError) {
          console.error(`⚠️ Twilio Error for ${user.name} (Progress was already saved):`, twilioError);
        }

      } catch (err) {
        console.error(`❌❌ A critical error occurred for ${user.name}:`, err);
      } finally {
        processingUsers.delete(user._id.toString());
        console.log(`[UNLOCKED] Processing finished for ${user.name}.`);
      }
    }
  }
  console.log('--- Cron check finished ---');
  console.log('====================================================\n');
});

console.log('✅ Cron job scheduled. It will run every minute.');