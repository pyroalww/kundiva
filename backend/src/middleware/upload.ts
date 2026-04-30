import path from 'node:path';
import fs from 'node:fs';

import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import sharp from 'sharp';

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Use memory storage so sharp can process the buffer before writing
const memoryStorage = multer.memoryStorage();

const imageFileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Sadece görsel yükleyebilirsiniz.'));
  }
  cb(null, true);
};

const mediaFileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    return cb(null, true);
  }
  return cb(new Error('Yalnızca görüntü veya video dosyaları yükleyebilirsiniz.'));
};

/**
 * Middleware that optimizes uploaded images:
 * - Resizes to max 800px width (preserving aspect ratio)
 * - Converts to WebP at 80% quality
 * - Writes to uploads/ and patches req.file / req.files
 */
export const optimizeImages = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const files: Express.Multer.File[] = [];
    if (req.file) files.push(req.file);
    if (req.files && Array.isArray(req.files)) files.push(...req.files);

    for (const file of files) {
      if (!file.mimetype.startsWith('image/') || !file.buffer) continue;

      const timestamp = Date.now();
      const baseName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_').replace(/\.[^.]+$/, '');
      const outputName = `${timestamp}-${baseName}.webp`;
      const outputPath = path.join(UPLOADS_DIR, outputName);

      await sharp(file.buffer)
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(outputPath);

      const stats = fs.statSync(outputPath);

      // Patch file object for downstream handlers
      file.filename = outputName;
      file.path = outputPath;
      file.mimetype = 'image/webp';
      file.size = stats.size;
      file.destination = UPLOADS_DIR;
    }

    // Handle video files that came through memoryStorage — write them as-is
    for (const file of files) {
      if (file.mimetype.startsWith('video/') && file.buffer && !file.path) {
        const timestamp = Date.now();
        const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const outputName = `${timestamp}-${sanitized}`;
        const outputPath = path.join(UPLOADS_DIR, outputName);
        fs.writeFileSync(outputPath, file.buffer);
        file.filename = outputName;
        file.path = outputPath;
        file.destination = UPLOADS_DIR;
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

export const questionUpload = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

export const attachmentUpload = multer({
  storage: memoryStorage,
  fileFilter: mediaFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});
