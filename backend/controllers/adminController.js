// ✅ adminController.js
import Topic from '../models/Topic.js';

export const getTopics = async (req, res) => {
  const topics = await Topic.find();
  res.json(topics);
};

export const addTopic = async (req, res) => {
  const { order, language, level, explanation, leetcode, youtube } = req.body;
  const topic = await Topic.create({ order, language, level, explanation, leetcode, youtube });
  res.json({ message: 'Topic added.', topic });
};

export const editTopic = async (req, res) => {
  const { id } = req.params;
  const { order, language, level, explanation, leetcode, youtube } = req.body;
  const topic = await Topic.findByIdAndUpdate(id, { order, language, level, explanation, leetcode, youtube }, { new: true });
  res.json({ message: 'Topic updated.', topic });
};


export const deleteTopic = async (req, res) => {
  const { id } = req.params;
  await Topic.findByIdAndDelete(id);
  res.json({ message: 'Topic deleted.' });
};
