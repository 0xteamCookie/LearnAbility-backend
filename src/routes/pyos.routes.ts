import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import validate from '../middleware/validate.middleware';
import { quizIdParamSchema } from '../schemas/quiz.schema';
import {
  createSubjectSchema,
  createTagSchema,
  subjectIdParamSchema,
  subjectLessonIdParamSchema,
  subjectIdBodySchema,
  optionalSubjectIdBodySchema,
} from '../schemas/pyos.schema';
import * as subjectHandler from '../handler/subject.handler';
import * as tagHandler from '../handler/tag.handler';
import * as sourceHandler from '../handler/source.handler';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Subjects
 *     description: Management of learning subjects
 *   - name: Lessons
 *     description: Generation and retrieval of lesson content based on subjects/syllabi
 *   - name: Tags
 *     description: Management of tags for organizing content
 *   # Note: DataSources routes are duplicated here from source.routes.ts
 *   - name: DataSources (PYOS) # Distinguish if needed, or reuse 'DataSources' tag
 *     description: Management of data sources (materials) within PYOS context (duplicate routes)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SubjectInput:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the subject
 *         description:
 *           type: string
 *           description: Optional description for the subject
 *       example:
 *         name: "Introduction to Programming"
 *         description: "Fundamentals of programming concepts using Python."
 *     Subject:
 *       # Based on Prisma Subject model
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           # format: uuid
 *         name:
 *           type: string
 *         color:
 *           type: string
 *           default: "bg-blue-500"
 *           description: UI color associated with the subject
 *         status:
 *           $ref: '#/components/schemas/DataSourceStatus' # Reference Enum defined in source.routes.ts (or define here)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         materialCount:
 *           type: integer
 *           default: 0
 *         syllabusPath:
 *           type: string
 *           nullable: true
 *           description: Path to the uploaded syllabus file
 *         userId:
 *           type: string
 *           # format: uuid
 *       example:
 *         id: "subj_prog101"
 *         name: "Introduction to Programming"
 *         color: "bg-green-500"
 *         status: "COMPLETED" # Example status
 *         createdAt: "2025-03-30T10:00:00.000Z"
 *         updatedAt: "2025-03-30T10:05:00.000Z"
 *         materialCount: 5
 *         syllabusPath: "/syllabi/prog101.pdf"
 *         userId: "user_pqr456"
 *     Syllabus:
 *       # Define based on API response for getSyllabus
 *       type: object
 *       properties:
 *         content: # Or structure representing syllabus content
 *           type: string # Or object
 *           description: Content of the syllabus (e.g., text extracted from PDF)
 *       example:
 *         content: "Module 1: Introduction\nModule 2: Variables..."
 *     Lesson:
 *       # Based on Prisma Lesson model
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           # format: uuid
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         duration:
 *           type: string
 *           default: "30 min"
 *         level:
 *           type: string
 *           default: "Beginner"
 *         order:
 *           type: integer
 *           default: 1
 *         progress:
 *           type: integer
 *           default: 0
 *           description: User's progress on this lesson (e.g., percentage)
 *         image:
 *           type: string
 *           nullable: true
 *           description: URL for a lesson cover image
 *         subjectId:
 *           type: string
 *           # format: uuid
 *         userId:
 *           type: string
 *           # format: uuid
 *         # prerequisites: Omitted for brevity, could be array of Lesson IDs/objects
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: "lesson_prog101_1"
 *         title: "Introduction to Variables"
 *         description: "Learn about variables in programming."
 *         duration: "20 min"
 *         level: "Beginner"
 *         order: 1
 *         progress: 0
 *         image: null
 *         subjectId: "subj_prog101"
 *         userId: "user_pqr456"
 *         createdAt: "2025-03-30T11:00:00.000Z"
 *         updatedAt: "2025-03-30T11:00:00.000Z"
 *     LessonContent:
 *       # Structure defined by generateLessonsC handler, likely based on Lesson model + generated content
 *       type: object
 *       properties:
 *         lessonId:
 *           type: string
 *           # format: uuid
 *         title:
 *           type: string # From Lesson model
 *         # Add other relevant fields from Lesson model if needed
 *         content: # The generated content itself
 *           type: object # Or string, depending on generation format
 *           description: The AI-generated content for the lesson (structure depends on implementation)
 *           example: { "pages": [{ "type": "heading", "text": "Variables" }, { "type": "paragraph", "text": "A variable stores data." }] }
 *       example:
 *         lessonId: "lesson_prog101_1"
 *         title: "Introduction to Variables"
 *         content: { "pages": [{ "type": "heading", "text": "Variables" }, { "type": "paragraph", "text": "A variable stores data." }] }
 *     TagInput:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the tag
 *       example:
 *         name: "beginner"
 *     Tag:
 *       # Based on Prisma Tag model
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           # format: uuid
 *         name:
 *           type: string
 *         materialCount: # Note: This might not be returned by default, depends on handler
 *           type: integer
 *           default: 0
 *         userId:
 *           type: string
 *           # format: uuid
 *       example:
 *         id: "tag_abc123"
 *         name: "beginner"
 *         materialCount: 10
 *         userId: "user_pqr456"
 *     # Ensure DataSource, DataSourceStatus, DataSourceType, ErrorResponse are defined/referenced
 *     # (Should be picked up from source.routes.ts if parsed together)
 */

