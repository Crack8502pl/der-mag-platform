// src/file-generator/index.ts
// Main exports for file generator module

import * as ExcelService from './excel.service';
import * as WordService from './word.service';
import * as PdfService from './pdf.service';
import * as WebDAVServer from './webdav.server';

export {
  ExcelService,
  WordService,
  PdfService,
  WebDAVServer,
};

// Re-export individual functions for convenience
export const {
  generateFromTemplate: generateExcelFromTemplate,
  editExistingFile: editExcelFile,
  saveToFile: saveExcelToFile,
  createSimpleTemplate: createExcelTemplate,
} = ExcelService;

export const {
  generateFromTemplate: generateWordFromTemplate,
  saveToFile: saveWordToFile,
} = WordService;

export const {
  fillFormFields: fillPdfFormFields,
  addTextToPage: addTextToPdfPage,
  saveToFile: savePdfToFile,
  createSimpleFormTemplate: createPdfFormTemplate,
} = PdfService;

export const {
  startServer: startWebDAVServer,
  stopServer: stopWebDAVServer,
  isRunning: isWebDAVServerRunning,
} = WebDAVServer;
