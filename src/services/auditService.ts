import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

type AuditPayload = {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  path: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
};

export const auditService = {
  logRequest: async (payload: AuditPayload) => {
    const { userId, ipAddress, userAgent, method, path, statusCode, metadata } = payload;

    try {
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            lastSeenAt: new Date(),
            lastSeenIp: ipAddress,
            lastSeenUserAgent: userAgent
          }
        });
      }

      await prisma.userAuditLog.create({
        data: {
          userId: userId ?? null,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
          method: method ?? null,
          path,
          statusCode: statusCode ?? null,
          metadata: metadata ? JSON.stringify(metadata).slice(0, 1024) : null
        }
      });
    } catch (error) {
      logger.warn('Audit log kaydedilemedi', { error, path });
    }
  }
};
