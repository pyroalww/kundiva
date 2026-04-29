import bcrypt from 'bcrypt';

import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

const ADMIN_USERNAME = 'halilyagizduzen1';
const ADMIN_EMAIL = 'halilyagizduzen1@kundiva.com';
const ADMIN_PASSWORD = 'halityagizduzen';

const deriveBaseUsername = (email: string) => {
  const identifier = email.split('@')[0] ?? 'kundiva';
  const cleaned = identifier.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return cleaned.length > 2 ? cleaned : `kundiva${Date.now()}`;
};

const generateUniqueUsername = async (baseEmail: string) => {
  const base = deriveBaseUsername(baseEmail);
  let candidate = base;
  let attempt = 1;

  while (true) {
    const exists = await prisma.user.findUnique({ where: { username: candidate } });
    if (!exists) return candidate;
    candidate = `${base}${attempt}`;
    attempt += 1;
  }
};

const backfillUsernames = async () => {
  const users = await prisma.user.findMany({
    where: { username: null },
    select: { id: true, email: true }
  });

  for (const user of users) {
    if (!user.email) {
      // Skip users without email (should not happen)
      continue;
    }
    const username = await generateUniqueUsername(user.email);
    await prisma.user.update({
      where: { id: user.id },
      data: { username }
    });
  }
};

export const bootstrapAdmin = async () => {
  await backfillUsernames();

  const existing = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME } });
  if (existing) {
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'ADMIN' }
      });
      logger.info('Var olan admin kullanıcının rolü güncellendi.');
    }
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      passwordHash,
      firstName: 'Halil Yağız',
      lastName: 'Düzen',
      role: 'ADMIN'
    }
  });

  logger.info('Admin kullanıcısı oluşturuldu.');
};
