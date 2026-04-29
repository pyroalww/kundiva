import type { RequestHandler } from 'express';
import { customAlphabet } from 'nanoid';

import { isProduction } from '../config/env';
import { auditService } from '../services/auditService';
import { logger } from '../utils/logger';

const resolveClientIp = (req: Parameters<RequestHandler>[0]) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const candidate = forwarded.split(',')[0]?.trim() ?? req.ip;
    return candidate.startsWith('::ffff:') ? candidate.replace('::ffff:', '') : candidate;
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    const candidate = forwarded[0]?.trim() ?? req.ip;
    return candidate.startsWith('::ffff:') ? candidate.replace('::ffff:', '') : candidate;
  }
  return req.ip?.startsWith('::ffff:') ? req.ip.replace('::ffff:', '') : req.ip;
};

const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', 12);

const shouldSkipBodyLogging = (path: string) =>
  path.startsWith('/health') || path.startsWith('/api/health');

const shouldSkipAudit = (path: string) =>
  shouldSkipBodyLogging(path) || path.startsWith('/uploads') || path.startsWith('/static');

export const withRequestContext: RequestHandler = (req, res, next) => {
  const requestId = nanoid();
  const startedAt = Date.now();

  req.requestId = requestId;
  req.clientIp = resolveClientIp(req);
  req.userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
  const scoped = logger.withContext({
    requestId,
    method: req.method,
    path: req.originalUrl
  });

  req.log = scoped;

  if (!shouldSkipBodyLogging(req.path)) {
    scoped.info('Incoming request', {
      ip: req.ip,
      userId: req.user?.id,
      // avoid logging large payloads in production
      payload: !isProduction && req.body && Object.keys(req.body).length > 0 ? req.body : undefined
    });
  }

  res.on('finish', () => {
    scoped.info('Request completed', {
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      userId: req.user?.id
    });

    if (!shouldSkipAudit(req.path)) {
      void auditService.logRequest({
        userId: req.user?.id,
        ipAddress: req.clientIp,
        userAgent: req.userAgent,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        metadata: { requestId }
      });
    }
  });

  next();
};
