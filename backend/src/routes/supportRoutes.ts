import { Router } from 'express';

import { supportController } from '../controllers/supportController';
import { authenticate } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiter';

const router = Router();

router.get('/faqs', supportController.info);

router.get('/session', authenticate, supportController.session);
router.post(
  '/messages',
  authenticate,
  applyRateLimit({
    windowMs: 5 * 60_000,
    max: 3,
    message:
      'Kısa sürede çok fazla destek talebi gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.',
    useSupportModel: true
  }),
  supportController.sendMessage
);

export default router;
