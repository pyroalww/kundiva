import { readFileSync } from 'node:fs';

import type {
  AnswerSource,
  CreateQuestionPayload,
  FollowUpPayload,
  PracticeQuestion,
  QuestionStatus,
  SolverType,
  TeacherAnswerPayload,
  UserRole
} from '@kundiva/shared';
import { Prisma } from '@prisma/client';

import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { aiService } from './aiService';
import { mediaService } from './mediaService';
import { ocrService } from './ocrService';

type CreateQuestionOptions = {
  payload: CreateQuestionPayload;
  studentUser: {
    id: string;
    firstName: string;
    lastName: string;
  };
  file?: Express.Multer.File;
};

const DEFAULT_TITLE_FALLBACK = 'Öğrenci Sorusu';
const ETHICS_BLOCKED_MESSAGE = 'Yanıt etik kontrol nedeniyle engellendi.';

const ANSWER_SOURCE = {
  AI: 'AI',
  TEACHER: 'TEACHER',
  FOLLOW_UP: 'FOLLOW_UP'
} as const satisfies Record<string, AnswerSource>;

const SOLVER_TYPE = {
  AI: 'AI',
  TEACHER: 'TEACHER'
} as const satisfies Record<string, SolverType>;

const QUESTION_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  ANSWERED: 'ANSWERED',
  FLAGGED: 'FLAGGED'
} as const satisfies Record<string, QuestionStatus>;

const USER_ROLE = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER'
} as const satisfies Record<string, UserRole>;

const baseCommentInclude = {
  where: { parentCommentId: null },
  orderBy: { createdAt: 'asc' },
  include: {
    author: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true
      }
    },
    replies: {
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    }
  }
} as const;

const answerWithComments = {
  orderBy: { createdAt: 'asc' },
  include: {
    author: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true
      }
    },
    comments: baseCommentInclude,
    attachments: {
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        type: true,
        mimeType: true,
        storagePath: true,
        originalName: true,
        fileSize: true,
        durationMs: true,
        createdAt: true
      }
    }
  }
} as const;

const saveAnswerAttachments = async (answerId: string, files?: Express.Multer.File[]) => {
  if (!files || files.length === 0) {
    return;
  }

  for (const file of files) {
    try {
      const processed = await mediaService.processAttachment(file);
      await prisma.answerAttachment.create({
        data: {
          answerId,
          type: processed.type,
          originalName: file.originalname,
          mimeType: processed.mimeType,
          storagePath: processed.storagePath,
          fileSize: processed.fileSize,
          durationMs: processed.durationMs ?? null
        }
      });
    } catch (error) {
      logger.warn('Attachment kaydedilemedi', { error, answerId, filename: file.originalname });
    }
  }
};

const ensureQuestionText = (payloadText?: string, ocrText?: string) => {
  const combined = [payloadText, ocrText]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join('\n\n')
    .trim();

  if (!combined) {
    throw new ApiError(400, 'Soru metni veya okunabilir bir görsel sunmalısınız.');
  }

  return combined;
};

const normalizeList = (value?: string | null) =>
  value
    ?.split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean) ?? [];

const findCandidateTeachers = async (question: {
  subjectArea: string;
  subjectName: string;
  educationLevel: string;
}) => {
  const { subjectArea, subjectName, educationLevel } = question;

  const teachers = await prisma.user.findMany({
    where: {
      role: USER_ROLE.TEACHER
    }
  });

  if (teachers.length === 0) {
    return [];
  }

  const subjectTokens = normalizeList(`${subjectName},${subjectArea}`);
  const levelToken = educationLevel.trim().toLowerCase();

  const filtered = teachers.filter((teacher) => {
    const teacherSubjects = normalizeList(teacher.subjects);
    const teacherLevels = normalizeList(teacher.educationLevels);

    const subjectMatch =
      teacherSubjects.length === 0 ||
      subjectTokens.some((token) => teacherSubjects.includes(token));

    const levelMatch =
      teacherLevels.length === 0 || teacherLevels.includes(levelToken);

    return subjectMatch && levelMatch;
  });

  return filtered.length > 0 ? filtered : teachers;
};

const assignToTeachers = async (questionId: string, teacherIds: string[]) => {
  if (teacherIds.length === 0) {
    return;
  }

  await prisma.teacherQueue.createMany({
    data: teacherIds.map((teacherId) => ({
      teacherId,
      questionId
    }))
  });
};

