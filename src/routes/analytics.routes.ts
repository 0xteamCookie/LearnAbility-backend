import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import validate from '../middleware/validate.middleware';
import { quizIdParamSchema } from '../schemas/quiz.schema';
import {
  getQuizAnalyticsHandler,
  getUserQuizAnalyticsHandler,
} from '../handler/quiz-analytics.handler';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: User learning and quiz performance analytics
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserQuizAnalytics:
 *       type: object
 *       properties:
 *         totalQuizzesAttempted:
 *           type: integer
 *         averageScore:
 *           type: number
 *           format: float
 *         # Add more overall analytics fields as needed
 *       example:
 *         totalQuizzesAttempted: 15
 *         averageScore: 75.5
 *     QuizAnalytics:
 *       type: object
 *       properties:
 *         quizId:
 *           type: string
 *           format: uuid
 *         quizTitle:
 *           type: string
 *         numberOfAttempts:
 *           type: integer
 *         averageScore:
 *           type: number
 *           format: float
 *         # Add more specific quiz analytics fields as needed (e.g., common mistakes)
 *       example:
 *         quizId: quiz123abc
 *         quizTitle: Introduction to Algebra
 *         numberOfAttempts: 5
 *         averageScore: 82.0
 *     # Re-use ErrorResponse from auth.routes.ts if defined globally, or define here if needed
 *     # ErrorResponse:
 *     #   type: object
 *     #   properties:
 *     #     message:
 *     #       type: string
 *     #   example:
 *     #     message: Analytics data not found
 */

router.use(authenticate);

/**
 * @swagger
 * /analytics/quizzes:
 *   get:
 *     summary: Retrieve overall quiz analytics for the authenticated user
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: User's overall quiz performance analytics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserQuizAnalytics'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse' # Assuming ErrorResponse is defined
 *       '500':
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/quizzes', getUserQuizAnalyticsHandler);

/**
 * @swagger
 * /analytics/quizzes/{id}:
 *   get:
 *     summary: Get analytics for a specific quiz for the authenticated user
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid # Or appropriate format for your quiz IDs
 *         description: ID of the quiz to retrieve analytics for
 *     responses:
 *       '200':
 *         description: Analytics for the specified quiz
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuizAnalytics'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Quiz or analytics data not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/quizzes/:id', validate(quizIdParamSchema), getQuizAnalyticsHandler);

export { router as analyticsRoutes };
