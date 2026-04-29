import { getGeminiFileConfig } from '../config/gemini';
import { logger } from '../utils/logger';
import { apiKeyService } from './apiKeyService';
import { usageService } from './usageService';

const DEFAULT_MODEL = 'imagen-4.0-generate-001';

type GoogleGenAIConstructor = typeof import('@google/genai').GoogleGenAI;

let GoogleGenAI: GoogleGenAIConstructor | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  GoogleGenAI = require('@google/genai').GoogleGenAI as GoogleGenAIConstructor;
} catch (error) {
  logger.warn('@google/genai modülü yüklenemedi, Imagen görsel üretimi devre dışı', { error });
}

type GeneratedImagen = {
  image?: {
    imageBytes?: string;
  };
};

const ensureImagenSupport = () => {
  if (!GoogleGenAI) {
    throw new Error('Imagen API modülü yüklü değil. Lütfen @google/genai paketini kurun.');
  }
};

const runWithImagenKey = async <T>(executor: (client: InstanceType<GoogleGenAIConstructor>, keyId?: string) => Promise<T>): Promise<T> => {
  ensureImagenSupport();
  const GenAI = GoogleGenAI as GoogleGenAIConstructor;

  try {
    return await apiKeyService.useKey('IMAGEN', async ({ key, id }) => {
      const client = new GenAI({ apiKey: key });
      const result = await executor(client, id);
      await usageService.log('IMAGEN_GENERATION', { apiKeyId: id });
      return result;
    });
  } catch (error) {
    const configKey = getGeminiFileConfig().imagenApiKey;
    if (!configKey) {
      throw error;
    }

    logger.warn('IMAGEN için kayıtlı anahtar bulunamadı, yapılandırmadaki anahtar kullanılacak');
    const fallbackClient = new GenAI({ apiKey: configKey });
    const result = await executor(fallbackClient, undefined);
    await usageService.log('IMAGEN_GENERATION', { source: 'config' });
    return result;
  }
};

export const imagenService = {
  generateImages: async (params: { prompt: string; count?: number; model?: string }) => {
    const prompt = params.prompt.trim();
    if (!prompt) {
      throw new Error('Görsel üretimi için bir istem sağlamalısınız.');
    }

    const model = params.model ?? DEFAULT_MODEL;
    const numberOfImages = Math.min(Math.max(params.count ?? 1, 1), 4);

    const result = await runWithImagenKey(async (client) => {
      const response = await client.models.generateImages({
        model,
        prompt,
        config: {
          numberOfImages
        }
      });

      const generatedImages = (response.generatedImages ?? []) as GeneratedImagen[];

      return generatedImages.map((generated, index) => {
        const bytes = generated.image?.imageBytes ?? '';
        return {
          index,
          mimeType: 'image/png',
          base64: bytes,
          sizeBytes: Buffer.from(bytes, 'base64').length
        };
      });
    });

    return {
      model,
      images: result
    };
  }
};
