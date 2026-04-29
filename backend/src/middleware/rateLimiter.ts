import type { Request, RequestHandler } from 'express';

import { aiService } from '../services/aiService';
import { usageService } from '../services/usageService';
import { ApiError } from './errorHandler';

const buckets = new Map<string, { count: number; expiresAt: number }>();

type RateLimitOptions = {
  windowMs: number;
  max: number;
  message?: string;
  useSupportModel?: boolean;
  identifier?: (req: Request) => string;
};

export const applyRateLimit = (options: RateLimitOptions): RequestHandler => {
  const windowMs = options.windowMs;
  const max = options.max;
  const message = options.message ?? 'Çok fazla istek gönderildi.';

  return async (req, _res, next) => {
    const keyFromOptions = options.identifier?.(req);
    const userKey = keyFromOptions ?? req.user?.id ?? req.ip;
    const routeKey = `${userKey}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const entry = buckets.get(routeKey);

    if (!entry || entry.expiresAt < now) {
      buckets.set(routeKey, { count: 1, expiresAt: now + windowMs });
      return next();
    }

    if (entry.count >= max) {
      void usageService.log('RATE_LIMIT_TRIGGER', {
        route: `${req.baseUrl}${req.path}`,
        userId: req.user?.id,
        requestId: req.requestId
      });

      if (options.useSupportModel) {
        try {
          const friendly = await aiService.generateSupportResponse(
            `Kullanıcı rate limit sınırına ulaştı. Kullanıcı ID: ${req.user?.id ?? 'anonim'}. Route: ${
              req.baseUrl
            }${req.path}. Kullanıcıya bu durumun nedenini ve bekleme süresini açıklayan bir mesaj ver.`,
            'rate-limit'
          );
          throw new ApiError(429, friendly);
        } catch (error) {
          req.log?.warn('Destek modeli rate limit mesajı üretirken hata aldı', { error });
        }
      }

      throw new ApiError(429, message);
    }

    entry.count += 1;
    buckets.set(routeKey, entry);
    return next();
  };
};
