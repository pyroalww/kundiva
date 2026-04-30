import { Router } from 'express';

import { questionController } from '../controllers/questionController';
import { authenticate, requireRole } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiter';
import { attachmentUpload, questionUpload, optimizeImages } from '../middleware/upload';

const router = Router();

router.post(
  '/',
  authenticate,
  requireRole(['STUDENT']),
  applyRateLimit({ windowMs: 5 * 60_000, max: 5, message: 'Soru gönderim limitine ulaştınız. Lütfen daha sonra tekrar deneyin.' }),
  questionUpload.single('questionImage'),
  optimizeImages,
  questionController.createQuestion
);

router.get(
  '/me',
  authenticate,
  requireRole(['STUDENT']),
  questionController.getStudentQuestions
);

router.get(
  '/library',
  authenticate,
  questionController.listAllQuestions
);

router.get(
  '/leaderboard',
  questionController.getLeaderboard
);

router.post(
  '/:id/follow-ups',
  authenticate,
  requireRole(['STUDENT']),
  attachmentUpload.array('attachments', 5),
  optimizeImages,
  applyRateLimit({ windowMs: 60_000, max: 5, message: 'Çok hızlı takip sorusu gönderiyorsunuz.' }),
  questionController.addFollowUp
);

router.post(
  '/:id/practice',
  authenticate,
  requireRole(['STUDENT']),
  applyRateLimit({ windowMs: 60_000, max: 10, message: 'Benzer soru üretme limitine ulaştınız. Kısa bir süre sonra tekrar deneyin.' }),
  questionController.generatePracticeQuestion
);

router.post(
  '/:id/solutions',
  authenticate,
  requireRole(['STUDENT']),
  applyRateLimit({ windowMs: 60_000, max: 5, message: 'Çok hızlı çözüm gönderiyorsunuz.' }),
  questionController.submitSolution
);

router.get(
  '/:id/solutions',
  questionController.getSolutions
);

router.patch(
  '/:id/solutions/:solutionId',
  authenticate,
  questionController.markSolution
);

export default router;
