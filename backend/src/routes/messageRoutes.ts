import { Router } from 'express';

import { messageController } from '../controllers/messageController';
import { authenticate } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate);

router.get('/partners', messageController.listPartners);
router.get('/:partnerId', messageController.getConversation);
router.post(
  '/:partnerId',
  applyRateLimit({ windowMs: 60_000, max: 20, message: 'Mesaj gönderim sınırına ulaştınız.' }),
  messageController.sendMessage
);

export default router;
