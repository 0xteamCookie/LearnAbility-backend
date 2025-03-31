import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import validate from '../middleware/validate.middleware';
import { queryInputSchema } from '../schemas/query.schema';
import { answerUserQuery } from '../handler/query.handler';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Query
 *   description: Semantic search and question answering using Milvus vector search
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     QueryInput:
 *       type: object
 *       required:
 *         - query
 *       properties:
 *         query:
 *           type: string
 *           description: The user's question or search query
 *         subjectId: # Optional filtering
 *           type: string
 *           format: uuid
 *           description: ID of a specific subject to limit the search scope (optional)
 *       example:
 *         query: "Explain the process of photosynthesis."
 *         subjectId: "subj_abc123"
 *     QueryResponse:
 *       type: object
 *       properties:
 *         answer:
 *           type: string
 *           description: The generated answer based on retrieved context
 *         sources: # Example: Include sources used for the answer
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               documentId:
 *                 type: string
 *                 format: uuid
 *               snippet: # Or relevant chunk of text
 *                 type: string
 *               score: # Relevance score from Milvus
 *                 type: number
 *                 format: float
 *       example:
 *         answer: "Photosynthesis is the process used by plants..."
 *         sources:
 *           - documentId: "doc_xyz789"
 *             snippet: "...chlorophyll absorbs sunlight..."
 *             score: 0.95
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
 * /user-query: # Note: Path from index.ts is /api/v1/user-query
 *   post:
 *     summary: Answer a user query using semantic search over indexed data sources
 *     tags: [Query]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QueryInput'
 *     responses:
 *       '200':
 *         description: Successfully generated an answer to the query
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QueryResponse'
 *       '400':
 *         description: Bad Request (e.g., empty query)
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
 *         description: Internal Server Error (e.g., Milvus connection issue, AI generation failed)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', validate(queryInputSchema), answerUserQuery);

export { router as queryRoutes };
