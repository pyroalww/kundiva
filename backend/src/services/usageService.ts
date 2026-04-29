import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

export type UsageEventType =
  | 'AI_ANSWER'
  | 'AI_ETHICS'
  | 'AI_PRACTICE'
  | 'AI_SUPPORT'
  | 'AI_MODERATION'
  | 'IMAGEN_GENERATION'
  | 'RATE_LIMIT_TRIGGER'
  | 'SUPPORT_MESSAGE'
  | 'SYSTEM_PROMPT_UPDATE'
  | 'API_KEY_ROTATION'
  | 'MAINTENANCE_MODE'
  | 'USER_SANCTION';

export const usageService = {
  log: async (eventType: UsageEventType, context?: Record<string, unknown>) => {
    try {
      await prisma.usageEvent.create({
        data: {
          eventType,
          context: context ? JSON.stringify(context).slice(0, 1024) : null
        }
      });
    } catch (error) {
      logger.warn('Usage event logging failed', { error, eventType, context });
    }
  }
};
