import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getAllQuizzes,
  getQuizById,
  generateQuizHandler,
  createQuiz,
  deleteQuiz,
  submitQuizAttempt,
} from '../handler/quiz.handler';

const router = Router();

router.use(authenticate);

router.get('/', getAllQuizzes);
router.get('/:id', getQuizById);
router.post('/', createQuiz);
router.post('/generate', generateQuizHandler);
router.delete('/:id', deleteQuiz);
router.post('/:id/attempt', submitQuizAttempt);

export { router as quizRoutes };
