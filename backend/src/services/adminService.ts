import { ApiError } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';
import { apiKeyService } from './apiKeyService';
import { imagenService } from './imagenService';
import { settingsService } from './settingsService';
import { usageService } from './usageService';

export const adminService = {
  overview: async () => {
    const [userCount, teacherCount, adminCount, questionStats, commentCount, messageCount] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.question.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      prisma.comment.count(),
      prisma.message.count()
    ]);

    const statusCounts = questionStats.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {});

    return {
      users: {
        students: userCount,
        teachers: teacherCount,
        admins: adminCount
      },
      questions: statusCounts,
      totalComments: commentCount,
      totalMessages: messageCount
    };
  },
  listUsers: async () => {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        isBanned: true,
        shadowBanned: true,
        banReason: true,
        banExpiresAt: true,
        lastSeenAt: true,
        lastSeenIp: true,
        lastSeenUserAgent: true
      }
    });
  },
  updateUserRole: async (userId: string, role: string) => {
    if (!['STUDENT', 'TEACHER', 'ADMIN'].includes(role)) {
      throw new ApiError(400, 'Geçersiz rol.');
    }

    return prisma.user.update({
      where: { id: userId },
      data: { role }
    });
  },
  deleteUser: async (userId: string) => {
    return prisma.user.delete({ where: { id: userId } });
  },
  listQuestions: async () => {
    return prisma.question.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        answers: {
          select: { id: true }
        }
      }
    });
  },
  deleteQuestion: async (questionId: string) => {
    await prisma.teacherQueue.deleteMany({ where: { questionId } });
    await prisma.solutionVote.deleteMany({ where: { solution: { questionId } } });
    await prisma.studentSolution.deleteMany({ where: { questionId } });

    await prisma.comment.deleteMany({
      where: {
        answer: {
          questionId
        }
      }
    });
    await prisma.answerAttachment.deleteMany({
      where: { answer: { questionId } }
    });
    await prisma.answer.deleteMany({ where: { questionId } });
    await prisma.questionAttachment.deleteMany({ where: { questionId } });
    return prisma.question.delete({ where: { id: questionId } });
  },
  listComments: async () => {
    return prisma.comment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        answer: {
          select: {
            id: true,
            questionId: true
          }
        }
      }
    });
  },
  deleteComment: async (commentId: string) => {
    return prisma.comment.delete({ where: { id: commentId } });
  },
  listMessages: async () => {
    return prisma.message.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  },
  flagMessage: async (messageId: string, isSpam: boolean) => {
    return prisma.message.update({
      where: { id: messageId },
      data: { isSpam }
    });
  },
  listFriendships: async () => {
    return prisma.friendship.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        addressee: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });
  },
  getSettings: async () => {
    return settingsService.getMany([
      'SYSTEM_PROMPT',
      'SUPPORT_PROMPT',
      'MAINTENANCE_MODE',
      'ACTIVE_AI_MODEL',
      'ACTIVE_PRACTICE_MODEL',
      'ACTIVE_SUPPORT_MODEL',
      'ACTIVE_ETHICS_MODEL',
      'ACTIVE_MODERATION_MODEL'
    ]);
  },
  updateSettings: async (
    updates: Array<{ key: string; value: string }>,
    actorId: string
  ) => {
    const applied: Record<string, string> = {};

    for (const update of updates) {
      await settingsService.set(update.key, update.value);
      applied[update.key] = update.value;

      if (['SYSTEM_PROMPT', 'SUPPORT_PROMPT'].includes(update.key)) {
        void usageService.log('SYSTEM_PROMPT_UPDATE', {
          key: update.key,
          actorId
        });
      }

      if (update.key === 'MAINTENANCE_MODE') {
        void usageService.log('MAINTENANCE_MODE', {
          value: update.value,
          actorId
        });
      }
    }

    return applied;
  },
  getUsageMetrics: async () => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [grouped, recent] = await Promise.all([
      prisma.usageEvent.groupBy({
        by: ['eventType'],
        _count: {
          _all: true
        },
        where: {
          createdAt: {
            gte: since
          }
        }
      }),
      prisma.usageEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 25
      })
    ]);

    const totals = grouped.reduce<Record<string, number>>((acc, item) => {
      acc[item.eventType] = item._count._all;
      return acc;
    }, {});

    return {
      totals,
      recent
    };
  },
  listApiKeys: async () => {
    return apiKeyService.listKeys();
  },
  addApiKey: async (provider: 'GEMINI' | 'IMAGEN', key: string, priority?: number) => {
    return apiKeyService.addKey(provider, key, priority);
  },
  updateApiKeyPriority: async (id: string, priority: number) => {
    return apiKeyService.updatePriority(id, priority);
  },
  updateApiKeyStatus: async (id: string, isActive: boolean) => {
    return prisma.apiKey.update({
      where: { id },
      data: {
        isActive,
        updatedAt: new Date(),
        failCount: isActive ? 0 : undefined
      }
    });
  },
  generateImagenPreview: async (params: { prompt: string; count?: number; model?: string }) => {
    return imagenService.generateImages(params);
  },
  listSupportTickets: async () => {
    return prisma.supportTicket.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        _count: {
          select: { messages: true }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 3
        }
      }
    });
  },
  sanctionUser: async (params: {
    userId: string;
    mode: 'BAN' | 'SHADOW';
    reason?: string;
    expiresAt?: Date | null;
    actorId: string;
  }) => {
    const { userId, mode, reason, expiresAt, actorId } = params;

    if (mode === 'BAN') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: true,
          banReason: reason ?? null,
          banExpiresAt: expiresAt ?? null
        }
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: {
          shadowBanned: true,
          banReason: reason ?? null
        }
      });
    }

    await usageService.log('USER_SANCTION', {
      actorId,
      userId,
      mode,
      reason,
      expiresAt
    });

    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isBanned: true,
        shadowBanned: true,
        banReason: true,
        banExpiresAt: true
      }
    });
  },
  liftSanction: async (params: { userId: string; mode: 'BAN' | 'SHADOW'; actorId: string }) => {
    const { userId, mode, actorId } = params;

    if (mode === 'BAN') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: false,
          banReason: null,
          banExpiresAt: null
        }
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: {
          shadowBanned: false
        }
      });
    }

    await usageService.log('USER_SANCTION', {
      actorId,
      userId,
      mode,
      lifted: true
    });

    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isBanned: true,
        shadowBanned: true,
        banReason: true,
        banExpiresAt: true
      }
    });
  },
  listAuditLogs: async (limit = 50) => {
    return prisma.userAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });
  },
  listBannedIps: async () => {
    return prisma.bannedIp.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  },
  addBannedIp: async (params: { ipAddress: string; reason?: string; expiresAt?: Date | null; actorId: string }) => {
    const { ipAddress, reason, expiresAt, actorId } = params;

    const record = await prisma.bannedIp.upsert({
      where: { ipAddress },
      create: {
        ipAddress,
        reason,
        expiresAt: expiresAt ?? null,
        createdById: actorId
      },
      update: {
        reason,
        expiresAt: expiresAt ?? null,
        createdById: actorId,
        createdAt: new Date()
      }
    });

    await usageService.log('USER_SANCTION', {
      actorId,
      ipAddress,
      reason,
      expiresAt,
      mode: 'IP_BAN'
    });

    return record;
  },
  removeBannedIp: async (id: string) => {
    return prisma.bannedIp.delete({ where: { id } });
  }
};
