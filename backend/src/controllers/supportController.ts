import { Request, Response } from 'express';

import { ApiError } from '../middleware/errorHandler';
import { supportService } from '../services/supportService';

const ensureAuthenticated = (req: Request) => {
  if (!req.user) {
    throw new ApiError(401, 'Canlı destek için giriş yapmalısınız.');
  }
};

export const supportController = {
  info: (_req: Request, res: Response) => {
    const payload = supportService.getStaticContent();
    res.json(payload);
  },
  session: async (req: Request, res: Response) => {
    ensureAuthenticated(req);

    const session = await supportService.getActiveSession(req.user!.id);
    if (!session) {
      return res.json({ session: null });
    }

    res.json({
      session: {
        ticket: session.ticket,
        messages: session.messages
      }
    });
  },
  sendMessage: async (req: Request, res: Response) => {
    ensureAuthenticated(req);

    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (content.length === 0) {
      throw new ApiError(400, 'Mesaj metni boş olamaz.');
    }

    const result = await supportService.enqueueMessage({
      userId: req.user!.id,
      content
    });

    res.status(201).json(result);
  }
};
