// src/middleware/upload.ts
// Middleware obsługi uploadów plików

import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { VALIDATION_LIMITS, DOCUMENT_LIMITS } from '../config/constants';

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

// Konfiguracja storage dla dokumentów
const documentStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    cb(null, path.join(uploadDir, 'documents'));
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `document-${uniqueSuffix}${ext}`);
  }
});

// Filtr dla dokumentów (PDF, DOCX, XLSX, TXT)
const documentFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = DOCUMENT_LIMITS.ALLOWED_DOCUMENT_TYPES;
  
  if (allowedTypes.includes(file.mimetype as any)) {
    cb(null, true);
  } else {
    cb(new Error('Nieobsługiwany typ dokumentu. Dozwolone: PDF, DOCX, XLSX, TXT'));
  }
};

// Middleware dla uploadowania dokumentów
export const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFilter,
  limits: {
    fileSize: DOCUMENT_LIMITS.MAX_DOCUMENT_SIZE
  }
});

// Konfiguracja storage dla szablonów dokumentów
const templateStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    cb(null, path.join(uploadDir, 'templates'));
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `template-${uniqueSuffix}${ext}`);
  }
});

// Filtr dla szablonów (DOCX, XLSX, PDF)
const templateFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = DOCUMENT_LIMITS.ALLOWED_TEMPLATE_TYPES;
  
  if (allowedTypes.includes(file.mimetype as any)) {
    cb(null, true);
  } else {
    cb(new Error('Nieobsługiwany typ szablonu. Dozwolone: DOCX, XLSX, PDF'));
  }
};

// Middleware dla uploadowania szablonów
export const uploadTemplate = multer({
  storage: templateStorage,
  fileFilter: templateFilter,
  limits: {
    fileSize: DOCUMENT_LIMITS.MAX_TEMPLATE_SIZE
  }
});

// Konfiguracja in-memory storage dla plików CSV
const memoryStorage = multer.memoryStorage();

// Filtr dla plików CSV
const csvFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === DOCUMENT_LIMITS.ALLOWED_CSV_TYPE || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Nieobsługiwany typ pliku. Dozwolone: CSV'));
  }
};

// Middleware dla uploadowania plików CSV (in memory)
export const uploadCSV = multer({
  storage: memoryStorage,
  fileFilter: csvFilter,
  limits: {
    fileSize: DOCUMENT_LIMITS.MAX_CSV_SIZE
  }
});
