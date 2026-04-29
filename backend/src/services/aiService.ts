import type { Part } from '@google/generative-ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AnswerSource, SolverType } from '@kundiva/shared';

import { buildSystemInstruction,getGeminiFileConfig } from '../config/gemini';
import { logger } from '../utils/logger';
import { apiKeyService } from './apiKeyService';
import { settingsService } from './settingsService';
import { type UsageEventType,usageService } from './usageService';

export type AIAnswerPayload = {
  title: string;
  questionText: string;
  metadata: {
    course: string;
    subjectArea: string;
    subjectName: string;
    educationLevel: string;
    solverType: SolverType;
    followUpContext?: string;
  };
  image?: {
    base64: string;
    mimeType: string;
  };
};

type GeminiJson = Record<string, unknown>;

type ParsedAiAnswer = {
  summary?: string;
  analysis?: Array<{ step: number; explanation: string }>;
  final_answer?: string;
  next_steps?: string[];
};

const parseJson = (value: string): GeminiJson => {
  const trimmed = value.trim().replace(/^```json/i, '').replace(/```$/i, '').trim();
  return JSON.parse(trimmed) as GeminiJson;
};

const toPrompt = (payload: AIAnswerPayload): Part[] => {
  const { metadata, questionText, title, image } = payload;
  const promptPieces: Part[] = [
    {
      text: [
        'Kundiva platformunda bir soruyu yanıtlarken şu bağlamı dikkate al:',
        `Başlık: ${title}`,
        `Eğitim Düzeyi: ${metadata.educationLevel}`,
        `Ders: ${metadata.course}`,
        `Alan: ${metadata.subjectArea}`,
        `Konu: ${metadata.subjectName}`,
        metadata.followUpContext ? `Önceki konuşma:
${metadata.followUpContext}` : '',
        'Öğrencinin sorusu aşağıdadır:',
        questionText
      ]
        .filter(Boolean)
        .join('\n')
    }
  ];

  if (image) {
    promptPieces.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.base64
      }
    });
  }

  return promptPieces;
};

const executeWithModel = async (
  modelName: string,
  systemInstruction: string,
  parts: Part[],
  usage?: { type: UsageEventType; context?: Record<string, unknown> }
) => {
  const result = await apiKeyService.useKey('GEMINI', async ({ key, id }) => {
    const client = new GoogleGenerativeAI(key);
    const model = client.getGenerativeModel({
      model: modelName,
      systemInstruction: buildSystemInstruction(systemInstruction)
    });

    const response = await model.generateContent(parts);
    const text = response.response.text();
    if (!text) {
      throw new Error('Gemini yanıtı boş döndü.');
    }

    await usageService.log(usage?.type ?? 'AI_ANSWER', {
      ...(usage?.context ?? {}),
      model: modelName,
      apiKeyId: id
    });
    return text;
  });

  return result;
};

