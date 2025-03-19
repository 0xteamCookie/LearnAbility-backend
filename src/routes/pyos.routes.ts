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
router.get('/subjects/:id', subjectHandler.getSubject);
router.delete('/subjects/:id', subjectHandler.deleteSubject);
router.post('/subjects/syllabus', upload.single('document'), subjectHandler.uploadSyllabus);
router.get('/subjects/:subjectId/syllabus', subjectHandler.getSyllabus);
router.get('/subjects/:subjectId/lessons', subjectHandler.generateLessons);

router.get('/subjects/:subjectId/topics', topicHandler.getSubjectTopics);
router.post('/subjects/:subjectId/topics', topicHandler.createTopic);
router.delete('/subjects/:idx/topics/:id', topicHandler.deleteTopic);

router.get('/tags', tagHandler.getAllTags);
router.post('/tags', tagHandler.createTag);
router.delete('/tags/:id', tagHandler.deleteTag);

router.get('/materials', sourceHandler.getAllDataSources);
router.get('/materials/:id', sourceHandler.getDataSourceById);
router.delete('/materials/:id', sourceHandler.deleteDataSource);
router.post('/materials', upload.array('documents', 10), sourceHandler.createDataSource);

export { router as pyosRoutes };
