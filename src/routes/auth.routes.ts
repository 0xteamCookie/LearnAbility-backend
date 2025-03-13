import { Router } from 'express';
import { getProfile, login, register } from '../handler/auth.handler';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getProfile);

export { router as authRoutes };
