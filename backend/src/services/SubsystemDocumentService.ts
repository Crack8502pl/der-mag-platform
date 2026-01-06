// src/services/SubsystemDocumentService.ts
// Serwis zarządzania dokumentacją podsystemów

import { AppDataSource } from '../config/database';
import { SubsystemDocument } from '../entities/SubsystemDocument';
import { Subsystem } from '../entities/Subsystem';
import * as fs from 'fs';
import * as path from 'path';

export class SubsystemDocumentService {
  private documentRepository = AppDataSource.getRepository(SubsystemDocument);
  private subsystemRepository = AppDataSource.getRepository(Subsystem);

  /**
   * Pobranie listy dokumentów dla podsystemu
   */
  async getDocuments(subsystemId: number): Promise<SubsystemDocument[]> {
    return await this.documentRepository.find({
      where: { subsystemId },
      relations: ['uploadedBy'],
      order: { uploadedAt: 'DESC' }
    });
  }

  /**
   * Upload dokumentu dla podsystemu
   */
  async uploadDocument(
    subsystemId: number,
    file: Express.Multer.File,
    userId: number
  ): Promise<SubsystemDocument> {
    const subsystem = await this.subsystemRepository.findOne({
      where: { id: subsystemId }
    });

    if (!subsystem) {
      throw new Error('Podsystem nie istnieje');
    }

    const document = this.documentRepository.create({
      subsystemId,
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      filePath: file.path,
      uploadedById: userId
    });

    return await this.documentRepository.save(document);
  }

  /**
   * Usunięcie dokumentu
   */
  async deleteDocument(documentId: number, userId: number): Promise<boolean> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['uploadedBy']
    });

    if (!document) {
      throw new Error('Dokument nie istnieje');
    }

    // Usuń plik z dysku
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    await this.documentRepository.remove(document);
    return true;
  }

  /**
   * Pobranie pojedynczego dokumentu
   */
  async getDocument(documentId: number): Promise<SubsystemDocument | null> {
    return await this.documentRepository.findOne({
      where: { id: documentId }
    });
  }
}