router.use(authenticate);

/**
 * @swagger
 * /pyos/subjects:
 *   get:
 *     summary: Retrieve all subjects for the authenticated user
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of subjects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Subject'
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
router.get('/subjects', subjectHandler.getAllSubjects);

/**
 * @swagger
 * /pyos/subjects:
 *   post:
 *     summary: Create a new subject
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubjectInput'
 *     responses:
 *       '201':
 *         description: Subject created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subject'
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
router.post('/subjects', validate(createSubjectSchema), subjectHandler.createSubject);

/**
 * @swagger
 * /pyos/subjects/{id}:
 *   get:
 *     summary: Get a specific subject by ID
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           # format: uuid
 *         description: ID of the subject to retrieve
 *     responses:
 *       '200':
 *         description: Subject details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subject'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Subject not found
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
router.get('/subjects/:id', validate(quizIdParamSchema), subjectHandler.getSubject);

/**
 * @swagger
 * /pyos/subjects/{id}:
 *   delete:
 *     summary: Delete a specific subject by ID
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           # format: uuid
 *         description: ID of the subject to delete
 *     responses:
 *       '204':
 *         description: Subject deleted successfully (No Content)
 *       '401':
 *         description: Unauthorized (or insufficient permissions)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Subject not found
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
router.delete('/subjects/:id', validate(quizIdParamSchema), subjectHandler.deleteSubject);

/**
 * @swagger
 * /pyos/subjects/syllabus:
 *   post:
 *     summary: Upload a syllabus document for a subject (associates with the subject implicitly or via form data)
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document: # Must match upload.single() field name
 *                 type: string
 *                 format: binary
 *                 description: The syllabus file (e.g., PDF)
 *               subjectId: # Need a way to link syllabus to subject
 *                 type: string
 *                 format: uuid
 *                 description: ID of the subject this syllabus belongs to
 *     responses:
 *       '200': # Or 201 if creating a new syllabus record
 *         description: Syllabus uploaded and associated successfully
 *         content:
 *           application/json:
 *             schema: # Define response, maybe updated Subject or success message
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 syllabusPath:
 *                   type: string
 *               example:
 *                 message: Syllabus uploaded successfully
 *                 syllabusPath: /uploads/syllabi/syllabus_prog101.pdf
 *       '400':
 *         description: Bad Request (e.g., no file, invalid subjectId, invalid file type)
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
 *         description: Subject not found
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
  '/subjects/syllabus',
  upload.single('document'),
  validate(subjectIdBodySchema),
  subjectHandler.uploadSyllabus
);

/**
 * @swagger
 * /pyos/subjects/{subjectId}/syllabus:
 *   get:
 *     summary: Retrieve the syllabus content for a specific subject
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: string
 *           # format: uuid
 *         description: ID of the subject whose syllabus to retrieve
 *     responses:
 *       '200':
 *         description: Syllabus content retrieved successfully
 *         content:
 *           application/json: # Or text/plain depending on what's returned
 *             schema:
 *               $ref: '#/components/schemas/Syllabus'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Subject or syllabus not found
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
router.get(
  '/subjects/:subjectId/syllabus',
  validate(subjectIdParamSchema),
  subjectHandler.getSyllabus
);

/**
 * @swagger
 * /pyos/subjects/{subjectId}/lessons:
 *   get:
 *     summary: Generate (or retrieve previously generated) lessons for a subject based on its syllabus
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: string
 *           # format: uuid
 *         description: ID of the subject to generate lessons for
 *     responses:
 *       '200': # Or 201 if lessons are generated on first call
 *         description: List of lessons for the subject
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Lesson'
 *       '400':
 *         description: Bad Request (e.g., syllabus not found or processed yet)
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
 *         description: Subject not found
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
router.get(
  '/subjects/:subjectId/lessons',
  validate(subjectIdParamSchema),
  subjectHandler.generateLessons
);

/**
 * @swagger
 * /pyos/{subjectId}/{lessonId}:
 *   get:
 *     summary: Generate (or retrieve) detailed content for a specific lesson
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subjectId # May be redundant if lessonId is globally unique
 *         required: true
 *         schema:
 *           type: string
 *           # format: uuid
 *         description: ID of the subject the lesson belongs to
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *           # format: uuid
 *         description: ID of the lesson to get content for
 *     responses:
 *       '200':
 *         description: Detailed lesson content
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LessonContent'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Subject or Lesson not found
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
router.get(
  '/:subjectId/:lessonId',
  validate(subjectLessonIdParamSchema),
  subjectHandler.generateLessonsC
);

/**
 * @swagger
 * /pyos/tags:
 *   get:
 *     summary: Retrieve all available tags
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: [] # Or remove if tags are public
 *     responses:
 *       '200':
 *         description: A list of tags
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tag'
 *       '401':
 *         description: Unauthorized (if applicable)
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
router.get('/tags', tagHandler.getAllTags);

/**
 * @swagger
 * /pyos/tags:
 *   post:
 *     summary: Create a new tag
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: [] # Or admin only?
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TagInput'
 *     responses:
 *       '201':
 *         description: Tag created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
 *       '400':
 *         description: Bad Request (e.g., tag already exists)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Unauthorized (or insufficient permissions)
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
router.post('/tags', validate(createTagSchema), tagHandler.createTag);

/**
 * @swagger
 * /pyos/tags/{id}:
 *   delete:
 *     summary: Delete a specific tag by ID
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: [] # Or admin only?
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           # format: uuid
 *         description: ID of the tag to delete
 *     responses:
 *       '204':
 *         description: Tag deleted successfully (No Content)
 *       '401':
 *         description: Unauthorized (or insufficient permissions)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Tag not found
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
router.delete('/tags/:id', validate(quizIdParamSchema), tagHandler.deleteTag);

/**
 * @swagger
 * /pyos/materials:
 *   get:
 *     summary: Retrieve all data sources (materials) for the authenticated user (Duplicate Route)
 *     tags: [DataSources (PYOS)]
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
 *                 $ref: '#/components/schemas/DataSource' # Assumes DataSource schema is defined
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
router.get('/materials', sourceHandler.getAllDataSources);

/**
 * @swagger
 * /pyos/materials/{id}:
 *   get:
 *     summary: Get a specific data source (material) by ID (Duplicate Route)
 *     tags: [DataSources (PYOS)]
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
router.get('/materials/:id', validate(quizIdParamSchema), sourceHandler.getDataSourceById);

/**
 * @swagger
 * /pyos/materials/{id}:
 *   delete:
 *     summary: Delete a specific data source (material) by ID (Duplicate Route)
 *     tags: [DataSources (PYOS)]
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
router.delete('/materials/:id', validate(quizIdParamSchema), sourceHandler.deleteDataSource);

/**
 * @swagger
 * /pyos/materials:
 *   post:
 *     summary: Upload and create new data sources (materials) (Duplicate Route)
 *     tags: [DataSources (PYOS)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               documents: # Must match upload.array() field name
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Array of files to upload (max 10 allowed)
 *               subjectId: # Add other form fields if needed
 *                 type: string
 *                 format: uuid
 *                 description: ID of the subject to associate the documents with (optional?)
 *     responses:
 *       '201':
 *         description: Data sources created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DataSource'
 *       '400':
 *         description: Bad Request
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

router.post(
  '/materials',
  upload.array('documents', 10),
  validate(optionalSubjectIdBodySchema),
  sourceHandler.createDataSource
);

export { router as pyosRoutes };
