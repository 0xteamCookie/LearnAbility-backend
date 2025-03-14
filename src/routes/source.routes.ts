import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { createDataSource, getDataSources, getDataSourceById } from '../handler/source.handler';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// All routes are protected
router.use(authenticate);

// Modified route to handle both JSON data and file uploads
router.post('/', upload.single('document'), createDataSource);
router.get('/', getDataSources);
router.get('/:id', getDataSourceById);

export { router as dataSourceRoutes };
