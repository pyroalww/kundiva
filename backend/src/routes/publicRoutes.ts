import { Router, Request, Response } from 'express';

import { questionController } from '../controllers/questionController';
import { prisma } from '../utils/prisma';
import { registrationService } from '../services/registrationService';
import { applyRateLimit } from '../middleware/rateLimiter';
import { questionUpload, optimizeImages } from '../middleware/upload';

const router = Router();

router.get('/questions', questionController.listPublicQuestions);
router.get('/questions/:id', questionController.getPublicQuestion);

router.get('/stats', async (_req: Request, res: Response) => {
  const [students, teachers, totalQuestions, answeredQuestions, totalSolutions] =
    await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.question.count(),
      prisma.question.count({ where: { status: 'ANSWERED' } }),
      prisma.studentSolution.count()
    ]);

  res.json({
    students,
    teachers,
    totalQuestions,
    answeredQuestions,
    totalSolutions
  });
});

// Registration request (public, unauthenticated)
router.post(
  '/register-request',
  applyRateLimit({ windowMs: 60_000, max: 3, message: 'Çok sık kayıt talebi gönderiyorsunuz.' }),
  questionUpload.single('studentId'),
  optimizeImages,
  async (req: Request, res: Response) => {
    const { desiredUsername, password, fullName, studentNumber } = req.body;
    if (!desiredUsername || !password || !fullName || !studentNumber) {
      res.status(400).json({ message: 'Tüm alanlar zorunludur (Kullanıcı Adı, Şifre, Ad Soyad, Öğrenci No).' });
      return;
    }
    const studentIdPath = req.file ? `/uploads/${req.file.filename}` : undefined;
    const request = await registrationService.submitRequest({
      desiredUsername, password, fullName, studentIdPath
    });
    res.status(201).json(request);
  }
);

export default router;