const serializeAnswerContent = (value: unknown) =>
  typeof value === 'string' ? value : JSON.stringify(value, null, 2);

const buildFollowUpContext = async (questionId: string) => {
  const answers = await prisma.answer.findMany({
    where: { questionId },
    orderBy: { createdAt: 'asc' }
  });

  return answers
    .map(
      (answer) =>
        `${answer.source}: ${answer.content.length > 500 ? `${answer.content.slice(0, 500)}...` : answer.content}`
    )
    .join('\n');
};

/**
 * Process AI answer in the background. The question is already created with PENDING status.
 * AI processing runs asynchronously, and once complete the answer is attached.
 */
const processAiInBackground = (questionId: string, questionText: string, file?: Express.Multer.File) => {
  setImmediate(async () => {
    try {
      const question = await prisma.question.findUnique({ where: { id: questionId } });
      if (!question) return;

      await prisma.question.update({
        where: { id: questionId },
        data: { status: QUESTION_STATUS.IN_PROGRESS }
      });

      const attachment = file
        ? {
          base64: readFileSync(file.path).toString('base64'),
          mimeType: file.mimetype
        }
        : undefined;

      const aiResult = await aiService.generateStructuredAnswer({
        title: question.title,
        questionText,
        metadata: {
          course: question.course,
          subjectArea: question.subjectArea,
          subjectName: question.subjectName,
          educationLevel: question.educationLevel,
          solverType: SOLVER_TYPE.AI
        },
        image: attachment
      });

      // AI cevabını her zaman kaydet ve onayla — eğitim platformunda etik gate gereksiz
      await prisma.$transaction(async (tx) => {
        await tx.answer.create({
          data: {
            questionId: question.id,
            source: ANSWER_SOURCE.AI,
            content: serializeAnswerContent(aiResult.content)
          }
        });

        await tx.question.update({
          where: { id: question.id },
          data: {
            status: QUESTION_STATUS.ANSWERED,
            aiEthicsFlag: true
          }
        });
      });
    } catch (error) {
      logger.error('Background AI processing failed', { error, questionId });
      // Hata durumunda PENDING'e döndür, öğretmenler yanıtlayabilir
      await prisma.question.update({
        where: { id: questionId },
        data: { status: QUESTION_STATUS.PENDING }
      }).catch(() => { });
    }
  });
};

