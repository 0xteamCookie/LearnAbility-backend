import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getStats } from '../handler/stats.handler';

const router = Router();

router.get('/stats:id', authenticate, getStats);

export { router as authRoutes };
