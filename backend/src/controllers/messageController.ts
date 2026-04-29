import { sendMessageSchema } from '@kundiva/shared';
import { Request, Response } from 'express';

import { ApiError } from '../middleware/errorHandler';
import { messageService } from '../services/messageService';

export const messageController = {
  listPartners: async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Yetkilendirme başarısız.');
    }

    const partners = await messageService.listPartners(req.user.id);
    res.json(partners);
  },
  getConversation: async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Yetkilendirme başarısız.');
    }

    const messages = await messageService.getConversation({
      userId: req.user.id,
      partnerId: req.params.partnerId
    });

    res.json(messages);
  },
  sendMessage: async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Yetkilendirme başarısız.');
    }

    const payload = sendMessageSchema.parse({
      receiverId: req.params.partnerId,
      content: req.body?.content
    });

    const message = await messageService.sendMessage({
      senderId: req.user.id,
      receiverId: payload.receiverId,
      content: payload.content
    });

    res.status(201).json(message);
  }
};
