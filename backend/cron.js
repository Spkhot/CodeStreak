import cron from 'node-cron';
import User from './models/User.js';
import Topic from './models/Topic.js';
import twilio from './config/twilio.js';
import moment from 'moment-timezone';

// ✅✅✅ 1. CREATE A "LOCK" TO PREVENT DOUBLE RUNS ✅✅✅
// This set will store the IDs of users currently being processed.
const processingUsers = new Set();

cron.schedule('* * * * *', async () => {
  console.log('⏰ Cron running: Checking for scheduled messages...');

  const users = await User.find({
    isPaused: false,
    deliveryTime: { $ne: null, $exists: true },
    timeZone: { $ne: null, $exists: true }
  });

  if (users.length === 0) {
    console.log("-> No users scheduled for this minute. Waiting...");
    return;
  }
  
  const nowInUTC = moment.utc();

  for (const user of users) {
    // ✅✅✅ 2. CHECK THE LOCK ✅✅✅
    // If we are already processing this user, skip them for this run.
    if (processingUsers.has(user._id.toString())) {
      console.log(`-> ⏩ User ${user.name} is already being processed. Skipping.`);
      continue;
    }

    const userTimeZone = user.timeZone;
    const [hour, minute] = user.deliveryTime.split(':');
    const deliveryTimeInUserTz = moment().tz(userTimeZone).hour(hour).minute(minute);

    if (nowInUTC.isSameOrAfter(deliveryTimeInUserTz) && nowInUTC.diff(deliveryTimeInUserTz, 'minutes') < 1) {
      
      try {
        // ✅✅✅ 3. APPLY THE LOCK ✅✅✅
        // Add the user's ID to the set to "lock" them.
        processingUsers.add(user._id.toString());
        console.log(`🚀 It's a match for ${user.name}! [LOCKED]`);

        const topic = await Topic.findOne({
          order: user.currentDay,
          language: user.language,
          level: user.level
        });

        if (!topic) {
          console.log(`❌ No topic found for ${user.name} for day ${user.currentDay}.`);
          continue; // continue will go to the finally block to release the lock
        }

        // --- Your existing logic remains the same ---
        // 1. Update DB
        console.log(`💾 Updating progress for ${user.name} to Day ${user.currentDay + 1}...`);
        user.completedTopics.push({
          order: topic.order,
          explanation: topic.explanation,
          leetcode: topic.leetcode,
          youtube: topic.youtube
        });
        user.currentDay += 1;
        user.streakCount += 1;
        await user.save();
        console.log(`✅ Database updated for ${user.name}.`);

        // 2. Send Twilio Message
        console.log(`📲 Attempting to send WhatsApp message to ${user.name}...`);
        // ... (your twilio sending code)
        const maxLength = 1400;
        const explanationChunks = [];
        for (let i = 0; i < topic.explanation.length; i += maxLength) {
          explanationChunks.push(topic.explanation.substring(i, i + maxLength));
        }
        for (const chunk of explanationChunks) {
          await twilio.messages.create({ body: `📅 Day ${topic.order}\n\n${chunk}`, from: 'whatsapp:+14155238886', to: `whatsapp:${user.whatsapp}` });
        }
        const links = `🔗 Resources:\nQuestion: ${topic.leetcode}\nYouTube: ${topic.youtube}`;
        await twilio.messages.create({ body: links, from: 'whatsapp:+14155238886', to: `whatsapp:${user.whatsapp}` });
        console.log(`✔️ Message sent successfully to ${user.name}.`);

      } catch (err) {
        console.error(`❌❌ An error occurred for ${user.name}:`, err);
      } finally {
        // ✅✅✅ 4. RELEASE THE LOCK ✅✅✅
        // No matter what happens (success or error), we MUST remove the user's ID
        // from the set so they can be processed again tomorrow.
        processingUsers.delete(user._id.toString());
        console.log(`[UNLOCKED] Processing finished for ${user.name}.`);
      }
    }
  }
});