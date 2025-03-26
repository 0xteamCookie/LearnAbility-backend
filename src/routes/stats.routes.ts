import express from 'express';
import { getStats, markLessonCompleted, trackStudyActivity } from '../handler/stats.handler';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/', authenticate, getStats);
router.post('/lesson/:lessonId/complete', authenticate, markLessonCompleted);
router.post('/track', authenticate, trackStudyActivity);

export { router as statsRoutes };
