// src/services/TemplateService.ts
// Serwis zarządzania szablonami dokumentów

import { AppDataSource } from '../config/database';
import { DocumentTemplate } from '../entities/DocumentTemplate';
import { DocumentService } from './DocumentService';
import * as fs from 'fs';
import * as path from 'path';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { PDFDocument } from 'pdf-lib';
import ExcelJS from 'exceljs';

export class TemplateService {
  /**
   * Tworzy nowy szablon
   */
  static async createTemplate(data: {
    name: string;
    description?: string;
    type: string;
    filePath: string;
    placeholders?: Record<string, any>;
    taskTypeId?: number;
  }): Promise<DocumentTemplate> {
    const templateRepository = AppDataSource.getRepository(DocumentTemplate);
    
    const template = templateRepository.create(data);
    return await templateRepository.save(template);
  }

  /**
   * Pobiera listę szablonów
   */
  static async getTemplates(filters?: {
    taskTypeId?: number;
    type?: string;
    active?: boolean;
  }): Promise<DocumentTemplate[]> {
    const templateRepository = AppDataSource.getRepository(DocumentTemplate);
    
    const where: any = {};
    if (filters?.taskTypeId !== undefined) where.taskTypeId = filters.taskTypeId;
    if (filters?.type) where.type = filters.type;
    if (filters?.active !== undefined) where.active = filters.active;

    return await templateRepository.find({
      where,
      relations: ['taskType'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Pobiera pojedynczy szablon
   */
  static async getTemplate(idOrUuid: number | string): Promise<DocumentTemplate | null> {
    const templateRepository = AppDataSource.getRepository(DocumentTemplate);
    
    const where = typeof idOrUuid === 'number' 
      ? { id: idOrUuid } 
      : { uuid: idOrUuid };

    return await templateRepository.findOne({
      where,
      relations: ['taskType']
    });
  }

  /**
   * Generuje dokument z szablonu
   */
  static async generateDocument(
    templateId: number,
    data: Record<string, any>,
    documentName: string,
    taskId?: number,
    userId?: number
  ): Promise<any> {
    const template = await this.getTemplate(templateId);
    
    if (!template) {
      throw new Error('Szablon nie znaleziony');
    }

    if (!template.active) {
      throw new Error('Szablon jest nieaktywny');
    }

    let generatedFilePath: string;

    try {
      switch (template.type) {
        case 'word':
          generatedFilePath = await this.generateWordDocument(template, data, documentName);
          break;
        case 'excel':
          generatedFilePath = await this.generateExcelDocument(template, data, documentName);
          break;
        case 'pdf':
          generatedFilePath = await this.generatePdfDocument(template, data, documentName);
          break;
        default:
          throw new Error('Nieobsługiwany typ szablonu');
      }

      // Utwórz wpis w tabeli dokumentów
      const fileStats = fs.statSync(generatedFilePath);
      const document = await DocumentService.createDocument({
        name: documentName,
        taskId,
        category: 'other',
        filePath: generatedFilePath,
        fileSize: fileStats.size,
        mimeType: this.getMimeType(template.type),
        originalFilename: path.basename(generatedFilePath),
        createdById: userId,
        generatedFromTemplateId: template.id
      });

      return document;
    } catch (error) {
      console.error('Błąd generowania dokumentu:', error);
      throw new Error('Nie udało się wygenerować dokumentu: ' + (error as Error).message);
    }
  }

  /**
   * Generuje dokument Word z szablonu
   */
  private static async generateWordDocument(
    template: DocumentTemplate,
    data: Record<string, any>,
    documentName: string
  ): Promise<string> {
    const content = fs.readFileSync(template.filePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true
    });

    doc.setData(data);
    doc.render();

    const buffer = doc.getZip().generate({ type: 'nodebuffer' });
    
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const outputPath = path.join(uploadDir, 'documents', `${Date.now()}-${documentName}.docx`);
    
    fs.writeFileSync(outputPath, buffer);
    return outputPath;
  }

  /**
   * Generuje dokument Excel z szablonu
   */
  private static async generateExcelDocument(
    template: DocumentTemplate,
    data: Record<string, any>,
    documentName: string
  ): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(template.filePath);

    // Zastąp placeholdery w komórkach
    workbook.eachSheet((worksheet) => {
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          if (cell.value && typeof cell.value === 'string') {
            let value = cell.value;
            Object.keys(data).forEach(key => {
              const placeholder = `{${key}}`;
              value = value.replace(new RegExp(placeholder, 'g'), data[key]);
            });
            cell.value = value;
          }
        });
      });
    });

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const outputPath = path.join(uploadDir, 'documents', `${Date.now()}-${documentName}.xlsx`);
    
    await workbook.xlsx.writeFile(outputPath);
    return outputPath;
  }

  /**
   * Generuje dokument PDF z szablonu (podstawowa implementacja)
   */
  private static async generatePdfDocument(
    template: DocumentTemplate,
    data: Record<string, any>,
    documentName: string
  ): Promise<string> {
    // Podstawowa implementacja - kopiowanie szablonu
    // W produkcji należy użyć biblioteki do wypełniania formularzy PDF
    const content = fs.readFileSync(template.filePath);
    
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const outputPath = path.join(uploadDir, 'documents', `${Date.now()}-${documentName}.pdf`);
    
    fs.writeFileSync(outputPath, content);
    return outputPath;
  }

  /**
   * Usuwa szablon
   */
  static async deleteTemplate(idOrUuid: number | string): Promise<boolean> {
    const templateRepository = AppDataSource.getRepository(DocumentTemplate);
    
    const template = await this.getTemplate(idOrUuid);
    
    if (!template) {
      return false;
    }

    // Usuń plik fizyczny
    try {
      if (fs.existsSync(template.filePath)) {
        fs.unlinkSync(template.filePath);
      }
    } catch (error) {
      console.error('Błąd usuwania pliku szablonu:', error);
    }

    await templateRepository.remove(template);
    return true;
  }

  /**
   * Pomocnicza metoda - zwraca MIME type dla typu szablonu
   */
  private static getMimeType(type: string): string {
    switch (type) {
      case 'word':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }
}
