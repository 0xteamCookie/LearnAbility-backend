import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getAllQuizzes,
  getQuizById,
  generateQuizHandler,
  createQuiz,
  deleteQuiz,
  submitQuizAttempt,
  getQuizAttempts,
} from '../handler/quiz.handler';

const router = Router();

router.use(authenticate);

router.get('/', getAllQuizzes);
router.get('/:id', getQuizById);
router.post('/', createQuiz);
router.post('/generate', generateQuizHandler);
router.delete('/:id', deleteQuiz);
router.post('/:id/attempt', submitQuizAttempt);
router.get('/:id/attempts', getQuizAttempts);

export { router as quizRoutes };
