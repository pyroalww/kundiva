import type { UserRole } from '@kundiva/shared';
import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

type TokenPayload = {
  sub: string;
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
  username?: string | null;
};

const banExpired = (expiresAt: Date | null | undefined) => {
  if (!expiresAt) return false;
  return expiresAt.getTime() < Date.now();
};

export const authenticate: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: 'Yetkilendirme başlığı bulunamadı.' });
  }

  const [, token] = header.split(' ');
  if (!token) {
    return res.status(401).json({ message: 'Yetkilendirme bilgisi geçersiz.' });
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as TokenPayload;
    const userRecord = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        role: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        isBanned: true,
        shadowBanned: true,
        banReason: true,
        banExpiresAt: true,
        profileCompleted: true,
        aiCredits: true,
        totalPoints: true,
        studentNumber: true
      }
    });

    if (!userRecord) {
      return res.status(401).json({ message: 'Kullanıcı mevcut değil.' });
    }

    if (userRecord.isBanned) {
      if (banExpired(userRecord.banExpiresAt)) {
        await prisma.user.update({
          where: { id: userRecord.id },
          data: {
            isBanned: false,
            banReason: null,
            banExpiresAt: null
          }
        });
      } else {
        return res.status(403).json({ message: 'Hesabınız geçici olarak askıya alınmıştır.' });
      }
    }

    req.user = {
      id: userRecord.id,
      role: userRecord.role as UserRole,
      email: userRecord.email,
      firstName: userRecord.firstName,
      lastName: userRecord.lastName,
      username: userRecord.username ?? null,
      shadowBanned: userRecord.shadowBanned ?? false,
      profileCompleted: userRecord.profileCompleted ?? false,
      aiCredits: userRecord.aiCredits ?? 0,
      totalPoints: userRecord.totalPoints ?? 0,
      studentNumber: userRecord.studentNumber ?? null
    };

    return next();
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errName = error instanceof Error ? error.constructor.name : 'Unknown';
    logger.warn('Authenticate failed', { errorName: errName, error: errMsg });

    if (errName === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Oturum süresi dolmuş. Lütfen tekrar giriş yapınız.' });
    }

    return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş jeton.' });
  }
};

export const requireRole = (roles: UserRole | UserRole[]): RequestHandler => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Yetkilendirme başarısız.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Bu işlem için yetkiniz yok.' });
    }

    return next();
  };
};
