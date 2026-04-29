import { completeProfileSchema,loginSchema } from '@kundiva/shared';
import { Request, Response } from 'express';

import { ApiError } from '../middleware/errorHandler';
import { authService } from '../services/authService';

export const authController = {
  login: async (req: Request, res: Response) => {
    const payload = loginSchema.parse(req.body);
    const result = await authService.login(payload);
    res.json(result);
  },
  currentUser: async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Yetkilendirme başarısız.' });
    }
    res.json(req.user);
  },
  completeProfile: async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Yetkilendirme başarısız.');
    }

    const payload = completeProfileSchema.parse(req.body);
    const result = await authService.completeProfile(req.user.id, payload);
    res.json(result);
  }
};
