import { NextFunction, Request, Response } from 'express';

import { logger } from '../utils/logger';

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err.name === 'ZodError') {
    const zodError = err as unknown as {
      issues: Array<{ path: (string | number)[]; message: string }>;
    };
    const details = zodError.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
    logger.warn('Doğrulama hatası', { issues: details });
    return res.status(400).json({
      message: 'Doğrulama hatası',
      issues: details
    });
  }

  const status = err instanceof ApiError ? err.statusCode : 500;
  const message = err.message || 'Beklenmeyen bir hata oluştu.';

  logger.error(message, { stack: err.stack });

  res.status(status).json({
    message,
    status
  });
};
