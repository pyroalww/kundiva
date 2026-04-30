import { prisma } from '../utils/prisma';

const DEFAULT_SETTINGS: Record<string, string> = {
  SYSTEM_PROMPT:
    'Kundiva eğitim platformunun yapay zeka çözüm asistanısın. Yanıtların TÜRKÇE, saygılı, güvenli ve lise seviyesine uygun olmalı. Çözümü her zaman adım adım açıkla, önemli formülleri düz metin halinde belirt, gerektiğinde ek kaynak öner. Öğrenci mahremiyetini gözet, kişisel veri toplama. Şüpheli içeriklerde etik ekibine yönlendir.',
  SUPPORT_PROMPT:
    'Kundiva canlı destek botusun. Proje: Şeyh İsa Anadolu Lisesi / TÜBİTAK 4006. Yazılım ekibi: Çağan DOĞAN & Ömer BÜKE. Kullanıcılara Türkçe, empatik ve güvenlik odaklı cevap ver. Önce sorunu anla, sıradaki adımı açıkla, gizlilik ve rate-limit politikalarını hatırlat, ihtiyaç halinde gerçek destek ekibine yönlendir.',
  MAINTENANCE_MODE: 'OFF',
  ACTIVE_AI_MODEL: 'gemini-2.5-flash',
  ACTIVE_PRACTICE_MODEL: 'gemini-2.0-flash',
  ACTIVE_SUPPORT_MODEL: 'gemini-flash-lite-latest',
  ACTIVE_ETHICS_MODEL: 'gemini-2.0-flash-lite',
  ACTIVE_MODERATION_MODEL: 'gemini-flash-lite-latest',
  AUTO_PUBLISH_MODE: 'MANUAL',
  LIVE_SUPPORT_ENABLED: 'OFF'
};

export const settingsService = {
  get: async (key: string) => {
    const setting = await prisma.adminSetting.findUnique({ where: { key } });
    if (setting) {
      return setting.value;
    }
    return DEFAULT_SETTINGS[key];
  },
  getMany: async (keys?: string[]) => {
    const settings = await prisma.adminSetting.findMany({
      where: keys ? { key: { in: keys } } : undefined
    });

    const merged: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const setting of settings) {
      merged[setting.key] = setting.value;
    }

    if (keys) {
      return keys.reduce<Record<string, string>>((acc, key) => {
        acc[key] = merged[key];
        return acc;
      }, {});
    }

    return merged;
  },
  set: async (key: string, value: string) => {
    await prisma.adminSetting.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value }
    });
  }
};
