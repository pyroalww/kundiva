import type { RequestHandler } from 'express';

import { prisma } from '../utils/prisma';
import { ApiError } from './errorHandler';

const isExpired = (expiresAt: Date | null | undefined) => {
  if (!expiresAt) return false;
  return expiresAt.getTime() < Date.now();
};

export const ipBanGuard: RequestHandler = async (req, _res, next) => {
  const ipAddress = req.clientIp ?? req.ip;

  if (!ipAddress || ipAddress === '::1') {
    return next();
  }

  try {
    const ban = await prisma.bannedIp.findUnique({ where: { ipAddress } });
    if (!ban || isExpired(ban.expiresAt)) {
      if (ban && isExpired(ban.expiresAt)) {
        await prisma.bannedIp.delete({ where: { id: ban.id } }).catch(() => undefined);
      }
      return next();
    }

    throw new ApiError(403, 'Bu IP adresi Kundiva erişiminden geçici olarak engellendi.');
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }

    return next(error);
  }
};
