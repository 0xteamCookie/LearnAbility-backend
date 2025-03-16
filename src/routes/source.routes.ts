import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import * as sourceHandler from '../handler/source.handler';

const router = Router();

router.use(authenticate);

router.get('/', sourceHandler.getAllDataSources);
router.post('/', upload.array('file', 5), sourceHandler.createDataSource);
router.get('/:id', sourceHandler.getDataSourceById);
router.delete('/:id', sourceHandler.deleteDataSource);

export { router as dataSourceRoutes };