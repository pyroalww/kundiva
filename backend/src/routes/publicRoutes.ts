import { Router, Request, Response } from 'express';

import { questionController } from '../controllers/questionController';
import { prisma } from '../utils/prisma';

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

export default router;
