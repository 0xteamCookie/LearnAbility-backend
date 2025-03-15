import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { answerUserQuery } from '../handler/query.handler';

const router = Router();

router.use(authenticate);

router.post('/', answerUserQuery);

export { router as queryRoutes };