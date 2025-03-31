import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import validate from '../middleware/validate.middleware';
import { quizIdParamSchema } from '../schemas/quiz.schema';
import { optionalSubjectIdBodySchema } from '../schemas/pyos.schema';
import * as sourceHandler from '../handler/source.handler';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: DataSources
 *   description: Management of data sources (uploaded materials like PDFs, text) used for learning and search
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     DataSource:
 *       # Based on Prisma DataSource model
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           # format: uuid
 *         name:
 *           type: string
 *           description: Name of the data source (e.g., filename)
 *         type:
 *           $ref: '#/components/schemas/DataSourceType' # Reference Enum
 *         fileType:
 *           type: string
 *           description: Specific file extension or mime type (e.g., 'pdf', 'docx')
 *         size:
 *           type: integer
 *           default: 0
 *           description: File size in bytes
 *         uploadDate:
 *           type: string
 *           format: date-time
 *         source:
 *           type: string
 *           description: Origin of the data (e.g., 'upload', 'youtube_url')
 *         sourceUrl:
 *           type: string
 *           nullable: true
 *           description: URL if the source is external (e.g., YouTube link)
 *         status:
 *           $ref: '#/components/schemas/DataSourceStatus' # Reference Enum
 *         progress:
 *           type: integer
 *           nullable: true
 *           description: Processing progress percentage (if applicable)
 *         content:
 *           type: string
 *           nullable: true
 *           description: Extracted text content (may be large, consider omitting from list views)
 *         url:
 *           type: string
 *           nullable: true
 *           description: URL to access the resource (e.g., signed URL from cloud storage)
 *         subjectId:
 *           type: string
 *           nullable: true
 *           # format: uuid
 *         lessonId:
 *           type: string
 *           nullable: true
 *           # format: uuid
 *         description:
 *           type: string
 *           nullable: true
 *         thumbnail:
 *           type: string
 *           nullable: true
 *           description: URL to a thumbnail image
 *         tags: # Relation handled via DataSourceTag, might return array of Tag names/IDs
 *           type: array
 *           items:
 *             type: object # Or just string if returning names/IDs
 *             properties:
 *               tagId:
 *                 type: string
 *               name:
 *                 type: string
 *           description: Tags associated with the data source
 *         userId:
 *           type: string
 *           # format: uuid
 *         createdAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: "ds_abc123"
 *         name: "chapter1.pdf"
 *         type: "PDF"
 *         fileType: "application/pdf"
 *         size: 1024576
 *         uploadDate: "2025-03-31T19:00:00.000Z"
 *         source: "upload"
 *         sourceUrl: null
 *         status: "COMPLETED"
 *         progress: 100
 *         content: "Introduction to..." # Often omitted in list view
 *         url: "/files/chapter1.pdf" # Example internal URL
 *         subjectId: "subj_xyz789"
 *         lessonId: null
 *         description: "First chapter on core concepts."
 *         thumbnail: "/thumbnails/chapter1.jpg"
 *         tags: [{ "tagId": "tag_basics", "name": "Basics" }]
 *         userId: "user_pqr456"
 *         createdAt: "2025-03-31T19:00:00.000Z"
 *     DataSourceStatus: # Define Enum
 *       type: string
 *       enum: [ERROR, PROCESSING, COMPLETED, READY]
 *     DataSourceType: # Define Enum
 *       type: string
 *       enum: [WEBSITE, TEXT, DOCS, PDF, IMAGE, VIDEO, AUDIO, YOUTUBE]
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
 * /data-sources:
 *   get:
 *     summary: Retrieve all data sources for the authenticated user
 *     tags: [DataSources]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of data sources
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DataSource'
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
router.get('/', sourceHandler.getAllDataSources);

/**
 * @swagger
 * /data-sources:
 *   post:
 *     summary: Upload and create new data sources (e.g., documents)
 *     tags: [DataSources]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               documents: # This must match the field name in upload.array()
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary # Indicates file upload
 *                 description: Array of files to upload (max 10 allowed by middleware)
 *               subjectId: # Add other form fields if needed
 *                 type: string
 *                 format: uuid
 *                 description: ID of the subject to associate the documents with (optional?)
 *     responses:
 *       '201':
 *         description: Data sources created successfully (processing may be ongoing)
 *         content:
 *           application/json:
 *             schema:
 *               type: array # Assuming it returns the created data source records
 *               items:
 *                 $ref: '#/components/schemas/DataSource'
 *       '400':
 *         description: Bad Request (e.g., no files uploaded, invalid subjectId)
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
 *         description: Internal Server Error (e.g., file storage issue)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.post(
  '/',
  upload.array('documents', 10),
  validate(optionalSubjectIdBodySchema),
  sourceHandler.createDataSource
);

/**
 * @swagger
 * /data-sources/{id}:
 *   get:
 *     summary: Get a specific data source by ID
 *     tags: [DataSources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           # format: uuid # Prisma uses String
 *         description: ID of the data source to retrieve
 *     responses:
 *       '200':
 *         description: Data source details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DataSource'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Data source not found
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
router.get('/:id', validate(quizIdParamSchema), sourceHandler.getDataSourceById);

/**
 * @swagger
 * /data-sources/{id}:
 *   delete:
 *     summary: Delete a specific data source by ID
 *     tags: [DataSources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           # format: uuid # Prisma uses String
 *         description: ID of the data source to delete
 *     responses:
 *       '204':
 *         description: Data source deleted successfully (No Content)
 *       '401':
 *         description: Unauthorized (or insufficient permissions)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Data source not found
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
router.delete('/:id', validate(quizIdParamSchema), sourceHandler.deleteDataSource);

export { router as dataSourceRoutes };
