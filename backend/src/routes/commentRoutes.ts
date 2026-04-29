import { Router } from 'express';

import { commentController } from '../controllers/commentController';
import { authenticate } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiter';

const router = Router();

router.get('/answers/:answerId/comments', commentController.listForAnswer);
router.post(
  '/answers/:answerId/comments',
  authenticate,
  applyRateLimit({ windowMs: 60_000, max: 10, message: 'Yorum gönderim sınırına ulaştınız.' }),
  commentController.create
);

export default router;
