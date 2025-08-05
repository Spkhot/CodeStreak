import cron from 'node-cron';
import User from './models/User.js';
import Topic from './models/Topic.js';
import twilio from './config/twilio.js';
// ✅✅✅ 1. IMPORT THE MOMENT-TIMEZONE LIBRARY ✅✅✅
import moment from 'moment-timezone';

// The cron job still runs every minute
cron.schedule('* * * * *', async () => {
  console.log('⏰ Cron running: Checking for scheduled messages...');

  // Find all users who are not paused and have a schedule set up
  const users = await User.find({
    isPaused: false,
    deliveryTime: { $ne: null, $exists: true },
    timeZone: { $ne: null, $exists: true } // Also ensure they have a timezone
  });

  if (users.length === 0) {
    console.log("-> No users scheduled for this minute. Waiting...");
    return;
  }
  
  console.log(`🔍 Found ${users.length} active users with schedules.`);
  
  // ✅✅✅ 2. GET THE CURRENT TIME IN UTC USING MOMENT ✅✅✅
  // This is a reliable way to get the "world clock" time, which is what your server runs on.
  const nowInUTC = moment.utc();

  for (const user of users) {
    // Get the user's saved time and time zone
    const userTimeZone = user.timeZone;     // e.g., "Asia/Kolkata"
    const [hour, minute] = user.deliveryTime.split(':'); // e.g., ["03", "15"]

    // ✅✅✅ 3. THE CORE LOGIC: CONVERT USER'S TIME TO UTC ✅✅✅
    // Create a moment object representing the user's desired delivery time for TODAY,
    // interpreted IN THEIR OWN TIME ZONE.
    const deliveryTimeInUserTz = moment().tz(userTimeZone).hour(hour).minute(minute);

    // Now, check if the current UTC time is the same minute as the user's
    // calculated delivery time (also in UTC).
    console.log(`-> Checking ${user.name}: Their time (${hour}:${minute} in ${userTimeZone}) is ${deliveryTimeInUserTz.utc().format('HH:mm')} UTC. Current UTC is ${nowInUTC.format('HH:mm')}`);
    
    if (nowInUTC.isSameOrAfter(deliveryTimeInUserTz) && nowInUTC.diff(deliveryTimeInUserTz, 'minutes') < 1) {
      console.log(`🚀 It's a match! Sending message to ${user.name} at ${user.whatsapp}`);

      try {
        const topic = await Topic.findOne({
          order: user.currentDay,
          language: user.language,
          level: user.level
        });

        if (!topic) {
          console.log(`❌ No topic found for ${user.name} for day ${user.currentDay}`);
          continue;
        }

        // --- All your Twilio message sending logic remains the same ---
        const maxLength = 1400;
        const explanationChunks = [];
        for (let i = 0; i < topic.explanation.length; i += maxLength) {
          explanationChunks.push(topic.explanation.substring(i, i + maxLength));
        }

        for (const chunk of explanationChunks) {
          await twilio.messages.create({
            body: `📅 Day ${user.currentDay}\n\n${chunk}`,
            from: 'whatsapp:+14155238886',
            to: `whatsapp:${user.whatsapp}`
          });
        }

        const links = `🔗 Resources:\nQuestion: ${topic.leetcode}\nYouTube: ${topic.youtube}`;
        await twilio.messages.create({
          body: links,
          from: 'whatsapp:+14155238886',
          to: `whatsapp:${user.whatsapp}`
        });
        
        console.log(`✅ Sent Day ${user.currentDay} to ${user.name}`);

        user.completedTopics.push({
          order: topic.order,
          explanation: topic.explanation,
          leetcode: topic.leetcode,
          youtube: topic.youtube
        });

        user.currentDay += 1;
        await user.save();

      } catch (err) {
        console.error(`❌ Error sending to ${user.name}:`, err);
      }
    }
  }
});