import { createAccountSchema } from '@kundiva/shared';
import { Request, Response } from 'express';

import { ApiError } from '../middleware/errorHandler';
import { adminService } from '../services/adminService';
import { authService } from '../services/authService';

export const adminController = {
  overview: async (_req: Request, res: Response) => {
    const stats = await adminService.overview();
    res.json(stats);
  },
  createAccount: async (req: Request, res: Response) => {
    const payload = createAccountSchema.parse(req.body);
    const user = await authService.createAccount(payload);
    res.status(201).json(user);
  },
  createAccountsBulk: async (req: Request, res: Response) => {
    const { accounts } = req.body;
    if (!Array.isArray(accounts)) {
      throw new ApiError(400, 'Geçersiz veri formatı. Dizi bekleniyor.');
    }
    const result = await authService.createAccountsBulk(accounts);
    res.json(result);
  },
  listUsers: async (_req: Request, res: Response) => {
    const users = await adminService.listUsers();
    res.json(users);
  },
  updateUserRole: async (req: Request, res: Response) => {
    const { role } = req.body ?? {};
    if (typeof role !== 'string') {
      throw new ApiError(400, 'Geçersiz rol bildirimi.');
    }
    const user = await adminService.updateUserRole(req.params.userId, role);
    res.json(user);
  },
  deleteUser: async (req: Request, res: Response) => {
    await adminService.deleteUser(req.params.userId);
    res.status(204).send();
  },
  listQuestions: async (_req: Request, res: Response) => {
    const questions = await adminService.listQuestions();
    res.json(questions);
  },
  deleteQuestion: async (req: Request, res: Response) => {
    await adminService.deleteQuestion(req.params.questionId);
    res.status(204).send();
  },
  listComments: async (_req: Request, res: Response) => {
    const comments = await adminService.listComments();
    res.json(comments);
  },
  deleteComment: async (req: Request, res: Response) => {
    await adminService.deleteComment(req.params.commentId);
    res.status(204).send();
  },
  listMessages: async (_req: Request, res: Response) => {
    const messages = await adminService.listMessages();
    res.json(messages);
  },
  flagMessage: async (req: Request, res: Response) => {
    const { isSpam } = req.body ?? {};
    if (typeof isSpam !== 'boolean') {
      throw new ApiError(400, 'Geçersiz spam değeri.');
    }
    const message = await adminService.flagMessage(req.params.messageId, isSpam);
    res.json(message);
  },
  listFriendships: async (_req: Request, res: Response) => {
    const friendships = await adminService.listFriendships();
    res.json(friendships);
  },
  getSettings: async (_req: Request, res: Response) => {
    const settings = await adminService.getSettings();
    res.json(settings);
  },
  updateSettings: async (req: Request, res: Response) => {
    const updates = Array.isArray(req.body?.updates) ? req.body.updates : null;
    if (!updates || updates.some((item: any) => typeof item?.key !== 'string')) {
      throw new ApiError(400, 'Geçersiz ayar verisi.');
    }

    const sanitized = updates.map((item: { key: string; value: unknown }) => ({
      key: item.key,
      value: String(item.value ?? '')
    }));

    const result = await adminService.updateSettings(sanitized, req.user!.id);
    res.json(result);
  },
  usageMetrics: async (_req: Request, res: Response) => {
    const metrics = await adminService.getUsageMetrics();
    res.json(metrics);
  },
  listApiKeys: async (_req: Request, res: Response) => {
    const keys = await adminService.listApiKeys();
    res.json(keys);
  },
  addApiKey: async (req: Request, res: Response) => {
    const provider = typeof req.body?.provider === 'string' ? req.body.provider.toUpperCase() : '';
    const key = typeof req.body?.key === 'string' ? req.body.key.trim() : '';
    const priority = req.body?.priority;

    if (!['GEMINI', 'IMAGEN'].includes(provider)) {
      throw new ApiError(400, 'Geçersiz sağlayıcı.');
    }
    if (!key) {
      throw new ApiError(400, 'API anahtarı boş olamaz.');
    }

    const parsedPriority = priority === undefined ? undefined : Number(priority);
    if (parsedPriority !== undefined && !Number.isFinite(parsedPriority)) {
      throw new ApiError(400, 'Öncelik değeri sayısal olmalıdır.');
    }

    const created = await adminService.addApiKey(provider as 'GEMINI' | 'IMAGEN', key, parsedPriority);
    res.status(201).json(created);
  },
  updateApiKey: async (req: Request, res: Response) => {
    const { priority, isActive } = req.body ?? {};
    if (priority === undefined && isActive === undefined) {
      throw new ApiError(400, 'Güncellenecek alan belirtilmedi.');
    }

    if (priority !== undefined) {
      const parsed = Number(priority);
      if (!Number.isFinite(parsed)) {
        throw new ApiError(400, 'Öncelik sayısal olmalıdır.');
      }
      await adminService.updateApiKeyPriority(req.params.keyId, parsed);
    }

    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        throw new ApiError(400, 'Geçersiz anahtar durumu.');
      }
      await adminService.updateApiKeyStatus(req.params.keyId, isActive);
    }

    res.json({ success: true });
  },
  sanctionUser: async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Yetkilendirme başarısız.');
    }

    const { mode, reason, expiresAt } = req.body ?? {};
    if (!['BAN', 'SHADOW'].includes(mode)) {
      throw new ApiError(400, 'Geçersiz yaptırım modu.');
    }

    const sanction = await adminService.sanctionUser({
      userId: req.params.userId,
      mode,
      reason: typeof reason === 'string' ? reason : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      actorId: req.user.id
    });

    res.json(sanction);
  },
  liftSanction: async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Yetkilendirme başarısız.');
    }

    const { mode } = req.body ?? {};
    if (!['BAN', 'SHADOW'].includes(mode)) {
      throw new ApiError(400, 'Geçersiz yaptırım modu.');
    }

    const sanction = await adminService.liftSanction({
      userId: req.params.userId,
      mode,
      actorId: req.user.id
    });

    res.json(sanction);
  },
  listSupportTickets: async (_req: Request, res: Response) => {
    const tickets = await adminService.listSupportTickets();
    res.json(tickets);
  },
  listAuditLogs: async (req: Request, res: Response) => {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const logs = await adminService.listAuditLogs(Number.isFinite(limit) ? limit : 50);
    res.json(logs);
  },
  listBannedIps: async (_req: Request, res: Response) => {
    const ips = await adminService.listBannedIps();
    res.json(ips);
  },
  addBannedIp: async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, 'Yetkilendirme başarısız.');
    }

    const { ipAddress, reason, expiresAt } = req.body ?? {};
    if (typeof ipAddress !== 'string' || ipAddress.trim().length === 0) {
      throw new ApiError(400, 'IP adresi gereklidir.');
    }

    const record = await adminService.addBannedIp({
      ipAddress: ipAddress.trim(),
      reason: typeof reason === 'string' ? reason : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      actorId: req.user.id
    });

    res.status(201).json(record);
  },
  removeBannedIp: async (req: Request, res: Response) => {
    await adminService.removeBannedIp(req.params.ipId);
    res.status(204).send();
  },
  generateImagenPreview: async (req: Request, res: Response) => {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!prompt) {
      throw new ApiError(400, 'Görsel oluşturmak için bir prompt girmelisiniz.');
    }

    const count = req.body?.count !== undefined ? Number(req.body.count) : undefined;
    const model = typeof req.body?.model === 'string' ? req.body.model : undefined;

    const result = await adminService.generateImagenPreview({ prompt, count, model });
    res.json(result);
  }
};
