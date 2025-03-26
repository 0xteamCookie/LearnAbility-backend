import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getQuizAnalyticsHandler,
  getUserQuizAnalyticsHandler,
} from '../handler/quiz-analytics.handler';

const router = Router();

router.use(authenticate);

router.get('/quizzes', getUserQuizAnalyticsHandler);
router.get('/quizzes/:id', getQuizAnalyticsHandler);

export { router as analyticsRoutes };
