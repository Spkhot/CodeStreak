import express from 'express';
import { setSchedule, getMe, togglePause , deleteUser , updateTime, updateNumber} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/set-schedule', protect, setSchedule);
router.get('/me', protect, getMe);
router.post('/pause', protect, togglePause);
router.delete('/delete', protect, deleteUser);
router.patch('/update-time', protect, updateTime);
router.patch('/update-number', protect, updateNumber);
export default router;
