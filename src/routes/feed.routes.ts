import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { showUserFeed } from '../handler/feed.handler';

const router = Router();

router.use(authenticate);

router.get('/', showUserFeed);

export { router as feedRoutes };
