// src/middleware/upload.ts
// Middleware obsługi uploadów plików

import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { VALIDATION_LIMITS } from '../config/constants';

// Konfiguracja storage dla multer
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    cb(null, path.join(uploadDir, 'photos'));
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `photo-${uniqueSuffix}${ext}`);
  }
});

// Filtr plików - tylko obrazy
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = VALIDATION_LIMITS.ALLOWED_IMAGE_TYPES;
  
  if (allowedTypes.includes(file.mimetype as any)) {
    cb(null, true);
  } else {
    cb(new Error('Nieobsługiwany typ pliku. Dozwolone: JPEG, PNG'));
  }
};

// Konfiguracja multer
export const uploadPhoto = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: VALIDATION_LIMITS.MAX_FILE_SIZE
  }
});

// Middleware dla pojedynczego pliku
export const uploadSingle = uploadPhoto.single('photo');

// Middleware dla wielu plików
export const uploadMultiple = uploadPhoto.array('photos', 10);
