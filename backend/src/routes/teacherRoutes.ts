import { Router } from 'express';

import { questionController } from '../controllers/questionController';
import { authenticate, requireRole } from '../middleware/auth';
import { attachmentUpload } from '../middleware/upload';

const router = Router();

router.get(
  '/questions',
  authenticate,
  requireRole(['TEACHER']),
  questionController.getTeacherQueue
);

router.post(
  '/questions/:id/answer',
  authenticate,
  requireRole(['TEACHER']),
  attachmentUpload.array('attachments', 5),
  questionController.submitTeacherAnswer
);

export default router;
