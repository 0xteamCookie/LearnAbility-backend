import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { uploadSyllabus } from '../handler/syllabus.handler';

const router = Router();

router.use(authenticate);

router.post('/', upload.array('documents', 10), uploadSyllabus);

export { router as syllabusRoutes };
