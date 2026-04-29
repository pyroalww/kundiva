import { config } from 'dotenv';

config();

const required = (value: string | undefined, key: string): string => {
  if (!value || value.trim().length === 0) {
    throw new Error(`${key} ortam değişkeni tanımlanmalı. Lütfen .env dosyanızı kontrol edin.`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required(process.env.JWT_SECRET, 'JWT_SECRET'),
  databaseUrl: required(process.env.DATABASE_URL, 'DATABASE_URL')
};

export const isProduction = env.nodeEnv === 'production';
