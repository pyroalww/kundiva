import { Router, Request, Response } from 'express';

import { adminController } from '../controllers/adminController';
import { authenticate, requireRole } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiter';
import { registrationService } from '../services/registrationService';
import { prisma } from '../utils/prisma';
import { ApiError } from '../middleware/errorHandler';
import { aiService } from '../services/aiService';

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

// Admin question editing
router.patch('/questions/:questionId', async (req: Request, res: Response) => {
  const { title, description, status } = req.body;
  const data: Record<string, unknown> = {};
  if (typeof title === 'string') data.title = title;
  if (typeof description === 'string') data.description = description;
  if (typeof status === 'string') data.status = status;
  if (Object.keys(data).length === 0) throw new ApiError(400, 'Güncellenecek alan yok.');
  const updated = await prisma.question.update({ where: { id: req.params.questionId }, data });
  res.json(updated);
});

// Admin: AI solve a question
router.post('/questions/:questionId/ai-solve', async (req: Request, res: Response) => {
  const question = await prisma.question.findUnique({
    where: { id: req.params.questionId },
    include: { attachments: true }
  });
  if (!question) throw new ApiError(404, 'Soru bulunamadı.');

  await prisma.question.update({
    where: { id: question.id },
    data: { status: 'IN_PROGRESS' }
  });

  // Trigger AI in background
  setImmediate(async () => {
    try {
      const { readFileSync } = await import('node:fs');
      const { join } = await import('node:path');

      let attachment: { base64: string; mimeType: string } | undefined;
      const imgAtt = (question as any).attachments?.find((a: any) => a.type === 'IMAGE');
      if (imgAtt) {
        try {
          const fullPath = join(process.cwd(), imgAtt.storagePath.replace(/^\//, ''));
          attachment = { base64: readFileSync(fullPath).toString('base64'), mimeType: imgAtt.mimeType };
        } catch {}
      }

      const aiResult = await aiService.generateStructuredAnswer({
        title: question.title,
        questionText: question.description,
        metadata: {
          course: question.course,
          subjectArea: question.subjectArea,
          subjectName: question.subjectName,
          educationLevel: question.educationLevel,
          solverType: 'AI'
        },
        image: attachment
      });

      const content = typeof aiResult.content === 'string' ? aiResult.content : JSON.stringify(aiResult.content, null, 2);
      await prisma.answer.create({
        data: { questionId: question.id, source: 'AI', content }
      });
      await prisma.question.update({
        where: { id: question.id },
        data: { status: 'ANSWERED', aiEthicsFlag: true }
      });
    } catch (err) {
      await prisma.question.update({
        where: { id: question.id },
        data: { status: 'PENDING' }
      }).catch(() => {});
    }
  });

  res.json({ message: 'AI çözüm başlatıldı.' });
});

// Admin: add a solution
router.post('/questions/:questionId/solutions', async (req: Request, res: Response) => {
  const { content, isCorrect } = req.body;
  if (!content) throw new ApiError(400, 'İçerik gerekli.');
  const solution = await prisma.studentSolution.create({
    data: {
      questionId: req.params.questionId,
      authorId: req.user!.id,
      content,
      isCorrect: isCorrect ?? null,
      points: isCorrect ? 10 : 0
    }
  });
  res.status(201).json(solution);
});

// Admin: mark solution as correct/incorrect
router.patch('/questions/:questionId/solutions/:solutionId', async (req: Request, res: Response) => {
  const { isCorrect } = req.body;
  if (typeof isCorrect !== 'boolean') throw new ApiError(400, 'isCorrect boolean olmalı.');
  const solution = await prisma.studentSolution.update({
    where: { id: req.params.solutionId },
    data: { isCorrect, points: isCorrect ? 10 : 0 }
  });

  if (isCorrect) {
    await prisma.user.update({
      where: { id: solution.authorId },
      data: { totalPoints: { increment: 10 }, aiCredits: { increment: 1 } }
    });
  }

  res.json(solution);
});

// Admin: edit answer
router.patch('/answers/:answerId', async (req: Request, res: Response) => {
  const { content } = req.body;
  if (!content) throw new ApiError(400, 'İçerik gerekli.');
  const answer = await prisma.answer.update({
    where: { id: req.params.answerId },
    data: { content }
  });
  res.json(answer);
});

// Admin: delete answer
router.delete('/answers/:answerId', async (req: Request, res: Response) => {
  const answerId = req.params.answerId;
  await prisma.comment.deleteMany({ where: { answerId } });
  await prisma.answerAttachment.deleteMany({ where: { answerId } });
  await prisma.answer.delete({ where: { id: answerId } });
  res.status(204).send();
});

// Registration request management
router.get('/registration-requests', async (_req: Request, res: Response) => {
  const requests = await registrationService.listRequests();
  res.json(requests);
});

router.post('/registration-requests/:id/approve', async (req: Request, res: Response) => {
  const user = await registrationService.approveRequest(req.params.id);
  res.json(user);
});

router.post('/registration-requests/:id/reject', async (req: Request, res: Response) => {
  const { note } = req.body;
  const request = await registrationService.rejectRequest(req.params.id, note);
  res.json(request);
});

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
