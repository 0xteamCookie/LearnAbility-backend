import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import * as subjectHandler from '../handler/subject.handler';
import * as topicHandler from '../handler/topic.handler';
import * as tagHandler from '../handler/tag.handler';
import * as sourceHandler from '../handler/source.handler';

const router = Router();

router.use(authenticate);

router.get('/subjects', subjectHandler.getAllSubjects);
router.post('/subjects', subjectHandler.createSubject);
router.delete('/subjects/:id', subjectHandler.deleteSubject);

router.get('/subjects/:subjectId/topics', topicHandler.getSubjectTopics);
router.post('/subjects/:subjectId/topics', topicHandler.createTopic);
router.delete('/topics/:id', topicHandler.deleteTopic);

router.get('/tags', tagHandler.getAllTags);
router.post('/tags', tagHandler.createTag);
router.delete('/tags/:id', tagHandler.deleteTag);

// Material routes using DataSource handler (Not that necessary)
router.get('/materials', sourceHandler.getAllDataSources);
router.get('/materials/:id', sourceHandler.getDataSourceById);
router.delete('/materials/:id', sourceHandler.deleteDataSource);
router.post('/materials', upload.array('file', 5), sourceHandler.createDataSource);

export { router as pyosRoutes };