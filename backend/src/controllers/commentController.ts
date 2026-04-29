import { createCommentSchema } from '@kundiva/shared';
import { Request, Response } from 'express';

import { ApiError } from '../middleware/errorHandler';
import { commentService } from '../services/commentService';

export const commentController = {
  listForAnswer: async (req: Request, res: Response) => {
    const comments = await commentService.listForAnswer(req.params.answerId);
    res.json(comments);
  },
  create: async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Yetkilendirme başarısız.');
    }

    const payload = createCommentSchema.parse(req.body);

    const comment = await commentService.create({
      answerId: req.params.answerId,
      authorId: req.user.id,
      content: payload.content,
      parentCommentId: payload.parentCommentId
    });

    res.status(201).json(comment);
  }
};
