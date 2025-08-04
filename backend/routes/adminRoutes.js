// ✅ adminRoutes.js
import express from 'express';
import { getTopics, addTopic, editTopic, deleteTopic } from '../controllers/adminController.js';

const router = express.Router();

router.get('/topics', getTopics);
router.post('/topics', addTopic);
router.put('/topics/:id', editTopic);
router.delete('/topics/:id', deleteTopic);

export default router;
