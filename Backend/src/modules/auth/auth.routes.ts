import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 20, // limit each IP to 20 requests per window
});

router.use(authLimiter);

router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);
router.post('/clerk/session', AuthController.clerkSession);
router.get('/me', authenticate, AuthController.me);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

export default router;
