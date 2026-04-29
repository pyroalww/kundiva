import fs from 'node:fs';
import path from 'node:path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;

const LOG_FILE = path.resolve(process.cwd(), 'logs', 'backend.log');
const BASE_CONTEXT = {
  service: 'kundiva-backend',
  pid: process.pid
};

const ensureLogDir = () => {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const sanitize = (value: unknown): unknown => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }

  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
      (acc, [key, entry]) => {
        acc[key] = sanitize(entry);
        return acc;
      },
      {}
    );
  }

  return value;
};

const writeToFile = (payload: string) => {
  try {
    ensureLogDir();
    fs.appendFileSync(LOG_FILE, `${payload}\n`, { encoding: 'utf8' });
  } catch (error) {
    console.error('[LOGGER] Failed to write log file', error);
  }
};

const shouldEmitDebug = () => process.env.DEBUG?.toLowerCase() === 'true';

const emit = (level: LogLevel, text: string) => {
  switch (level) {
    case 'error':
      console.error(text);
      break;
    case 'warn':
      console.warn(text);
      break;
    case 'debug':
      if (shouldEmitDebug()) {
        console.debug(text);
      }
      break;
    default:
      console.log(text);
  }
};

const log = ({
  level,
  message,
  context,
  meta
}: {
  level: LogLevel;
  message: string;
  context?: LogContext;
  meta?: Record<string, unknown>;
}) => {
  const timestamp = new Date().toISOString();
  const payload = {
    ...BASE_CONTEXT,
    ...context,
    timestamp,
    level: level.toUpperCase(),
    message,
    meta: meta ? sanitize(meta) : undefined
  };

  const serialized = JSON.stringify(payload);
  emit(level, serialized);
  writeToFile(serialized);
};

const buildLogger = (context?: LogContext) => ({
  debug: (message: string, meta?: Record<string, unknown>) => log({ level: 'debug', message, context, meta }),
  info: (message: string, meta?: Record<string, unknown>) => log({ level: 'info', message, context, meta }),
  warn: (message: string, meta?: Record<string, unknown>) => log({ level: 'warn', message, context, meta }),
  error: (message: string, meta?: Record<string, unknown>) => log({ level: 'error', message, context, meta }),
  withContext: (additional: LogContext) => buildLogger({ ...context, ...additional })
});

export type ScopedLogger = ReturnType<typeof buildLogger>;

export const logger = buildLogger();
