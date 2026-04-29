import { Router } from 'express';

import { adminController } from '../controllers/adminController';
import { authenticate, requireRole } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate, requireRole(['ADMIN']));

router.get('/overview', adminController.overview);
router.get('/users', adminController.listUsers);
router.post(
  '/users/create',
  applyRateLimit({ windowMs: 60_000, max: 10, message: 'Çok sık hesap oluşturuyorsunuz.' }),
  adminController.createAccount
);
router.post(
  '/users/bulk-create',
  applyRateLimit({ windowMs: 60_000, max: 5, message: 'Çok sık toplu hesap oluşturuyorsunuz.' }),
  adminController.createAccountsBulk
);
router.patch('/users/:userId', adminController.updateUserRole);
router.delete('/users/:userId', adminController.deleteUser);
router.post(
  '/users/:userId/sanctions',
  applyRateLimit({ windowMs: 60_000, max: 10, message: 'Çok sık kullanıcı yaptırımı uyguluyorsunuz.' }),
  adminController.sanctionUser
);
router.delete(
  '/users/:userId/sanctions',
  applyRateLimit({ windowMs: 60_000, max: 10, message: 'Çok sık kullanıcı yaptırımı kaldırıyorsunuz.' }),
  adminController.liftSanction
);

router.get('/questions', adminController.listQuestions);
router.delete('/questions/:questionId', adminController.deleteQuestion);

router.get('/comments', adminController.listComments);
router.delete('/comments/:commentId', adminController.deleteComment);

router.get('/messages', adminController.listMessages);
router.patch(
  '/messages/:messageId',
  applyRateLimit({ windowMs: 60_000, max: 20, message: 'Çok sık mesaj yönetimi işlemi yapıyorsunuz.' }),
  adminController.flagMessage
);

router.get('/friendships', adminController.listFriendships);
router.get('/settings', adminController.getSettings);
router.patch(
  '/settings',
  applyRateLimit({ windowMs: 60_000, max: 10, message: 'Ayarları çok hızlı güncelliyorsunuz.' }),
  adminController.updateSettings
);
router.get('/metrics/usage', adminController.usageMetrics);

router.get('/api-keys', adminController.listApiKeys);
router.post(
  '/api-keys',
  applyRateLimit({ windowMs: 60_000, max: 5, message: 'API anahtarı ekleme sınırı.' }),
  adminController.addApiKey
);
router.patch(
  '/api-keys/:keyId',
  applyRateLimit({ windowMs: 60_000, max: 15, message: 'API anahtarı güncelleme sınırı.' }),
  adminController.updateApiKey
);

router.get('/support/tickets', adminController.listSupportTickets);
router.get('/security/audit', adminController.listAuditLogs);
router.get('/security/ip-bans', adminController.listBannedIps);
router.post(
  '/security/ip-bans',
  applyRateLimit({ windowMs: 60_000, max: 10, message: 'IP engelleme sınırına ulaştınız.' }),
  adminController.addBannedIp
);
router.delete('/security/ip-bans/:ipId', adminController.removeBannedIp);
router.post(
  '/ai/imagen',
  applyRateLimit({ windowMs: 60_000, max: 5, message: 'Imagen istek sınırına ulaştınız.' }),
  adminController.generateImagenPreview
);

export default router;
