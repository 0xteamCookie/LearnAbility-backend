import { Router } from 'express';
import { getProfile, login, logout, register } from '../handler/auth.handler';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getProfile);

export { router as authRoutes };
