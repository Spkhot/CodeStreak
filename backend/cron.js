import cron from 'node-cron';
import User from './models/User.js';
import Topic from './models/Topic.js';
import twilio from './config/twilio.js';
import moment from 'moment-timezone';

// This set stores the IDs of users currently being processed to prevent race conditions.
const processingUsers = new Set();

// Helper function to determine a user's access level based on their subscription.
const getUserAccessLevel = (user, language) => {
    if (!user.subscriptions || user.subscriptions.length === 0) {
        return 'Free';
    }
    if (user.subscriptions.some(sub => sub.level === 'Bundle')) {
        return 'Pro'; // Bundle gives Pro access to everything
    }
    const langSub = user.subscriptions.find(sub => sub.language === language);
    if (!langSub) {
        return 'Free';
    }
    return langSub.level; // Returns "Advanced" or "Pro"
};

// Helper function to check for and award new achievements.
const checkAndAwardAchievements = (user) => {
    const day = user.currentDay; // This is the day number they just *completed*.
    const streak = user.streakCount;
    const newAchievements = [];

    const awardBadge = (badgeName) => {
        if (!user.achievements.includes(badgeName)) {
            user.achievements.push(badgeName);
            newAchievements.push(badgeName);
        }
    };

    // Define the rules for each badge
    if (day === 1) awardBadge('INITIATED');
    if (streak === 7) awardBadge('7_DAY_STREAK');
    if (streak === 15) awardBadge('15_DAY_STREAK');
    if (day === 20) awardBadge('HALF_WAY');
    if (day === 40) awardBadge('COURSE_COMPLETE');

    const todayDayOfWeek = moment().tz(user.timeZone).day(); // 0=Sunday, 6=Saturday
    if (todayDayOfWeek === 0 || todayDayOfWeek === 6) {
        awardBadge('WEEKEND_WARRIOR');
    }

    return newAchievements;
};


// Schedule the main job to run once every minute.
cron.schedule('* * * * *', async () => {
  console.log('====================================================');
  console.log(`⏰ Cron Job Running at: ${moment().utc().format()}`);

  try {
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
      // 1. Lock Check: Prevent processing the same user simultaneously.
      if (processingUsers.has(user._id.toString())) {
        console.log(`-> ⏩ User ${user.name} is already being processed. Skipping.`);
        continue;
      }
      
      // 2. Date Check: Ensure we only send one message per day per user.
      const todayInUserTz = moment().tz(user.timeZone).format('YYYY-MM-DD');
      if (user.lastSentDate === todayInUserTz) {
        console.log(`-> ⏩ Message for ${user.name} was already sent today (${todayInUserTz}). Skipping.`);
        continue;
      }
      
      // 3. Time Check: See if it's the user's scheduled time.
      const userScheduledTime = user.deliveryTime;
      const currentTimeInUserTz = moment().tz(user.timeZone).format('HH:mm');

      console.log(`-> Checking ${user.name}: Their time is ${userScheduledTime}. Current time in their zone is ${currentTimeInUserTz}.`);

      if (userScheduledTime === currentTimeInUserTz) {
        try {
          // Lock the user
          processingUsers.add(user._id.toString());
          console.log(`🚀 It's a match for ${user.name}! [LOCKED]`);

          const userAccess = getUserAccessLevel(user);
          const dayToSend = user.currentDay;
          console.log(`-> User: ${user.name}, Day to send: ${dayToSend}, Access Level: ${userAccess}`);
          
          let shouldSend = false;
          if (dayToSend <= 20) { shouldSend = true; } 
          else if (dayToSend <= 30) { if (userAccess === 'Advanced' || userAccess === 'Pro') shouldSend = true; } 
          else if (dayToSend <= 40) { if (userAccess === 'Pro') shouldSend = true; }

          if (!shouldSend && dayToSend <= 40) {
            console.log(`-|> User ${user.name} has hit the paywall.`);
            const upgradeMessage = `Hey ${user.name}! You've completed all content for your current plan. To unlock Day ${dayToSend} and continue your journey, please upgrade your subscription on our website!\n\nhttps://thehabitloopv1.onrender.com/#pricing`;
            await twilio.messages.create({ body: upgradeMessage, from: process.env.TWILIO_PHONE_NUMBER, to: `whatsapp:${user.whatsapp}` });
            user.isPaused = true;
            user.lastSentDate = todayInUserTz;
            await user.save();
            console.log(`-|> Upgrade message sent and user paused.`);
            continue;
          }
          
          if (dayToSend > 40) {
            console.log(`-|> User ${user.name} has completed the course!`);
            user.isPaused = true;
            await user.save();
            continue;
          }
          
          const topic = await Topic.findOne({ order: dayToSend, language: user.language });
          if (!topic) {
            console.log(`❌ No topic content found for ${user.name} for day ${dayToSend}.`);
            continue;
          }

          // Update DB first
          user.completedTopics.push({ order: topic.order, explanation: topic.explanation, leetcode: topic.leetcode, youtube: topic.youtube });
          
          const newBadges = checkAndAwardAchievements(user);
          user.currentDay += 1;
          user.streakCount += 1;
          user.lastSentDate = todayInUserTz;
          
          await user.save();
          console.log(`✅ Database updated for ${user.name}.`);
          if (newBadges.length > 0) {
              console.log(`🏆 ${user.name} unlocked new achievements: ${newBadges.join(', ')}`);
          }

          // Send WhatsApp Message
          try {
            const maxLength = 1500;
            const explanationChunks = [];
            for (let i = 0; i < topic.explanation.length; i += maxLength) {
              explanationChunks.push(topic.explanation.substring(i, i + maxLength));
            }
            for (const chunk of explanationChunks) {
              await twilio.messages.create({
                body: `*📅 Day ${topic.order}: ${topic.title || 'New Topic'}*\n\n${chunk}`,
                from: process.env.TWILIO_PHONE_NUMBER, to: `whatsapp:${user.whatsapp}`
              });
            }
            const links = `*🔗 Today's Resources:*\n\n*Question:* ${topic.leetcode || 'N/A'}\n*YouTube:* ${topic.youtube || 'N/A'}`;
            await twilio.messages.create({
              body: links,
              from: process.env.TWILIO_PHONE_NUMBER, to: `whatsapp:${user.whatsapp}`
            });
            console.log(`✔️ Message sent successfully to ${user.name}.`);
            
            if (newBadges.length > 0) {
                const badgeMessage = `🎉 Congratulations! You've unlocked a new badge: *${newBadges[0].replace(/_/g, ' ')}*! Keep up the great work.`;
                await twilio.messages.create({
                    body: badgeMessage,
                    from: process.env.TWILIO_PHONE_NUMBER, to: `whatsapp:${user.whatsapp}`
                });
            }
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
  } catch (dbError) {
      console.error("❌❌ Could not fetch users from database:", dbError);
  } finally {
      console.log('--- Cron check finished ---');
      console.log('====================================================\n');
  }
});

console.log('✅ Cron job scheduled. It will run every minute.');