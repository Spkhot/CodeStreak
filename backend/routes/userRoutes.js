import express from 'express';
import { setSchedule, getMe, togglePause } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/set-schedule', protect, setSchedule);
router.get('/me', protect, getMe);
router.post('/pause', protect, togglePause);

export default router;
