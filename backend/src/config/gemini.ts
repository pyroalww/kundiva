import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

type GeminiFileConfig = {
  apiKey?: string;
  model?: string;
  answerInstruction?: string;
  ethicsInstruction?: string;
  supportInstruction?: string;
  imagenApiKey?: string;
  imagenInstruction?: string;
};

const CONFIG_FILENAME = 'gemini.json';
const CONFIG_FALLBACK = 'gemini.example.json';

let cachedConfig: GeminiFileConfig | null = null;

const readConfigFile = (filePath: string): GeminiFileConfig | null => {
  if (!existsSync(filePath)) {
    return null;
  }
  const raw = readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(raw) as GeminiFileConfig;
  } catch (error) {
    throw new Error(`Geçersiz Gemini yapılandırması: ${filePath}`);
  }
};

export const getGeminiFileConfig = (): GeminiFileConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configDir = path.resolve(__dirname, '../../config');
  const primaryPath = path.join(configDir, CONFIG_FILENAME);
  const fallbackPath = path.join(configDir, CONFIG_FALLBACK);

  const primary = readConfigFile(primaryPath) ?? {};
  const fallback = readConfigFile(fallbackPath) ?? {};

  cachedConfig = {
    apiKey: (primary.apiKey ?? process.env.GEMINI_API_KEY ?? fallback.apiKey)?.trim(),
    imagenApiKey: (primary.imagenApiKey ?? process.env.IMAGEN_API_KEY ?? fallback.imagenApiKey)?.trim(),
    model: primary.model ?? fallback.model ?? 'gemini-2.5-flash',
    answerInstruction:
      primary.answerInstruction ??
      fallback.answerInstruction ??
      'Kundiva platformunda deneyimli bir öğretmen gibi davran. Çözümünü Türkçe ve adım adım açıkla.',
    ethicsInstruction:
      primary.ethicsInstruction ??
      fallback.ethicsInstruction ??
      'Yanıtı etik kurallara göre değerlendir ve sadece {"ethical":true|false,"reason":"..."} döndür.',
    supportInstruction:
      primary.supportInstruction ??
      fallback.supportInstruction ??
      'Kundiva canlı destek botusun. Kibar, empatik, güvenlik odaklı ve Türkçe cevap ver.',
    imagenInstruction:
      primary.imagenInstruction ??
      fallback.imagenInstruction ??
      'Kundiva eğitim materyalleri üretimi için yüksek çözünürlüklü açıklayıcı görseller oluştur.'
  };

  return cachedConfig;
};

export const buildSystemInstruction = (text: string) => ({
  role: 'system' as const,
  parts: [{ text }]
});
