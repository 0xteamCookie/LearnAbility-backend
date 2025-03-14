import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { createDataSource, getDataSources, getDataSourceById } from '../handler/source.handler';

const router = Router();

// All routes are protected
router.use(authenticate);

router.post('/', createDataSource);
router.get('/', getDataSources);
router.get('/:id', getDataSourceById);

export { router as dataSourceRoutes };
