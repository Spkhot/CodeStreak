import cron from 'node-cron';
import User from './models/User.js';
import Topic from './models/Topic.js';
import twilio from './config/twilio.js';

cron.schedule('*/1 * * * *', async () => {
  console.log('⏰ Cron running: Checking users');

  const users = await User.find({ isPaused: false });
  console.log(`🔍 Found ${users.length} users`);

  const now = new Date();
  const nowH = now.getHours();
  const nowM = now.getMinutes();

  for (const user of users) {
    if (!user.deliveryTime) {
      console.log(`⚠️ User ${user.name} has no deliveryTime`);
      continue;
    }

    const [h, m] = user.deliveryTime.split(':').map(Number);
    console.log(`🕒 now=${nowH}:${nowM} vs user=${h}:${m}`);

    if (nowH === h && nowM === m) {
  console.log(`🚀 Sending to ${user.name} at ${user.whatsapp}`);

  try {
    const topic = await Topic.findOne({
      order: user.currentDay,
      language: user.language,
      level: user.level
    });

    if (!topic) {
      console.log(`❌ No topic found for ${user.name}`);
      continue;
    }

    console.log(`📏 Explanation length: ${topic.explanation.length}`);

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

    const links = `🔗 Resources:\nLeetCode: ${topic.leetcode}\nYouTube: ${topic.youtube}`;
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