export const aiService = {
  generateStructuredAnswer: async (payload: AIAnswerPayload): Promise<{
    source: AnswerSource;
    content: GeminiJson;
    raw: string;
  }> => {
    const config = getGeminiFileConfig();
    const systemInstruction = (await settingsService.get('SYSTEM_PROMPT')) ?? config.answerInstruction ?? '';
    const modelName = (await settingsService.get('ACTIVE_AI_MODEL')) ?? config.model ?? 'gemini-2.5-flash';

    const parts = toPrompt(payload);
    const raw = await executeWithModel(modelName, systemInstruction, parts, {
      type: 'AI_ANSWER',
      context: {
        solverType: payload.metadata.solverType,
        hasImage: Boolean(payload.image)
      }
    });
    let content: GeminiJson;
    try {
      content = parseJson(raw);
    } catch {
      // Gemini bazen düz metin döndürür, JSON parse edemiyorsak ham metni sarmalayarak kaydet
      content = { summary: raw, analysis: [], final_answer: raw, next_steps: [] };
    }

    return {
      source: 'AI' as AnswerSource,
      content,
      raw
    };
  },
  evaluateEthics: async (answer: string): Promise<{ ethical: boolean; reason?: string }> => {
    const config = getGeminiFileConfig();
    const instruction = config.ethicsInstruction ?? 'Yanıtı etik yönden değerlendir.';
    try {
      const modelName =
        (await settingsService.get('ACTIVE_ETHICS_MODEL')) ?? 'gemini-flash-lite-latest';

      const raw = await executeWithModel(
        modelName,
        instruction,
        [
          {
            text: `Aşağıdaki yanıtı etik kurallara göre değerlendir ve sadece JSON dön:\n${answer}`
          }
        ],
        {
          type: 'AI_ETHICS'
        }
      );
      const parsed = parseJson(raw);
      return {
        ethical: Boolean(parsed.ethical),
        reason: typeof parsed.reason === 'string' ? parsed.reason : undefined
      };
    } catch (error) {
      logger.error('Etik değerlendirme başarısız', { error });
      return {
        ethical: false,
        reason: 'Etik değerlendirme yapılamadı.'
      };
    }
  },
  generateTitle: async (questionText: string, subjectName: string): Promise<string> => {
    try {
      const modelName = (await settingsService.get('ACTIVE_AI_MODEL')) ?? 'gemini-2.5-flash';
      const raw = await executeWithModel(
        modelName,
        'Kısa ve açıklayıcı bir soru başlığı üret. Sadece JSON: {"title":"..."} döndür.',
        [
          {
            text: `Konu: ${subjectName}\nSoru:\n${questionText}`
          }
        ],
        {
          type: 'AI_ANSWER',
          context: {
            purpose: 'title'
          }
        }
      );
      const parsed = parseJson(raw);
      const title = parsed.title;
      return typeof title === 'string' && title.length > 0 ? title : subjectName;
    } catch (error) {
      logger.warn('Başlık üretiminde hata, konu adı kullanılacak', { error });
      return subjectName;
    }
  },
  generatePracticeQuestion: async (payload: {
    title: string;
    questionText: string;
    aiAnswer?: string;
  }): Promise<{
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }> => {
    const config = getGeminiFileConfig();
    const modelName = (await settingsService.get('ACTIVE_PRACTICE_MODEL')) ??
      config.model ??
      'gemini-2.5-flash';

    const context: string[] = [
      `Özgün soru başlığı: ${payload.title}`,
      `Özgün soru metni: ${payload.questionText}`
    ];

    if (payload.aiAnswer) {
      try {
        const trimmed = payload.aiAnswer.replace(/```json|```/gi, '').trim();
        const parsed = JSON.parse(trimmed) as ParsedAiAnswer;
        const summaryParts = [parsed.summary, parsed.final_answer]
          .filter((part): part is string => Boolean(part && part.trim()))
          .join('\n');
        const steps = parsed.analysis?.map((step) => `Adım ${step.step}: ${step.explanation}`).join('\n');
        const merged = [summaryParts, steps].filter(Boolean).join('\n');
        if (merged.length) {
          context.push(`Özet çözüm:\n${merged}`);
        }
      } catch (error) {
        logger.warn('Practice question için çözüm özeti ayrıştırılamadı', { error });
      }
    }

    const raw = await executeWithModel(
      modelName,
      'Öğrenci için çoktan seçmeli tek doğru cevaplı yeni bir tekrar sorusu üret. Yanıtı sadece JSON dön.',
      [
        {
          text: `${context.join('\n\n')}\nYukarıdaki bilgilere göre yeni bir soru üret.`
        }
      ],
      {
        type: 'AI_PRACTICE'
      }
    );

    const parsed = parseJson(raw);
    const promptText = String(parsed.prompt ?? '').trim();
    const options = Array.isArray(parsed.options) ? parsed.options.map((opt) => String(opt)) : [];
    const correctIndex = Number(parsed.correctIndex ?? 0);
    const explanation = String(parsed.explanation ?? '').trim();

    if (!promptText || options.length === 0) {
      throw new Error('Benzer soru formatı geçersiz.');
    }

    return {
      prompt: promptText,
      options,
      correctIndex: Number.isFinite(correctIndex) ? correctIndex : 0,
      explanation
    };
  },
  generateSupportResponse: async (conversation: string, priority?: 'normal' | 'rate-limit') => {
    const config = getGeminiFileConfig();
    const modelName = (await settingsService.get('ACTIVE_SUPPORT_MODEL')) ?? 'gemini-flash-lite-latest';
    const instruction =
      (await settingsService.get('SUPPORT_PROMPT')) ?? config.supportInstruction ?? 'Türkçe destek botu gibi davran.';
    const systemInstruction = `${instruction}
Öncelik: ${priority ?? 'normal'}
Her yanıtta çözüm adımlarını numaralandır, gizlilik ve güvenlik uyarılarını gerektiğinde hatırlat.`;

    const raw = await executeWithModel(
      modelName,
      systemInstruction,
      [
        {
          text: `Kullanıcı ile yapılan konuşma:
${conversation}

Yeni cevabın:`
        }
      ],
      {
        type: 'AI_SUPPORT',
        context: {
          priority: priority ?? 'normal'
        }
      }
    );

    return raw;
  },
  moderateContent: async (content: string): Promise<{
    allowed: boolean;
    reason?: string;
    severity?: string;
  }> => {
    const trimmed = content.trim();
    if (!trimmed) {
      return {
        allowed: false,
        reason: 'İçerik boş olamaz.'
      };
    }

    try {
      const modelName =
        (await settingsService.get('ACTIVE_MODERATION_MODEL')) ??
        (await settingsService.get('ACTIVE_SUPPORT_MODEL')) ??
        'gemini-flash-lite-latest';

      const raw = await executeWithModel(
        modelName,
        'Kundiva platformunda yorum moderasyonu yap. SADECE şu JSON formatında yanıt ver: {"allowed":true|false,"reason":"kısa açıklama","severity":"low|medium|high"}. Kullanıcıya karşı saygılı ol.',
        [
          {
            text: `Değerlendirilecek yorum:\n${trimmed}`
          }
        ],
        {
          type: 'AI_MODERATION'
        }
      );

      const parsed = parseJson(raw);
      const allowed = parsed.allowed !== false;
      const reason = typeof parsed.reason === 'string' ? parsed.reason : undefined;
      const severity = typeof parsed.severity === 'string' ? parsed.severity : undefined;

      return {
        allowed,
        reason,
        severity
      };
    } catch (error) {
      logger.warn('Yorum moderasyonu gerçekleştirilemedi', { error });
      return {
        allowed: false,
        reason: 'Yorum moderasyonu şu anda gerçekleştirilemedi. Lütfen tekrar deneyin.'
      };
    }
  }
};
