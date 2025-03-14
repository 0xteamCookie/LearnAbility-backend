import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createDataSource,
  getDataSources,
  getDataSourceById,
  getSessionStatus,
} from '../handler/source.handler';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticate);

router.post('/', upload.array('documents', 10), createDataSource);

router.get('/', getDataSources);

router.get('/sessions/:sessionId', getSessionStatus);

router.get('/:id', getDataSourceById);

export { router as dataSourceRoutes };
