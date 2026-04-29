import fs from 'node:fs';
import path from 'node:path';

import { logger } from '../utils/logger';

type FFmpegModule = typeof import('fluent-ffmpeg');
type SharpModule = typeof import('sharp');

let ffmpeg: FFmpegModule | null = null;
let ffmpegStaticPath: string | null = null;
let sharpInstance: SharpModule | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  ffmpeg = require('fluent-ffmpeg');
} catch (error) {
  logger.warn('fluent-ffmpeg modülü yüklenemedi, video işlemleri devre dışı', { error });
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  ffmpegStaticPath = require('ffmpeg-static') as string;
} catch (error) {
  logger.warn('ffmpeg-static modülü bulunamadı, yerel FFmpeg varsayılacak', { error });
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  sharpInstance = require('sharp');
} catch (error) {
  logger.warn('sharp modülü yüklenemedi, görsel optimizasyonu atlanacak', { error });
}

if (ffmpeg && ffmpegStaticPath) {
  ffmpeg.setFfmpegPath(ffmpegStaticPath);
}

const MAX_IMAGE_WIDTH = 1600;
const MAX_IMAGE_HEIGHT = 1600;
const IMAGE_SIZE_COMPRESS_THRESHOLD = 2 * 1024 * 1024; // 2MB
const MAX_ATTACHMENT_SIZE = 100 * 1024 * 1024; // 100MB
const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');

const isImage = (mime: string) => mime.startsWith('image/');
const isVideo = (mime: string) => mime.startsWith('video/');

const ensureWithinLimit = (filePath: string, maxSize: number) => {
  const stats = fs.statSync(filePath);
  if (stats.size > maxSize) {
    throw new Error('Yüklenen dosya izin verilen boyuttan büyük.');
  }
  return stats.size;
};

const optimizeImage = async (filePath: string) => {
  if (!sharpInstance) {
    logger.warn('sharp bulunamadı, görsel optimizasyonu atlanıyor.');
    return fs.statSync(filePath).size;
  }

  const stats = fs.statSync(filePath);
  if (stats.size < IMAGE_SIZE_COMPRESS_THRESHOLD) {
    return stats.size;
  }

  const optimizedPath = `${filePath}.webp`;
  await sharpInstance(filePath)
    .resize({ width: MAX_IMAGE_WIDTH, height: MAX_IMAGE_HEIGHT, fit: 'inside' })
    .webp({ quality: 85 })
    .toFile(optimizedPath);

  fs.unlinkSync(filePath);
  fs.renameSync(optimizedPath, filePath);
  return fs.statSync(filePath).size;
};

const optimizeVideo = async (filePath: string) => {
  if (!ffmpeg || !ffmpegStaticPath) {
    logger.warn('fluent-ffmpeg bulunamadı, video sıkıştırması atlandı.');
    return fs.statSync(filePath).size;
  }

  const tempOutput = `${filePath}-compressed.mp4`;
  await new Promise<void>((resolve, reject) => {
    ffmpeg(filePath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .size('?x720')
      .outputOptions(['-preset veryfast', '-movflags +faststart'])
      .on('end', resolve)
      .on('error', (error: unknown) => {
        logger.warn('Video sıkıştırması başarısız, orijinal dosya kullanılacak', { error });
        reject(error);
      })
      .save(tempOutput);
  }).catch(() => undefined);

  if (fs.existsSync(tempOutput)) {
    fs.unlinkSync(filePath);
    fs.renameSync(tempOutput, filePath);
  }

  return fs.statSync(filePath).size;
};

export const mediaService = {
  async processQuestionImage(file: Express.Multer.File) {
    const fileSize = ensureWithinLimit(file.path, 20 * 1024 * 1024);
    const optimizedSize = await optimizeImage(file.path).catch(() => fileSize);
    return {
      storagePath: `/uploads/${path.basename(file.path)}`,
      type: 'IMAGE',
      mimeType: file.mimetype,
      fileSize: optimizedSize,
      durationMs: null
    };
  },
  async processAttachment(file: Express.Multer.File) {
    const absolutePath = path.resolve(file.path);
    const size = ensureWithinLimit(absolutePath, MAX_ATTACHMENT_SIZE);

    if (isImage(file.mimetype)) {
      const optimizedSize = await optimizeImage(absolutePath).catch(() => size);
      return {
        storagePath: `/uploads/${path.basename(file.path)}`,
        type: 'IMAGE',
        mimeType: file.mimetype,
        fileSize: optimizedSize,
        durationMs: null
      };
    }

    if (isVideo(file.mimetype)) {
      const optimizedSize = await optimizeVideo(absolutePath).catch(() => size);
      let durationMs: number | null = null;
      if (ffmpeg) {
        try {
          await new Promise<void>((resolve, reject) => {
            ffmpeg!(absolutePath).ffprobe((error: unknown, metadata: any) => {
              if (error) {
                return reject(error);
              }
              durationMs = metadata.format.duration ? Math.round(metadata.format.duration * 1000) : null;
              resolve();
            });
          });
        } catch (error) {
          logger.warn('Video süresi hesaplanamadı', { error });
        }
      }

      return {
        storagePath: `/uploads/${path.basename(file.path)}`,
        type: 'VIDEO',
        mimeType: file.mimetype,
        fileSize: optimizedSize,
        durationMs
      };
    }

    throw new Error('Desteklenmeyen dosya türü.');
  }
};