export const questionService = {
  createQuestion: async ({ payload, studentUser, file }: CreateQuestionOptions) => {
    // Check AI credits if useKundivaAi is enabled
    if (payload.useKundivaAi) {
      const user = await prisma.user.findUnique({ where: { id: studentUser.id } });
      if (!user || user.aiCredits <= 0) {
        throw new ApiError(403, 'Yeterli yapay zeka krediniz bulunmuyor. Doğru çözümler yaparak kredi kazanabilirsiniz.');
      }
    }

    let processedQuestionImage:
      | {
        storagePath: string;
        type: string;
        mimeType: string;
        fileSize: number;
        durationMs: number | null;
      }
      | undefined;

    const ocrText = file
      ? await (async () => {
        processedQuestionImage = await mediaService.processQuestionImage(file);
        return ocrService.extractText(file.path);
      })()
      : undefined;

    const questionText = ensureQuestionText(payload.questionText, ocrText);

    const title =
      payload.title ??
      (file ? await aiService.generateTitle(questionText, payload.subjectName) : undefined) ??
      payload.questionText?.slice(0, 80) ??
      payload.subjectName ??
      DEFAULT_TITLE_FALLBACK;

    // solverType is always TEACHER now, AI is done via useKundivaAi flag in background
    const solverType = SOLVER_TYPE.TEACHER;

    // Check if content needs to be flagged based on AUTO_PUBLISH_MODE
    const { moderationService } = await import('./moderationService');
    const isFlagged = await moderationService.shouldFlag(`${title}\n${questionText}`);
    const baseStatus = isFlagged ? QUESTION_STATUS.FLAGGED : QUESTION_STATUS.PENDING;

    const created = await prisma.$transaction(async (tx) => {
      const question = await tx.question.create({
        data: {
          studentId: studentUser.id,
          firstName: payload.firstName,
          lastName: payload.lastName,
          studentNumber: payload.studentNumber,
          course: payload.course,
          subjectArea: payload.subjectArea,
          subjectName: payload.subjectName,
          category: payload.category,
          educationLevel: payload.educationLevel,
          title,
          description: questionText,
          solverType,
          status: baseStatus,
          ocrText,
          useKundivaAi: payload.useKundivaAi ?? false
        }
      });

      if (file && processedQuestionImage) {
        await tx.questionAttachment.create({
          data: {
            questionId: question.id,
            type: processedQuestionImage.type,
            originalName: file.originalname,
            mimeType: processedQuestionImage.mimeType,
            storagePath: processedQuestionImage.storagePath,
            fileSize: processedQuestionImage.fileSize,
            durationMs: processedQuestionImage.durationMs
          }
        });
      }

      return question;
    });

    // If useKundivaAi, process AI answer in background and deduct credit
    if (payload.useKundivaAi) {
      await prisma.user.update({
        where: { id: studentUser.id },
        data: { aiCredits: { decrement: 1 } }
      });
      processAiInBackground(created.id, questionText, file);
    }

    // Always assign to teacher queue (questions are now always visible)
    const teachers = await findCandidateTeachers({
      subjectArea: created.subjectArea,
      subjectName: created.subjectName,
      educationLevel: created.educationLevel
    });
    await assignToTeachers(
      created.id,
      teachers.map((teacher) => teacher.id)
    );

    return prisma.question.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        answers: answerWithComments,
        attachments: true
      }
    });
  },

  /** List all questions (not just answered), visible to both students and teachers */
  listAllQuestions: async (params: {
    query?: string;
    take?: number;
    skip?: number;
    course?: string;
    subjectArea?: string;
    subjectName?: string;
    category?: string;
    educationLevel?: string;
    status?: string;
  }) => {
    const { query, take = 20, skip = 0, course, subjectArea, subjectName, category, educationLevel, status } = params;

    const where: Prisma.QuestionWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (query) {
      where.OR = [
        { title: { contains: query } },
        { description: { contains: query } }
      ];
    }

    if (course) where.course = course;
    if (subjectArea) where.subjectArea = subjectArea;
    if (subjectName) where.subjectName = subjectName;
    if (category) where.category = category;
    if (educationLevel) where.educationLevel = educationLevel;

    const [items, total] = await prisma.$transaction([
      prisma.question.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          title: true,
          subjectName: true,
          subjectArea: true,
          course: true,
          category: true,
          educationLevel: true,
          createdAt: true,
          status: true,
          solverType: true,
          useKundivaAi: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              answers: true,
              solutions: true
            }
          }
        }
      }),
      prisma.question.count({ where })
    ]);

    return { items, total };
  },

  listPublicQuestions: async (params: {
    query?: string;
    take?: number;
    skip?: number;
    course?: string;
    subjectArea?: string;
    subjectName?: string;
    category?: string;
    educationLevel?: string;
  }) => {
    const { query, take = 20, skip = 0, course, subjectArea, subjectName, category, educationLevel } = params;

    const where: Prisma.QuestionWhereInput = {};

    if (query) {
      where.OR = [
        { title: { contains: query } },
        { description: { contains: query } }
      ];
    }

    if (course) where.course = course;
    if (subjectArea) where.subjectArea = subjectArea;
    if (subjectName) where.subjectName = subjectName;
    if (category) where.category = category;
    if (educationLevel) where.educationLevel = educationLevel;

    const [items, total] = await prisma.$transaction([
      prisma.question.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          title: true,
          subjectName: true,
          subjectArea: true,
          course: true,
          category: true,
          educationLevel: true,
          createdAt: true,
          status: true,
          useKundivaAi: true,
          _count: {
            select: {
              answers: true,
              solutions: true
            }
          }
        }
      }),
      prisma.question.count({ where })
    ]);

    return { items, total };
  },

  getQuestionDetail: async (id: string) => {
    return prisma.question.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        },
        answers: answerWithComments,
        attachments: true,
        solutions: {
          orderBy: [
            { isCorrect: 'desc' },
            { points: 'desc' },
            { createdAt: 'desc' }
          ],
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                totalPoints: true
              }
            }
          }
        }
      }
    });
  },

  getStudentQuestions: async (studentId: string) => {
    return prisma.question.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: {
        answers: answerWithComments
      }
    });
  },

  getTeacherQueue: async (_teacherId: string) => {
    return prisma.question.findMany({
      where: {
        status: {
          in: [QUESTION_STATUS.PENDING, QUESTION_STATUS.IN_PROGRESS]
        }
      },
      orderBy: { createdAt: 'asc' },
      include: {
        attachments: true,
        answers: answerWithComments
      }
    });
  },

  submitTeacherAnswer: async (params: {
    teacherId: string;
    questionId: string;
    payload: TeacherAnswerPayload;
    files?: Express.Multer.File[];
  }) => {
    const question = await prisma.question.findUnique({
      where: { id: params.questionId }
    });

    if (!question) {
      throw new ApiError(404, 'Soru bulunamadı.');
    }

    let createdAnswerId: string | null = null;

    await prisma.$transaction(async (tx) => {
      const answer = await tx.answer.create({
        data: {
          questionId: question.id,
          authorId: params.teacherId,
          source: ANSWER_SOURCE.TEACHER,
          content: params.payload.content
        }
      });
      createdAnswerId = answer.id;

      await tx.question.update({
        where: { id: question.id },
        data: {
          status: QUESTION_STATUS.ANSWERED,
          assignedTeacherId: params.teacherId
        }
      });

      await tx.teacherQueue.deleteMany({
        where: {
          questionId: question.id
        }
      });
    });

    if (createdAnswerId) {
      await saveAnswerAttachments(createdAnswerId, params.files).catch((error) =>
        logger.warn('Öğretmen yanıtı ekleri işlenemedi', {
          error,
          answerId: createdAnswerId
        })
      );
    }

    return prisma.question.findUniqueOrThrow({
      where: { id: question.id },
      include: {
        answers: answerWithComments
      }
    });
  },

  addFollowUp: async (params: {
    questionId: string;
    studentId: string;
    payload: FollowUpPayload;
  }) => {
    const question = await prisma.question.findUnique({
      where: { id: params.questionId }
    });

    if (!question) {
      throw new ApiError(404, 'Soru bulunamadı.');
    }

    if (question.studentId !== params.studentId) {
      throw new ApiError(403, 'Bu soruyu güncelleme yetkiniz yok.');
    }

    if (question.status !== QUESTION_STATUS.ANSWERED) {
      throw new ApiError(400, 'Bu soru yanıtlanmadan takip sorusu soramazsınız.');
    }

    const followUp = await prisma.answer.create({
      data: {
        questionId: question.id,
        authorId: params.studentId,
        source: ANSWER_SOURCE.FOLLOW_UP,
        content: params.payload.content
      }
    });

    if (params.payload.solverType === SOLVER_TYPE.AI) {
      // Check AI credits
      const user = await prisma.user.findUnique({ where: { id: params.studentId } });
      if (!user || user.aiCredits <= 0) {
        throw new ApiError(403, 'Yeterli yapay zeka krediniz bulunmuyor.');
      }

      await prisma.user.update({
        where: { id: params.studentId },
        data: { aiCredits: { decrement: 1 } }
      });

      await prisma.question.update({
        where: { id: question.id },
        data: { status: QUESTION_STATUS.IN_PROGRESS }
      });

      const context = await buildFollowUpContext(question.id);
      const aiResult = await aiService.generateStructuredAnswer({
        title: question.title,
        questionText: params.payload.content,
        metadata: {
          course: question.course,
          subjectArea: question.subjectArea,
          subjectName: question.subjectName,
          educationLevel: question.educationLevel,
          solverType: SOLVER_TYPE.AI,
          followUpContext: context
        }
      });

      // AI cevabını her zaman kaydet ve onayla
      await prisma.answer.create({
        data: {
          questionId: question.id,
          source: ANSWER_SOURCE.AI,
          content: serializeAnswerContent(aiResult.content),
          followUpOfId: followUp.id
        }
      });

      await prisma.question.update({
        where: { id: question.id },
        data: {
          status: QUESTION_STATUS.ANSWERED,
          aiEthicsFlag: true
        }
      });
    } else {
      const teachers = await findCandidateTeachers({
        subjectArea: question.subjectArea,
        subjectName: question.subjectName,
        educationLevel: question.educationLevel
      });

      await assignToTeachers(
        question.id,
        teachers.map((teacher) => teacher.id)
      );

      await prisma.question.update({
        where: { id: question.id },
        data: {
          status: QUESTION_STATUS.IN_PROGRESS
        }
      });
    }

    return prisma.question.findUniqueOrThrow({
      where: { id: question.id },
      include: {
        answers: answerWithComments
      }
    });
  },

  generatePracticeQuestion: async (params: { questionId: string; studentId: string }): Promise<PracticeQuestion> => {
    const question = await prisma.question.findUnique({
      where: { id: params.questionId },
      include: {
        answers: {
          where: { source: ANSWER_SOURCE.AI }
        }
      }
    });

    if (!question) {
      throw new ApiError(404, 'Soru bulunamadı.');
    }

    if (question.studentId !== params.studentId) {
      throw new ApiError(403, 'Bu soruya erişim yetkiniz yok.');
    }

    if (question.status !== QUESTION_STATUS.ANSWERED) {
      throw new ApiError(400, 'Soru çözümlenmeden benzer soru oluşturulamaz.');
    }

    const aiAnswer = question.answers.at(-1)?.content;
    const practice = await aiService.generatePracticeQuestion({
      title: question.title,
      questionText: question.description,
      aiAnswer
    });

    return practice;
  },

  /** Student submits a solution */
  submitSolution: async (params: {
    questionId: string;
    studentId: string;
    content: string;
  }) => {
    const question = await prisma.question.findUnique({
      where: { id: params.questionId }
    });

    if (!question) {
      throw new ApiError(404, 'Soru bulunamadı.');
    }

    // Ethics check
    const { moderationService } = await import('./moderationService');
    const isFlagged = await moderationService.shouldFlag(params.content);
    if (isFlagged) {
      throw new ApiError(400, 'Çözüm içeriği uygun değil veya onay gerektiriyor.');
    }

    const solution = await prisma.studentSolution.create({
      data: {
        questionId: params.questionId,
        authorId: params.studentId,
        content: params.content
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            totalPoints: true
          }
        }
      }
    });

    return solution;
  },

  /** Question owner marks a solution as correct/incorrect */
  markSolution: async (params: {
    solutionId: string;
    questionOwnerId: string;
    isCorrect: boolean;
  }) => {
    const solution = await prisma.studentSolution.findUnique({
      where: { id: params.solutionId },
      include: {
        question: true
      }
    });

    if (!solution) {
      throw new ApiError(404, 'Çözüm bulunamadı.');
    }

    if (solution.question.studentId !== params.questionOwnerId) {
      throw new ApiError(403, 'Yalnızca soruyu soran kişi çözümü değerlendirebilir.');
    }

    const pointsToAward = params.isCorrect ? 10 : 0;
    const creditsToAward = params.isCorrect ? 1 : 0;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedSolution = await tx.studentSolution.update({
        where: { id: params.solutionId },
        data: {
          isCorrect: params.isCorrect,
          points: pointsToAward
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              totalPoints: true
            }
          }
        }
      });

      if (params.isCorrect) {
        await tx.user.update({
          where: { id: solution.authorId },
          data: {
            totalPoints: { increment: pointsToAward },
            aiCredits: { increment: creditsToAward }
          }
        });
        
        await tx.question.update({
          where: { id: solution.questionId },
          data: { status: QUESTION_STATUS.ANSWERED }
        });
      }

      return updatedSolution;
    });

    return updated;
  },

  /** Get solutions for a question sorted by author points (higher scores first) */
  getSolutions: async (questionId: string) => {
    return prisma.studentSolution.findMany({
      where: { questionId },
      orderBy: [
        { isCorrect: 'desc' },
        { points: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            totalPoints: true
          }
        }
      }
    });
  },

  /** Leaderboard: daily, weekly, monthly */
  getLeaderboard: async (period: 'daily' | 'weekly' | 'monthly') => {
    const now = new Date();
    let since: Date;

    if (period === 'daily') {
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'weekly') {
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      since = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const solutions = await prisma.studentSolution.findMany({
      where: {
        isCorrect: true,
        createdAt: { gte: since }
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            totalPoints: true,
            role: true
          }
        }
      }
    });

    // Aggregate points per user
    const userMap = new Map<string, {
      userId: string;
      firstName: string;
      lastName: string;
      totalPoints: number;
      periodPoints: number;
      correctSolutions: number;
    }>();

    for (const sol of solutions) {
      const existing = userMap.get(sol.authorId);
      if (existing) {
        existing.periodPoints += sol.points;
        existing.correctSolutions += 1;
      } else {
        userMap.set(sol.authorId, {
          userId: sol.authorId,
          firstName: sol.author.firstName,
          lastName: sol.author.lastName,
          totalPoints: sol.author.totalPoints,
          periodPoints: sol.points,
          correctSolutions: 1
        });
      }
    }

    const leaderboard = Array.from(userMap.values())
      .sort((a, b) => b.periodPoints - a.periodPoints)
      .slice(0, 50);

    return leaderboard;
  }
};
