import { ApiError } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';
import { aiService } from './aiService';

const sanitize = (value: string) => value.trim();

export const commentService = {
  listForAnswer: async (answerId: string) => {
    return prisma.comment.findMany({
      where: { answerId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });
  },
  create: async (params: {
    answerId: string;
    authorId: string;
    content: string;
    parentCommentId?: string;
  }) => {
    const answer = await prisma.answer.findUnique({
      where: { id: params.answerId },
      select: { id: true }
    });

    if (!answer) {
      throw new ApiError(404, 'Yanıt bulunamadı.');
    }

    const content = sanitize(params.content);
    if (!content) {
      throw new ApiError(400, 'Yorum metni boş olamaz.');
    }

    // Ethics check
    const { moderationService } = await import('./moderationService');
    const isFlagged = await moderationService.shouldFlag(content);
    if (isFlagged) {
      throw new ApiError(400, 'Yorum içerik politikalarına aykırı veya onay gerektiriyor.');
    }

    let parentCommentId: string | undefined;

    if (params.parentCommentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: params.parentCommentId },
        select: { id: true, answerId: true }
      });
      if (!parent || parent.answerId !== answer.id) {
        throw new ApiError(400, 'Geçersiz yanıt.');
      }
      parentCommentId = parent.id;
    }

    const created = await prisma.comment.create({
      data: {
        answerId: answer.id,
        authorId: params.authorId,
        content,
        parentCommentId
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        replies: true
      }
    });

    return created;
  }
};
