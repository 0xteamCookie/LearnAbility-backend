import { Router } from 'express';
import { getProfile, login, logout, register } from '../handler/auth.handler';
import { authenticate } from '../middleware/auth.middleware';
import validate from '../middleware/validate.middleware';
import { registerSchema, loginSchema } from '../schemas/auth.schema';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and profile management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserRegisterInput:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - name
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           description: User's chosen password (min 6 characters recommended)
 *         name:
 *           type: string
 *           description: User's full name
 *         standard:
 *           type: string
 *           description: User's standard/grade level
 *         interests:
 *           type: array
 *           items:
 *             type: string
 *           description: User's interests
 *       example:
 *         email: user@example.com
 *         password: password123
 *         name: Jane Doe
 *         standard: "10th Grade"
 *         interests: ["Physics", "Programming"]
 *     UserLoginInput:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 *       example:
 *         email: user@example.com
 *         password: password123
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           # format: uuid # Prisma uses String for IDs by default
 *         email:
 *           type: string
 *           format: email
 *         name:
 *           type: string
 *         standard:
 *           type: string
 *           description: User's standard/grade level
 *         interests:
 *           type: array
 *           items:
 *             type: string
 *           description: User's interests
 *         syllabusContent:
 *           type: string
 *           nullable: true
 *           description: Raw syllabus content uploaded by user (if any)
 *         createdAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: "user_abc123def456"
 *         email: user@example.com
 *         name: Jane Doe
 *         standard: "10th Grade"
 *         interests: ["Physics", "Programming"]
 *         syllabusContent: null
 *         createdAt: 2025-03-31T18:00:00.000Z
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *       example:
 *         message: Invalid credentials
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegisterInput'
 *     responses:
 *       '201':
 *         description: User registered successfully. Returns user profile and sets auth cookie.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       '400':
 *         description: Bad Request (e.g., validation error, email already exists)
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
router.post('/register', validate(registerSchema), register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in an existing user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLoginInput'
 *     responses:
 *       '200':
 *         description: Login successful. Returns user profile and sets auth cookie.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       '400':
 *         description: Bad Request (e.g., validation error)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Unauthorized (Invalid credentials)
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
router.post('/login', validate(loginSchema), login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out the current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Logout successful. Clears auth cookie.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               example:
 *                 message: Logged out successfully
 *       '401':
 *         description: Unauthorized (No token or invalid token)
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
router.post('/logout', authenticate, logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get the profile of the currently authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: User profile retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       '401':
 *         description: Unauthorized (No token or invalid token)
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
router.get('/me', authenticate, getProfile);

export { router as authRoutes };
