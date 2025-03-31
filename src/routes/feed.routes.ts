import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { showUserFeed } from '../handler/feed.handler';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Feed
 *   description: User's personalized learning feed
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     FeedItem: # Define the structure of a single feed item
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [lesson_suggestion, quiz_reminder, new_material, progress_update] # Example types
 *           description: Type of feed item
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         relatedId: # e.g., lessonId, quizId, subjectId
 *           type: string
 *           format: uuid
 *         timestamp:
 *           type: string
 *           format: date-time
 *       example:
 *         type: lesson_suggestion
 *         title: "Continue Learning: Introduction to Calculus"
 *         description: "You left off on lesson 3. Keep going!"
 *         relatedId: "lesson_calc_intro_3"
 *         timestamp: "2025-03-31T20:00:00.000Z"
 *     UserFeed:
 *       type: array
 *       items:
 *         $ref: '#/components/schemas/FeedItem'
 *     # Re-use ErrorResponse if defined globally
 *     # ErrorResponse:
 *     #   type: object
 *     #   properties:
 *     #     message:
 *     #       type: string
 */

router.use(authenticate);

/**
 * @swagger
 * /feed: # Note: Path from index.ts is /api/v1/feed
 *   get:
 *     summary: Retrieve the personalized learning feed for the authenticated user
 *     tags: [Feed]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Successfully retrieved the user's feed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserFeed'
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
router.get('/', showUserFeed);

export { router as feedRoutes };
