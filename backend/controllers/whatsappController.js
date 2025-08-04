import User from '../models/User.js';
import Topic from '../models/Topic.js';
import client from '../config/twilio.js';

export const sendDailyWhatsApp = async () => {
  const today = new Date();

  const users = await User.find({ isVerified: true, isPaused: false });

  for (const user of users) {
    if (!user.language || !user.level || !user.deliveryTime) continue;

    const topic = await Topic.findOne({ day: user.currentDay, language: user.language, level: user.level });
    if (!topic) continue;

    const message = `🔥 Day ${topic.day} - ${topic.explanation}\nLeetCode: ${topic.leetcode}\nYouTube: ${topic.youtube}`;

    await client.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_NUMBER}`,
      to: `whatsapp:${user.whatsapp}`,
    });

    user.completedTopics.push({
      order: topic.day,
      explanation: topic.explanation,
      leetcode: topic.leetcode,
      youtube: topic.youtube,
    });

    user.currentDay += 1;
    await user.save();
  }
};
