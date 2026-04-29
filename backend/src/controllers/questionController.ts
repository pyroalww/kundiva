import {
  CreateQuestionPayload,
  createQuestionSchema,
  followUpSchema,
  markSolutionSchema,
  submitSolutionSchema,
  teacherAnswerSchema} from '@kundiva/shared';
import { Request, Response } from 'express';

import { ApiError } from '../middleware/errorHandler';
import { questionService } from '../services/questionService';

const coerceCreatePayload = (body: Record<string, unknown>): CreateQuestionPayload => {
  const data: Record<string, unknown> = {
    ...body,
    solverType: 'TEACHER',
    questionText: typeof body.questionText === 'string' ? body.questionText : undefined,
    title: typeof body.title === 'string' ? body.title : undefined,
    useKundivaAi: body.useKundivaAi === 'true' || body.useKundivaAi === true
  };

  return createQuestionSchema.parse(data);
};

export const questionController = {
  createQuestion: async (req: Request, res: Response) => {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw new ApiError(403, 'Yalnızca öğrenciler soru gönderebilir.');
    }

    const payload = coerceCreatePayload(req.body ?? {});
    const hasFile = Boolean(req.file);

    if (!hasFile && !payload.questionText) {
      throw new ApiError(400, 'Soru metni ya da soru görseli paylaşmalısınız.');
    }

    const question = await questionService.createQuestion({
      payload,
      studentUser: {
        id: req.user.id,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      },
      file: req.file ?? undefined
    });

    res.status(201).json(question);
  },

  listAllQuestions: async (req: Request, res: Response) => {
    const { q, take, skip, course, subjectArea, subjectName, category, educationLevel, status } = req.query;
    const result = await questionService.listAllQuestions({
      query: typeof q === 'string' ? q : undefined,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
      course: typeof course === 'string' ? course : undefined,
      subjectArea: typeof subjectArea === 'string' ? subjectArea : undefined,
      subjectName: typeof subjectName === 'string' ? subjectName : undefined,
      category: typeof category === 'string' ? category : undefined,
      educationLevel: typeof educationLevel === 'string' ? educationLevel : undefined,
      status: typeof status === 'string' ? status : undefined
    });
    res.json(result);
  },

  listPublicQuestions: async (req: Request, res: Response) => {
    const { q, take, skip, course, subjectArea, subjectName, category, educationLevel } = req.query;
    const result = await questionService.listPublicQuestions({
      query: typeof q === 'string' ? q : undefined,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
      course: typeof course === 'string' ? course : undefined,
      subjectArea: typeof subjectArea === 'string' ? subjectArea : undefined,
      subjectName: typeof subjectName === 'string' ? subjectName : undefined,
      category: typeof category === 'string' ? category : undefined,
      educationLevel: typeof educationLevel === 'string' ? educationLevel : undefined
    });
    res.json(result);
  },

  getPublicQuestion: async (req: Request, res: Response) => {
    const question = await questionService.getQuestionDetail(req.params.id);
    if (!question) {
      throw new ApiError(404, 'Soru bulunamadı.');
    }
    res.json(question);
  },

  getStudentQuestions: async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Yetkilendirme başarısız.');
    }
    const questions = await questionService.getStudentQuestions(req.user.id);
    res.json(questions);
  },

  getTeacherQueue: async (req: Request, res: Response) => {
    if (!req.user || req.user.role !== 'TEACHER') {
      throw new ApiError(403, 'Yalnızca öğretmenler bu listeye erişebilir.');
    }

    const questions = await questionService.getTeacherQueue(req.user.id);
    res.json(questions);
  },

  submitTeacherAnswer: async (req: Request, res: Response) => {
    if (!req.user || req.user.role !== 'TEACHER') {
      throw new ApiError(403, 'Yalnızca öğretmenler yanıt paylaşabilir.');
    }

    const payload = teacherAnswerSchema.parse(req.body ?? {});

    const attachments = Array.isArray(req.files) ? (req.files) : undefined;

    const question = await questionService.submitTeacherAnswer({
      teacherId: req.user.id,
      questionId: req.params.id,
      payload,
      files: attachments
    });

    res.json(question);
  },

  addFollowUp: async (req: Request, res: Response) => {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw new ApiError(403, 'Yalnızca öğrenciler takip sorusu sorabilir.');
    }

    const payload = followUpSchema.parse({
      ...req.body,
      solverType: String(req.body?.solverType ?? '').toUpperCase()
    });

    const question = await questionService.addFollowUp({
      questionId: req.params.id,
      studentId: req.user.id,
      payload
    });

    res.status(201).json(question);
  },

  generatePracticeQuestion: async (req: Request, res: Response) => {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw new ApiError(403, 'Yalnızca öğrenciler benzer soru isteyebilir.');
    }

    const practice = await questionService.generatePracticeQuestion({
      questionId: req.params.id,
      studentId: req.user.id
    });

    res.json(practice);
  },

  submitSolution: async (req: Request, res: Response) => {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw new ApiError(403, 'Yalnızca öğrenciler çözüm yükleyebilir.');
    }

    const payload = submitSolutionSchema.parse(req.body);

    const solution = await questionService.submitSolution({
      questionId: req.params.id,
      studentId: req.user.id,
      content: payload.content
    });

    res.status(201).json(solution);
  },

  markSolution: async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Yetkilendirme başarısız.');
    }

    const payload = markSolutionSchema.parse(req.body);

    const solution = await questionService.markSolution({
      solutionId: req.params.solutionId,
      questionOwnerId: req.user.id,
      isCorrect: payload.isCorrect
    });

    res.json(solution);
  },

  getSolutions: async (req: Request, res: Response) => {
    const solutions = await questionService.getSolutions(req.params.id);
    res.json(solutions);
  },

  getLeaderboard: async (req: Request, res: Response) => {
    const period = (typeof req.query.period === 'string' ? req.query.period : 'weekly') as 'daily' | 'weekly' | 'monthly';
    const validPeriods = ['daily', 'weekly', 'monthly'];
    const safePeriod = validPeriods.includes(period) ? period : 'weekly';

    const leaderboard = await questionService.getLeaderboard(safePeriod);
    res.json(leaderboard);
  }
};
