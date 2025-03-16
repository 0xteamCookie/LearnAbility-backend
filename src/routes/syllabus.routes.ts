import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { uploadSyllabus, getSyllabusContent } from '../handler/syllabus.handler';

const router = Router();

router.use(authenticate);

router.post('/', upload.array('file', 5), uploadSyllabus);
router.get('/', getSyllabusContent);

export { router as syllabusRoutes };
