import path from 'node:path';

import type { Request } from 'express';
import multer from 'multer';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(__dirname, '../../uploads'));
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${timestamp}-${sanitized}`);
  }
});

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

export const questionUpload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

export const attachmentUpload = multer({
  storage,
  fileFilter: mediaFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});
