import http from 'node:http';

import app from './app';
import { bootstrapAdmin } from './config/bootstrap';
import { env } from './config/env';
import { logger } from './utils/logger';

const server = http.createServer(app);

server.listen(env.port, () => {
  logger.info(`Kundiva backend listening on port ${env.port}`);
});

void bootstrapAdmin().catch((error) => {
  logger.error('Admin kullanıcısı oluşturulurken hata oluştu', { error });
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down.');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down.');
  server.close(() => process.exit(0));
});
