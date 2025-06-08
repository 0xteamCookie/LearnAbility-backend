import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import validate from '../middleware/validate.middleware';
import { languageParamSchema, setUserLanguageSchema } from '../schemas/translation.schema';
import * as translationHandler from '../handler/translation.handler';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Translations
 *   description: AI-powered translation of UI messages and language support
 */

router.use(authenticate);

/**
 * @swagger
 * /translations/supported-languages:
 *   get:
 *     summary: Retrieve the list of supported languages for translation
 *     tags: [Translations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of supported languages with their codes and names
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SupportedLanguage' # Updated to use SupportedLanguage schema
 *               example:
 *                 - code: "en"
 *                   name: "English"
 *                 - code: "es"
 *                   name: "Spanish"
 *                 - code: "fr"
 *                   name: "French"
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
router.get('/supported-languages', translationHandler.listSupportedLanguages);

/**
 * @swagger
 * /translations/user-language:
 *   put:
 *     summary: Set the authenticated user's preferred language
 *     tags: [Translations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - languageCode
 *             properties:
 *               languageCode:
 *                 $ref: '#/components/schemas/LanguageCode'
 *             example:
 *               languageCode: "fr"
 *     responses:
 *       '200':
 *         description: User language preference updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     language:
 *                       type: string
 *               example:
 *                 message: "User language preference updated to French (fr)."
 *                 user:
 *                   id: "user_uuid_here"
 *                   language: "fr"
 *       '400':
 *         description: Bad Request (e.g., invalid language code provided)
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
 *         description: User not found
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
router.put(
  '/user-language',
  validate(setUserLanguageSchema),
  translationHandler.setUserLanguagePreference
);

/**
 * @swagger
 * /translations/{lang}/generate:
 *   post:
 *     summary: Generate a new translation file for the specified language
 *     tags: [Translations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lang
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/LanguageCode'
 *         description: The target language code for translation (e.g., 'fr', 'es', 'zh-CN')
 *     responses:
 *       '201':
 *         description: Translation file generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 filePath:
 *                   type: string
 *               example:
 *                 message: "Translation file for 'fr' generated successfully."
 *                 filePath: "/lang/fr.json"
 *       '400':
 *         description: Bad Request (e.g., invalid language code, trying to generate for default 'en')
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
 *         description: Internal Server Error (e.g., default en.json not found, error during translation/file write)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/:lang/generate',
  validate(languageParamSchema),
  translationHandler.generateTranslation
);

/**
 * @swagger
 * /translations/{lang}:
 *   get:
 *     summary: Retrieve a translation file for the specified language
 *     tags: [Translations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lang
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/LanguageCode'
 *         description: The language code of the translation file to retrieve (e.g., 'en', 'fr')
 *     responses:
 *       '200':
 *         description: Successfully retrieved translation file content
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TranslationFile'
 *       '400':
 *         description: Bad Request (e.g., invalid language code)
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
 *         description: Translation file not found (e.g., has not been generated yet)
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
router.get('/:lang', validate(languageParamSchema), translationHandler.getTranslationFile);

export { router as translationRoutes };
