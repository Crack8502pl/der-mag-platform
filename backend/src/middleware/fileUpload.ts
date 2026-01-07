// src/middleware/fileUpload.ts
// Middleware dla uploadów dokumentów podsystemów

import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'subsystems', 'documentation');

// Upewnij się, że katalog istnieje
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use the subsystem ID temporarily; service will rename the directory
    const subsystemId = req.params.id || 'TEMP';
    const subsystemDir = path.join(UPLOAD_DIR, subsystemId);
    
    if (!fs.existsSync(subsystemDir)) {
      fs.mkdirSync(subsystemDir, { recursive: true });
    }
    
    cb(null, subsystemDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'application/zip'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Nieobsługiwany typ pliku'));
  }
};

export const uploadSubsystemDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});
