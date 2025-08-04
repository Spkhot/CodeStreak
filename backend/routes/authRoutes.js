import express from 'express';
import {
  signup,
  verify,
  login,
  googleAuth,
  forgot,
  reset,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', signup);
router.get('/verify', verify);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/forgot', forgot);
router.post('/reset', reset);

export default router;
