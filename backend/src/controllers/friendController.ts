import { friendRequestSchema, friendResponseSchema } from '@kundiva/shared';
import { Request, Response } from 'express';

import { ApiError } from '../middleware/errorHandler';
import { socialService } from '../services/socialService';

export const friendController = {
  sendRequest: async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Yetkilendirme başarısız.');
    }

    const payload = friendRequestSchema.parse(req.body);
    const friendship = await socialService.sendFriendRequest({
      requesterId: req.user.id,
      email: payload.email
    });

    res.status(201).json(friendship);
  },
  respond: async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Yetkilendirme başarısız.');
    }

    const payload = friendResponseSchema.parse(req.body);

    const updated = await socialService.respondToRequest({
      friendshipId: payload.friendshipId,
      userId: req.user.id,
      action: payload.action
    });

    res.json(updated);
  },
  listFriends: async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Yetkilendirme başarısız.');
    }

    const friends = await socialService.listFriends(req.user.id);
    res.json(friends);
  },
  listPending: async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Yetkilendirme başarısız.');
    }

    const incoming = await socialService.listPendingRequests(req.user.id);
    const outgoing = await socialService.listOutgoingRequests(req.user.id);
    res.json({ incoming, outgoing });
  }
};
