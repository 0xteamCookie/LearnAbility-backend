import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import validate from '../middleware/validate.middleware';
import {
  createQuizSchema,
  generateQuizSchema,
  submitQuizAttemptSchema,
  quizIdParamSchema,
} from '../schemas/quiz.schema';
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

/**
 * @swagger
 * tags:
 *   name: Quiz
 *   description: Quiz management, generation, and attempts
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     QuestionInput:
 *       type: object
 *       required:
 *         - text
 *         - options
 *         - correctAnswer
 *       properties:
 *         text:
 *           type: string
 *           description: The question text
 *         options:
 *           type: array
 *           items:
 *             type: string
 *           description: Possible answers
 *         correctAnswer:
 *           type: string
 *           description: The correct answer (must match one of the options)
 *         difficulty:
 *           type: string
 *           enum: [easy, medium, hard]
 *           description: Difficulty level
 *         explanation:
 *           type: string
 *           nullable: true
 *           description: Explanation for the correct answer (optional)
 *       example:
 *         text: "What is the capital of France?"
 *         options: ["Berlin", "Madrid", "Paris", "Rome"]
 *         correctAnswer: "Paris"
 *         difficulty: "easy"
 *         explanation: "Paris is the capital city of France."
 *     QuizInput:
 *       type: object
 *       required:
 *         - title
 *         - subjectId
 *         - questions
 *       properties:
 *         title:
 *           type: string
 *           description: Title of the quiz
 *         subjectId:
 *           type: string
 *           # format: uuid # Prisma uses String
 *           description: ID of the subject this quiz belongs to (optional, can be linked to lesson)
 *           nullable: true
 *         lessonId:
 *           type: string
 *           # format: uuid
 *           description: ID of the lesson this quiz belongs to (optional, can be linked to subject)
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *           description: Optional description for the quiz
 *         difficulty:
 *           type: string
 *           default: "Medium"
 *           description: Overall quiz difficulty (optional)
 *         questions: # Stored as Json in Prisma
 *           type: array
 *           description: Array of question objects (structure defined by application)
 *           items:
 *             $ref: '#/components/schemas/QuestionInput' # Reference the input schema for creation
 *       example:
 *         title: "French Capitals Quiz"
 *         subjectId: "subj_geo_europe"
 *         description: "Test your knowledge of French geography."
 *         difficulty: "easy"
 *         questions:
 *           - text: "What is the capital of France?"
 *             options: ["Berlin", "Madrid", "Paris", "Rome"]
 *             correctAnswer: "Paris"
 *             difficulty: "easy"
 *     QuizGenerateInput:
 *       type: object
 *       required:
 *         - subjectId
 *         - topic
 *       properties:
 *         subjectId:
 *           type: string
 *           # format: uuid
 *           description: ID of the subject to generate the quiz for (required if no lessonId)
 *           nullable: true
 *         lessonId:
 *           type: string
 *           # format: uuid
 *           description: ID of the lesson to generate the quiz for (required if no subjectId)
 *           nullable: true
 *         topic: # Topic might be implicit if lessonId is provided
 *           type: string
 *           description: Specific topic for the quiz (required if subjectId is provided)
 *           nullable: true
 *         numQuestions:
 *           type: integer
 *           description: Number of questions to generate (default depends on implementation)
 *           example: 5
 *           nullable: true
 *         difficulty:
 *           type: string
 *           enum: [easy, medium, hard]
 *           description: Desired difficulty level (optional)
 *           nullable: true
 *       example:
 *         subjectId: "subj_geo_europe"
 *         topic: "Capital Cities"
 *         numQuestions: 3
 *         difficulty: "medium"
 *     QuizAttemptInput:
 *       type: object
 *       required:
 *         - answers
 *       properties:
 *         answers:
 *           type: array
 *           items:
 *             properties:
 *               questionId:
 *                 type: string # Assuming question IDs/indices are strings or numbers within the JSON
 *                 description: Identifier for the question being answered (e.g., index or unique ID within the quiz JSON)
 *               selectedAnswer:
 *                 type: string
 *                 description: The answer selected by the user
 *           description: Array of user's answers, structure depends on how questions are identified within the JSON
 *       example:
 *         answers:
 *           - questionId: "0" # Example using index
 *             selectedAnswer: "Paris"
 *           - questionId: "1"
 *             selectedAnswer: "Mars"
 *     Quiz:
 *       # Based on Prisma Quiz model
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           # format: uuid
 *         title:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         difficulty:
 *           type: string
 *           default: "Medium"
 *         questions: # Stored as Json
 *           type: object # Or array, depending on how you structure/return it
 *           description: The questions associated with the quiz (structure defined by application). Might omit correctAnswer.
 *           example: [{"text": "Q1?", "options": ["A", "B"], "difficulty": "easy"}, {"text": "Q2?", "options": ["C", "D"], "difficulty": "medium"}]
 *         questionCount:
 *           type: integer
 *           default: 0
 *         timeLimit:
 *           type: integer
 *           nullable: true
 *           description: Time limit in minutes (optional)
 *         passingScore:
 *           type: integer
 *           default: 70
 *           description: Passing score percentage
 *         subjectId:
 *           type: string
 *           nullable: true
 *           # format: uuid
 *         lessonId:
 *           type: string
 *           nullable: true
 *           # format: uuid
 *         userId:
 *           type: string
 *           # format: uuid
 *         attempts: # Stored as Json
 *           type: object # Or array, depending on structure. Likely omitted in general GET requests.
 *           nullable: true
 *           description: Record of attempts made on this quiz (structure defined by application).
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     QuizAttempt:
 *       # Represents an entry within the 'attempts' Json field of the Quiz model
 *       # Structure is defined by application logic, this is an example
 *       type: object
 *       properties:
 *         attemptId: # Example property
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           # format: uuid
 *         submittedAt:
 *           type: string
 *           format: date-time
 *         score:
 *           type: number
 *           format: float # Or integer
 *         answers: # Example: include the submitted answers
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               questionId:
 *                 type: string
 *               selectedAnswer:
 *                 type: string
 *       example:
 *         attemptId: "attempt_xyz123"
 *         userId: "user_abc456"
 *         submittedAt: "2025-03-31T21:00:00.000Z"
 *         score: 85.5
 *         answers: [{"questionId": "0", "selectedAnswer": "Paris"}]
 *
 *   # Placeholder for Question schema if needed separately
 *   # schemas:
 *   #   Question:
 *   #     type: object
 *   #     properties:
 *   #       id: string
 *   #       text: string
 *   #       options: [string]
 *   #       # Don't usually return correctAnswer in GET requests
 *   #       difficulty: string
 *   #       explanation: string
 */

