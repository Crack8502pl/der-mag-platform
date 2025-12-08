// src/file-generator/config.ts
// Configuration for file generator services

import path from 'path';

/**
 * File Generator Configuration
 */
export const FileGeneratorConfig = {
  /**
   * Directory containing template files
   */
  templatesDir: path.join(__dirname, '../templates'),

  /**
   * Directory for generated files
   */
  generatedDir: path.join(__dirname, '../generated'),

  /**
   * WebDAV server configuration
   */
  webdav: {
    port: parseInt(process.env.WEBDAV_PORT || '1900'),
    requireAuth: process.env.WEBDAV_REQUIRE_AUTH === 'true',
    hostname: process.env.WEBDAV_HOSTNAME || 'localhost',
  },

  /**
   * Template file names
   */
  templates: {
    excel: 'report-template.xlsx',
    word: 'document-template.docx',
    pdf: 'form-template.pdf',
  },

  /**
   * File generation settings
   */
  settings: {
    /**
     * Maximum file size in bytes (default: 50MB)
     */
    maxFileSize: parseInt(process.env.FILE_GEN_MAX_SIZE || String(50 * 1024 * 1024)),

    /**
     * Enable compression for generated files
     */
    enableCompression: process.env.FILE_GEN_COMPRESSION === 'true',

    /**
     * Automatically clean old generated files
     */
    autoCleanup: {
      enabled: process.env.FILE_GEN_AUTO_CLEANUP === 'true',
      maxAgeHours: parseInt(process.env.FILE_GEN_MAX_AGE_HOURS || '24'),
    },
  },
};

/**
 * Get full path to a template file
 * @param templateName - Name of the template (excel, word, or pdf)
 */
export function getTemplatePath(templateName: 'excel' | 'word' | 'pdf'): string {
  return path.join(
    FileGeneratorConfig.templatesDir,
    FileGeneratorConfig.templates[templateName]
  );
}

/**
 * Get full path for a generated file
 * @param filename - Name of the file to generate
 */
export function getGeneratedFilePath(filename: string): string {
  return path.join(FileGeneratorConfig.generatedDir, filename);
}

/**
 * Generate a unique filename with timestamp
 * @param base - Base name for the file
 * @param extension - File extension (with or without dot)
 */
export function generateUniqueFilename(base: string, extension: string): string {
  const timestamp = Date.now();
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  return `${base}-${timestamp}${ext}`;
}

/**
 * Validate file extension
 * @param filename - Name of the file
 * @param allowedExtensions - Array of allowed extensions
 */
export function validateFileExtension(
  filename: string,
  allowedExtensions: string[]
): boolean {
  const ext = path.extname(filename).toLowerCase();
  return allowedExtensions.some(allowed => 
    ext === (allowed.startsWith('.') ? allowed : `.${allowed}`)
  );
}
