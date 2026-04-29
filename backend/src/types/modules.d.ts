declare module '@google/genai' {
  type GenerateImagesResponse = {
    generatedImages?: Array<{
      image?: {
        imageBytes?: string;
      };
    }>;
  };

  export class GoogleGenAI {
    constructor(options: { apiKey: string });
    models: {
      generateImages: (options: {
        model: string;
        prompt: string;
        config?: {
          numberOfImages?: number;
        };
      }) => Promise<GenerateImagesResponse>;
    };
  }
}

declare module 'p-queue' {
  type PQueueOptions = {
    concurrency?: number;
    interval?: number;
    intervalCap?: number;
    timeout?: number;
    throwOnTimeout?: boolean;
  };

  class PQueue {
    constructor(options?: PQueueOptions);
    readonly size: number;
    readonly pending: number;
    add<T>(task: () => Promise<T>): Promise<T>;
  }

  export default PQueue;
}

declare module 'ffmpeg-static' {
  const path: string | null;
  export default path;
}

declare module 'fluent-ffmpeg';

declare module 'sharp';
