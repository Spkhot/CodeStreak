import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema({
  order: {
    type: Number,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  level: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
    required: true
  },
  leetcode: {
    type: String
  },
  youtube: {
    type: String
  }
});

export default mongoose.model('Topic', topicSchema);
