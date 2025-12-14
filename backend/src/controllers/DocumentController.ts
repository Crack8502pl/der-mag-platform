// src/controllers/DocumentController.ts
// Kontroler zarządzania dokumentami

import { Request, Response } from 'express';
import { DocumentService } from '../services/DocumentService';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateDocumentDto, UpdateDocumentDto } from '../dto/DocumentDto';
import * as path from 'path';
import * as fs from 'fs';

export class DocumentController {
  /**
   * Upload dokumentu
   * POST /api/documents/upload
   */
  static async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Nie przesłano pliku' });
        return;
      }

      // Walidacja DTO
      const dto = plainToInstance(CreateDocumentDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        // Usuń przesłany plik jeśli walidacja nie powiodła się
        try {
          if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
          }
        } catch (fileError) {
          console.error('Błąd usuwania pliku:', fileError);
        }
        res.status(400).json({
          success: false,
          message: 'Błąd walidacji',
          errors: errors.map(e => Object.values(e.constraints || {})).flat()
        });
        return;
      }

      const userId = (req as any).user?.id;

      const document = await DocumentService.createDocument({
        name: dto.name,
        description: dto.description,
        taskId: dto.taskId,
        category: dto.category,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        originalFilename: req.file.originalname,
        createdById: userId
      });

      res.status(201).json({ success: true, data: document });
    } catch (error) {
      console.error('Błąd uploadu dokumentu:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Lista dokumentów (z filtrowaniem)
   * GET /api/documents
   */
  static async getDocuments(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        taskId: req.query.taskId ? Number(req.query.taskId) : undefined,
        category: req.query.category as string,
        type: req.query.type as string,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        offset: req.query.offset ? Number(req.query.offset) : 0
      };

      const result = await DocumentService.getDocuments(filters);
      
      res.json({
        success: true,
        data: result.documents,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset
        }
      });
    } catch (error) {
      console.error('Błąd pobierania dokumentów:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Szczegóły dokumentu
   * GET /api/documents/:id
   */
  static async getDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const idOrUuid = isNaN(Number(id)) ? id : Number(id);

      const document = await DocumentService.getDocument(idOrUuid);

      if (!document) {
        res.status(404).json({ success: false, message: 'Dokument nie znaleziony' });
        return;
      }

      res.json({ success: true, data: document });
    } catch (error) {
      console.error('Błąd pobierania dokumentu:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Pobierz plik dokumentu
   * GET /api/documents/:id/download
   */
  static async downloadDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const idOrUuid = isNaN(Number(id)) ? id : Number(id);

      const document = await DocumentService.getDocument(idOrUuid);

      if (!document) {
        res.status(404).json({ success: false, message: 'Dokument nie znaleziony' });
        return;
      }

      if (!fs.existsSync(document.filePath)) {
        res.status(404).json({ success: false, message: 'Plik nie istnieje' });
        return;
      }

      res.download(document.filePath, document.originalFilename);
    } catch (error) {
      console.error('Błąd pobierania pliku:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Usuń dokument
   * DELETE /api/documents/:id
   */
  static async deleteDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const idOrUuid = isNaN(Number(id)) ? id : Number(id);

      const deleted = await DocumentService.deleteDocument(idOrUuid);

      if (!deleted) {
        res.status(404).json({ success: false, message: 'Dokument nie znaleziony' });
        return;
      }

      res.json({ success: true, message: 'Dokument usunięty' });
    } catch (error) {
      console.error('Błąd usuwania dokumentu:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Dokumenty dla zadania
   * GET /api/documents/task/:taskId
   */
  static async getTaskDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      const documents = await DocumentService.getTaskDocuments(Number(taskId));

      res.json({ success: true, data: documents });
    } catch (error) {
      console.error('Błąd pobierania dokumentów zadania:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Aktualizuj dokument
   * PUT /api/documents/:id
   */
  static async updateDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const idOrUuid = isNaN(Number(id)) ? id : Number(id);

      // Walidacja DTO
      const dto = plainToInstance(UpdateDocumentDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Błąd walidacji',
          errors: errors.map(e => Object.values(e.constraints || {})).flat()
        });
        return;
      }

      const document = await DocumentService.updateDocument(idOrUuid, {
        name: dto.name,
        description: dto.description,
        category: dto.category
      });

      if (!document) {
        res.status(404).json({ success: false, message: 'Dokument nie znaleziony' });
        return;
      }

      res.json({ success: true, data: document });
    } catch (error) {
      console.error('Błąd aktualizacji dokumentu:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }
}
