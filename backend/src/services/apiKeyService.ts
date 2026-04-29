import { Prisma } from '@prisma/client';

import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { usageService } from './usageService';

const MAX_FAIL_COUNT = 3;
const MAX_KEYS_PER_PROVIDER = 10;

type Provider = 'GEMINI' | 'IMAGEN';

type ApiKeyRecord = {
  id: string;
  provider: Provider;
  key: string;
};

const normalizeProvider = (provider: string): Provider => {
  if (provider.toUpperCase() === 'IMAGEN') return 'IMAGEN';
  return 'GEMINI';
};

const getOrderedKeys = async (provider: Provider) =>
  prisma.apiKey.findMany({
    where: {
      provider,
      isActive: true
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    take: MAX_KEYS_PER_PROVIDER
  });

export const apiKeyService = {
  ensureKey: async (provider: Provider, key: string) => {
    const normalized = normalizeProvider(provider);
    const existing = await prisma.apiKey.findFirst({
      where: {
        provider: normalized,
        key
      }
    });

    if (existing) {
      if (!existing.isActive) {
        await prisma.apiKey.update({
          where: { id: existing.id },
          data: { isActive: true, failCount: 0 }
        });
      }
      return existing;
    }

    const count = await prisma.apiKey.count({ where: { provider: normalized } });
    if (count >= MAX_KEYS_PER_PROVIDER) {
      logger.warn('Api key limit reached, cannot insert new key', { provider });
      return null;
    }

    return prisma.apiKey.create({
      data: {
        provider: normalized,
        key,
        priority: count,
        isActive: true
      }
    });
  },
  listKeys: async (provider?: Provider) => {
    if (provider) {
      return prisma.apiKey.findMany({ where: { provider } });
    }
    return prisma.apiKey.findMany();
  },
  addKey: async (provider: Provider, key: string, priority?: number) => {
    const normalized = normalizeProvider(provider);
    const count = await prisma.apiKey.count({ where: { provider: normalized } });
    if (count >= MAX_KEYS_PER_PROVIDER) {
      throw new Error('Maksimum anahtar sayısına ulaşıldı.');
    }

    const exists = await prisma.apiKey.findFirst({ where: { provider: normalized, key } });
    if (exists) {
      throw new Error('Bu anahtar zaten kayıtlı.');
    }

    const data: Prisma.ApiKeyCreateInput = {
      provider: normalized,
      key,
      priority: priority ?? count,
      isActive: true
    };

    return prisma.apiKey.create({ data });
  },
  deactivateKey: async (id: string) => {
    await prisma.apiKey.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
  },
  updatePriority: async (id: string, priority: number) => {
    await prisma.apiKey.update({
      where: { id },
      data: {
        priority,
        updatedAt: new Date()
      }
    });
  },
  markSuccess: async (id: string) => {
    await prisma.apiKey.update({
      where: { id },
      data: {
        failCount: 0,
        lastUsedAt: new Date(),
        updatedAt: new Date()
      }
    });
  },
  markFailure: async (id: string, reason: string) => {
    const updated = await prisma.apiKey.update({
      where: { id },
      data: {
        failCount: { increment: 1 },
        updatedAt: new Date()
      }
    });

    await usageService.log('API_KEY_ROTATION', { id, reason, failCount: updated.failCount });

    if ((updated.failCount ?? 0) >= MAX_FAIL_COUNT) {
      await prisma.apiKey.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });
      logger.warn('API anahtarı devre dışı bırakıldı (çok fazla hata)', { id });
    }
  },
  useKey: async <T>(provider: Provider, executor: (record: ApiKeyRecord) => Promise<T>): Promise<T> => {
    const normalized = normalizeProvider(provider);
    const keys = await getOrderedKeys(normalized);

    if (keys.length === 0) {
      throw new Error(`Aktif ${normalized} API anahtarı bulunamadı.`);
    }

    let lastError: unknown;
    for (const key of keys) {
      try {
        const result = await executor({ id: key.id, provider: normalized, key: key.key });
        await apiKeyService.markSuccess(key.id);
        return result;
      } catch (error) {
        lastError = error;
        const reason = error instanceof Error ? error.message : 'Bilinmeyen';
        await apiKeyService.markFailure(key.id, reason);
        logger.warn('API anahtarı başarısız oldu, yedek anahtar deneniyor', {
          provider: normalized,
          keyId: key.id,
          reason
        });
      }
    }

    throw lastError ?? new Error('API anahtarları başarısız oldu.');
  }
};
