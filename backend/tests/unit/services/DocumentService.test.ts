// tests/unit/services/DocumentService.test.ts
import { DocumentService } from '../../../src/services/DocumentService';
import { AppDataSource } from '../../../src/config/database';
import { Document } from '../../../src/entities/Document';
import { createMockRepository } from '../../mocks/database.mock';
import * as fs from 'fs';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
  hashSync: jest.fn(),
  compareSync: jest.fn(),
}));

jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('fs');

describe('DocumentService', () => {
  let mockDocumentRepository: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDocumentRepository = createMockRepository<Document>();
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockDocumentRepository);
  });

  describe('createDocument', () => {
    it('should create a new document successfully', async () => {
      const mockDocument = {
        id: 1,
        name: 'Test Doc',
        category: 'general',
        filePath: '/uploads/test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        originalFilename: 'test.pdf',
        type: 'uploaded',
      };

      mockDocumentRepository.create.mockReturnValue(mockDocument);
      mockDocumentRepository.save.mockResolvedValue(mockDocument);

      const result = await DocumentService.createDocument({
        name: 'Test Doc',
        category: 'general',
        filePath: '/uploads/test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        originalFilename: 'test.pdf',
      });

      expect(mockDocumentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test Doc', type: 'uploaded' })
      );
      expect(result).toEqual(mockDocument);
    });

    it('should set type to generated when generatedFromTemplateId is provided', async () => {
      const mockDocument = { id: 1, type: 'generated' };
      mockDocumentRepository.create.mockReturnValue(mockDocument);
      mockDocumentRepository.save.mockResolvedValue(mockDocument);

      await DocumentService.createDocument({
        name: 'Generated Doc',
        category: 'general',
        filePath: '/uploads/gen.pdf',
        fileSize: 2048,
        mimeType: 'application/pdf',
        originalFilename: 'gen.pdf',
        generatedFromTemplateId: 5,
      });

      expect(mockDocumentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'generated' })
      );
    });
  });

  describe('getDocuments', () => {
    it('should return documents with default pagination', async () => {
      const mockDocuments = [{ id: 1, name: 'Doc 1' }];
      mockDocumentRepository.findAndCount.mockResolvedValue([mockDocuments, 1]);

      const result = await DocumentService.getDocuments();

      expect(mockDocumentRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
          order: { createdAt: 'DESC' },
        })
      );
      expect(result.documents).toEqual(mockDocuments);
      expect(result.total).toBe(1);
    });

    it('should apply taskId filter', async () => {
      mockDocumentRepository.findAndCount.mockResolvedValue([[], 0]);

      await DocumentService.getDocuments({ taskId: 5 });

      expect(mockDocumentRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { taskId: 5 } })
      );
    });

    it('should apply category filter', async () => {
      mockDocumentRepository.findAndCount.mockResolvedValue([[], 0]);

      await DocumentService.getDocuments({ category: 'technical' });

      expect(mockDocumentRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { category: 'technical' } })
      );
    });
  });

  describe('getDocument', () => {
    it('should return document by numeric id', async () => {
      const mockDocument = { id: 1, name: 'Test' };
      mockDocumentRepository.findOne.mockResolvedValue(mockDocument);

      const result = await DocumentService.getDocument(1);

      expect(mockDocumentRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } })
      );
      expect(result).toEqual(mockDocument);
    });

    it('should return document by uuid string', async () => {
      const mockDocument = { id: 1, uuid: 'some-uuid' };
      mockDocumentRepository.findOne.mockResolvedValue(mockDocument);

      const result = await DocumentService.getDocument('some-uuid');

      expect(mockDocumentRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { uuid: 'some-uuid' } })
      );
      expect(result).toEqual(mockDocument);
    });

    it('should return null when document not found', async () => {
      mockDocumentRepository.findOne.mockResolvedValue(null);

      const result = await DocumentService.getDocument(999);

      expect(result).toBeNull();
    });
  });

  describe('getTaskDocuments', () => {
    it('should return all documents for a task', async () => {
      const mockDocuments = [{ id: 1 }, { id: 2 }];
      mockDocumentRepository.find.mockResolvedValue(mockDocuments);

      const result = await DocumentService.getTaskDocuments(10);

      expect(mockDocumentRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { taskId: 10 } })
      );
      expect(result).toEqual(mockDocuments);
    });
  });

  describe('deleteDocument', () => {
    it('should delete document and file', async () => {
      const mockDocument = { id: 1, filePath: '/uploads/test.pdf' };
      mockDocumentRepository.findOne.mockResolvedValue(mockDocument);
      mockDocumentRepository.remove.mockResolvedValue(undefined);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      const result = await DocumentService.deleteDocument(1);

      expect(fs.unlinkSync).toHaveBeenCalledWith('/uploads/test.pdf');
      expect(mockDocumentRepository.remove).toHaveBeenCalledWith(mockDocument);
      expect(result).toBe(true);
    });

    it('should return false when document not found', async () => {
      mockDocumentRepository.findOne.mockResolvedValue(null);

      const result = await DocumentService.deleteDocument(999);

      expect(result).toBe(false);
    });

    it('should continue deletion even if file does not exist', async () => {
      const mockDocument = { id: 1, filePath: '/uploads/missing.pdf' };
      mockDocumentRepository.findOne.mockResolvedValue(mockDocument);
      mockDocumentRepository.remove.mockResolvedValue(undefined);
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await DocumentService.deleteDocument(1);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(mockDocumentRepository.remove).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('updateDocument', () => {
    it('should update document fields', async () => {
      const mockDocument = { id: 1, name: 'Old Name', category: 'old' };
      const updatedDocument = { id: 1, name: 'New Name', category: 'technical' };
      mockDocumentRepository.findOne.mockResolvedValue(mockDocument);
      mockDocumentRepository.save.mockResolvedValue(updatedDocument);

      const result = await DocumentService.updateDocument(1, { name: 'New Name', category: 'technical' });

      expect(mockDocumentRepository.save).toHaveBeenCalled();
      expect(result).toEqual(updatedDocument);
    });

    it('should return null when document not found', async () => {
      mockDocumentRepository.findOne.mockResolvedValue(null);

      const result = await DocumentService.updateDocument(999, { name: 'Test' });

      expect(result).toBeNull();
    });
  });
});