router.use(authenticate);

/**
 * @swagger
 * /quizzes:
 *   get:
 *     summary: Retrieve all quizzes for the authenticated user (or all quizzes if admin - adjust based on logic)
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of quizzes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Quiz' # Use a summary version if full details aren't needed
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
router.get('/', getAllQuizzes);

/**
 * @swagger
 * /quizzes/{id}:
 *   get:
 *     summary: Get a specific quiz by ID
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           # format: uuid # Prisma uses String
 *         description: ID of the quiz to retrieve
 *     responses:
 *       '200':
 *         description: Quiz details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quiz' # Include full details like questions here
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Quiz not found
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
router.get('/:id', validate(quizIdParamSchema), getQuizById);

/**
 * @swagger
 * /quizzes:
 *   post:
 *     summary: Create a new quiz manually
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuizInput'
 *     responses:
 *       '201':
 *         description: Quiz created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quiz'
 *       '400':
 *         description: Bad Request (e.g., validation error)
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
router.post('/', validate(createQuizSchema), createQuiz);

/**
 * @swagger
 * /quizzes/generate:
 *   post:
 *     summary: Generate a quiz using AI based on a subject and topic
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuizGenerateInput'
 *     responses:
 *       '201':
 *         description: Quiz generated and saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quiz'
 *       '400':
 *         description: Bad Request (e.g., subject not found, invalid topic)
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
 *         description: Internal Server Error (e.g., AI generation failed)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/generate', validate(generateQuizSchema), generateQuizHandler);

/**
 * @swagger
 * /quizzes/{id}:
 *   delete:
 *     summary: Delete a specific quiz by ID
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           # format: uuid
 *         description: ID of the quiz to delete
 *     responses:
 *       '204':
 *         description: Quiz deleted successfully (No Content)
 *       '401':
 *         description: Unauthorized (or insufficient permissions)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Quiz not found
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
router.delete('/:id', validate(quizIdParamSchema), deleteQuiz);

/**
 * @swagger
 * /quizzes/{id}/attempt:
 *   post:
 *     summary: Submit an attempt for a specific quiz
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           # format: uuid
 *         description: ID of the quiz being attempted
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuizAttemptInput'
 *     responses:
 *       '201':
 *         description: Quiz attempt submitted and scored successfully
 *         content:
 *           application/json:
 *             schema:
 *               # Define response schema, likely includes score and attempt ID
 *               type: object
 *               properties:
 *                 attemptId:
 *                   type: string
 *                   # format: uuid # Use string as per Prisma
 *                 score:
 *                   type: number
 *                   format: float # Or integer
 *                 maxScore:
 *                   type: number
 *                   format: float # Or integer
 *                 percentage:
 *                   type: number
 *                   format: float # Or integer
 *                 passed:
 *                   type: boolean
 *                 startedAt:
 *                   type: string
 *                   format: date-time
 *                 completedAt:
 *                   type: string
 *                   format: date-time
 *                 answers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       questionId:
 *                         type: string
 *                       givenAnswer:
 *                         type: string
 *                       isCorrect:
 *                         type: boolean
 *                       pointsEarned:
 *                         type: number
 *                       feedback: # Added feedback field
 *                         type: string
 *                         nullable: true
 *                         description: AI-generated feedback for incorrect answers
 *       '400':
 *         description: Bad Request (e.g., validation error, already attempted)
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
 *         description: Quiz not found
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
router.post('/:id/attempt', validate(submitQuizAttemptSchema), submitQuizAttempt);

/**
 * @swagger
 * /quizzes/{id}/attempts:
 *   get:
 *     summary: Retrieve all attempts for a specific quiz by the authenticated user
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           # format: uuid
 *         description: ID of the quiz to retrieve attempts for
 *     responses:
 *       '200':
 *         description: A list of quiz attempts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/QuizAttempt'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Quiz not found
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
router.get('/:id/attempts', validate(quizIdParamSchema), getQuizAttempts);

export { router as quizRoutes };
