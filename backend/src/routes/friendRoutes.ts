import { Router } from 'express';

import { friendController } from '../controllers/friendController';
import { authenticate } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate);

router.post(
  '/request',
  applyRateLimit({ windowMs: 60_000, max: 5, message: 'Çok fazla arkadaşlık isteği gönderdiniz.' }),
  friendController.sendRequest
);
router.post('/respond', friendController.respond);
router.get('/', friendController.listFriends);
router.get('/pending', friendController.listPending);

export default router;
