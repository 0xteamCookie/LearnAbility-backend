import express from 'express';
import {
  getStats,
  markLessonCompleted,
  trackStudyActivity,
  updateQuizScore,
} from '../handler/stats.handler';
import { authenticate } from '../middleware/auth.middleware';
import validate from '../middleware/validate.middleware';
import {
  lessonIdParamSchema,
  trackActivitySchema,
  updateQuizScoreSchema,
} from '../schemas/stats.schema';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Stats
 *   description: User learning statistics and progress tracking
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserStats:
 *       # Based on Prisma UserStats model
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           # format: uuid
 *         userId:
 *           type: string
 *           # format: uuid
 *         studyStreak:
 *           type: integer
 *           default: 0
 *           description: Current consecutive days study streak
 *         completedLessons: # Renamed from lessonsCompleted
 *           type: integer
 *           default: 0
 *           description: Total number of lessons completed
 *         weeklyProgress:
 *           type: integer # Prisma model shows Int, interpretation depends on handler
 *           default: 0
 *           description: User's study activity metric for the current week (e.g., minutes, sessions)
 *         quizAverage: # Renamed from overallQuizScore
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Average score across all quizzes attempted
 *         lastStudiedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp of the last recorded study activity
 *       example:
 *         id: "stats_abc123"
 *         userId: "user_pqr456"
 *         studyStreak: 5
 *         completedLessons: 23
 *         weeklyProgress: 120 # Example: 120 minutes studied this week
 *         quizAverage: 78.5
 *         lastStudiedAt: "2025-03-31T10:30:00.000Z"
 *     TrackActivityInput:
 *       type: object
 *       required:
 *         - durationMinutes # Or however you track activity
 *       properties:
 *         durationMinutes:
 *           type: integer
 *           description: Duration of the study session in minutes
 *         activityType:
 *           type: string
 *           description: Type of activity (e.g., 'reading', 'quiz', 'video') (optional)
 *       example:
 *         durationMinutes: 30
 *         activityType: 'reading'
 *     UpdateQuizScoreInput:
 *       type: object
 *       required:
 *         - quizId
 *         - score
 *       properties:
 *         quizId:
 *           type: string
 *           format: uuid
 *           description: ID of the quiz attempted
 *         score:
 *           type: number
 *           format: float # Or integer
 *           description: Score achieved on the quiz
 *       example:
 *         quizId: quiz789xyz
 *         score: 85.0
 *     # Re-use ErrorResponse if defined globally
 *     # ErrorResponse:
 *     #   type: object
 *     #   properties:
 *     #     message:
 *     #       type: string
 */

/**
 * @swagger
 * /stats:
 *   get:
 *     summary: Retrieve learning statistics for the authenticated user
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: User's learning statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserStats'
 *       '401':
 *         description: Unauthorized
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
router.get('/', authenticate, getStats);

/**
 * @swagger
 * /stats/lesson/{lessonId}/complete:
 *   post:
 *     summary: Mark a specific lesson as completed for the authenticated user
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid # Or appropriate format for lesson IDs
 *         description: ID of the lesson to mark as complete
 *     responses:
 *       '200':
 *         description: Lesson marked as completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               example:
 *                 message: Lesson marked as complete
 *       '400':
 *         description: Bad Request (e.g., lesson already completed)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Lesson not found
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
router.post(
  '/lesson/:lessonId/complete',
  authenticate,
  validate(lessonIdParamSchema),
  markLessonCompleted
);

/**
 * @swagger
 * /stats/track:
 *   post:
 *     summary: Track study activity for the authenticated user (e.g., update daily progress, streak)
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TrackActivityInput'
 *     responses:
 *       '200':
 *         description: Study activity tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               example:
 *                 message: Activity tracked
 *       '400':
 *         description: Bad Request (e.g., invalid duration)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Unauthorized
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
router.post('/track', authenticate, validate(trackActivitySchema), trackStudyActivity);

/**
 * @swagger
 * /stats/quiz:
 *   post:
 *     summary: Update user statistics based on a completed quiz score
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateQuizScoreInput'
 *     responses:
 *       '200':
 *         description: Quiz score processed and stats updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               example:
 *                 message: Quiz score updated in stats
 *       '400':
 *         description: Bad Request (e.g., invalid score, quiz ID)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Quiz not found (if validation occurs here)
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
router.post('/quiz', authenticate, validate(updateQuizScoreSchema), updateQuizScore);

export { router as statsRoutes };
