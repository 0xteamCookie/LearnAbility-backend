import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import * as subjectHandler from '../handler/subject.handler';
import * as topicHandler from '../handler/topic.handler';
import * as tagHandler from '../handler/tag.handler';
import * as materialHandler from '../handler/material.handler';

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

router.get('/materials', materialHandler.getAllMaterials);
router.post('/materials', upload.single('file'), materialHandler.createMaterial);
router.get('/materials/:id', materialHandler.getMaterialById);
router.put('/materials/:id', materialHandler.updateMaterial);
router.delete('/materials/:id', materialHandler.deleteMaterial);

export { router as pyosRoutes };
