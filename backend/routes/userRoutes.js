import express from 'express';
import { setSchedule, getMe, togglePause , deleteUser , updateTime, updateNumber , createOrder, verifyPaymentAndSetSchedule ,saveTopicNotes ,addCodingProfile, deleteCodingProfile, saveProject } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/set-schedule', protect, setSchedule);
router.get('/me', protect, getMe);
router.post('/pause', protect, togglePause);
router.delete('/delete', protect, deleteUser);
router.patch('/update-time', protect, updateTime);
router.patch('/update-number', protect, updateNumber);
router.post('/create-order', protect, createOrder);
router.post('/verify-payment', protect, verifyPaymentAndSetSchedule);
router.patch('/notes', protect, saveTopicNotes);
router.post('/profiles', protect, addCodingProfile);
router.delete('/profiles/:profileId', protect, deleteCodingProfile);
router.post('/project', protect, saveProject);
export default router;
