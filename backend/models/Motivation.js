import mongoose from 'mongoose';

const motivationSchema = new mongoose.Schema({
  text: String,
});

export default mongoose.model('Motivation', motivationSchema);
