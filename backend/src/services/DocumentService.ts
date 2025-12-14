// src/services/DocumentService.ts
// Serwis zarządzania dokumentami

import { AppDataSource } from '../config/database';
import { Document } from '../entities/Document';
import { FindOptionsWhere } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

export class DocumentService {
  /**
   * Tworzy nowy dokument
   */
  static async createDocument(data: {
    name: string;
    description?: string;
    taskId?: number;
    category: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    originalFilename: string;
    createdById?: number;
    generatedFromTemplateId?: number;
  }): Promise<Document> {
    const documentRepository = AppDataSource.getRepository(Document);
    
    const document = documentRepository.create({
      ...data,
      type: data.generatedFromTemplateId ? 'generated' : 'uploaded'
    });

    return await documentRepository.save(document);
  }

  /**
   * Pobiera listę dokumentów z filtrowaniem
   */
  static async getDocuments(filters?: {
    taskId?: number;
    category?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ documents: Document[]; total: number }> {
    const documentRepository = AppDataSource.getRepository(Document);
    
    const where: FindOptionsWhere<Document> = {};
    if (filters?.taskId) where.taskId = filters.taskId;
    if (filters?.category) where.category = filters.category;
    if (filters?.type) where.type = filters.type;

    const [documents, total] = await documentRepository.findAndCount({
      where,
      relations: ['task', 'createdBy', 'generatedFromTemplate'],
      order: { createdAt: 'DESC' },
      take: filters?.limit || 20,
      skip: filters?.offset || 0
    });

    return { documents, total };
  }

  /**
   * Pobiera pojedynczy dokument po ID lub UUID
   */
  static async getDocument(idOrUuid: number | string): Promise<Document | null> {
    const documentRepository = AppDataSource.getRepository(Document);
    
    const where = typeof idOrUuid === 'number' 
      ? { id: idOrUuid } 
      : { uuid: idOrUuid };

    return await documentRepository.findOne({
      where,
      relations: ['task', 'createdBy', 'generatedFromTemplate']
    });
  }

  /**
   * Pobiera dokumenty dla konkretnego zadania
   */
  static async getTaskDocuments(taskId: number): Promise<Document[]> {
    const documentRepository = AppDataSource.getRepository(Document);
    
    return await documentRepository.find({
      where: { taskId },
      relations: ['createdBy', 'generatedFromTemplate'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Usuwa dokument (wraz z plikiem)
   */
  static async deleteDocument(idOrUuid: number | string): Promise<boolean> {
    const documentRepository = AppDataSource.getRepository(Document);
    
    const document = await this.getDocument(idOrUuid);
    
    if (!document) {
      return false;
    }

    // Usuń plik fizyczny
    try {
      if (fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
      }
    } catch (error) {
      console.error('Błąd usuwania pliku:', error);
      // Kontynuuj usuwanie z bazy danych mimo błędu usuwania pliku
    }

    await documentRepository.remove(document);
    return true;
  }

  /**
   * Aktualizuje dokument
   */
  static async updateDocument(
    idOrUuid: number | string,
    data: { name?: string; description?: string; category?: string }
  ): Promise<Document | null> {
    const documentRepository = AppDataSource.getRepository(Document);
    
    const document = await this.getDocument(idOrUuid);
    
    if (!document) {
      return null;
    }

    Object.assign(document, data);
    return await documentRepository.save(document);
  }
}
