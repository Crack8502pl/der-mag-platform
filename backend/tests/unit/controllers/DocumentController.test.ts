// tests/unit/controllers/DocumentController.test.ts
import { Request, Response } from 'express';
import { DocumentController } from '../../../src/controllers/DocumentController';
import { DocumentService } from '../../../src/services/DocumentService';
import { createMockRequest, createMockResponse } from '../../mocks/request.mock';
import * as fs from 'fs';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
  hashSync: jest.fn(),
  compareSync: jest.fn(),
}));

jest.mock('../../../src/config/database', () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

jest.mock('../../../src/services/DocumentService');
jest.mock('fs');

jest.mock('../../../src/utils/logger', () => ({
  serverLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock class-validator to always return no errors by default
jest.mock('class-validator', () => ({
  ...jest.requireActual('class-validator'),
  validate: jest.fn().mockResolvedValue([]),
}));

jest.mock('class-transformer', () => ({
  plainToInstance: jest.fn().mockImplementation((cls: any, data: any) => data),
}));

describe('DocumentController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = createMockRequest();
    res = createMockResponse();
  });

  describe('uploadDocument', () => {
    it('should upload document and return 201', async () => {
      const mockDocument = { id: 1, name: 'Test Doc' };
      (DocumentService.createDocument as jest.Mock).mockResolvedValue(mockDocument);

      req = {
        ...createMockRequest({
          user: { id: 1 },
          body: { name: 'Test Doc', category: 'invoice' },
        }),
        file: {
          path: '/uploads/test.pdf',
          size: 1024,
          mimetype: 'application/pdf',
          originalname: 'test.pdf',
        } as any,
      };

      await DocumentController.uploadDocument(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: mockDocument })
      );
    });

    it('should return 400 when no file is provided', async () => {
      req = createMockRequest({ body: { name: 'Test', category: 'invoice' } });

      await DocumentController.uploadDocument(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should return 400 on validation error and delete uploaded file', async () => {
      const { validate } = require('class-validator');
      (validate as jest.Mock).mockResolvedValueOnce([
        { constraints: { isNotEmpty: 'Nazwa jest wymagana' } },
      ]);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      req = {
        ...createMockRequest({ body: {} }),
        file: { path: '/uploads/test.pdf' } as any,
      };

      await DocumentController.uploadDocument(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(fs.unlinkSync).toHaveBeenCalledWith('/uploads/test.pdf');
    });

    it('should return 500 on service error', async () => {
      (DocumentService.createDocument as jest.Mock).mockRejectedValue(new Error('DB error'));

      req = {
        ...createMockRequest({ body: { name: 'Test', category: 'invoice' } }),
        file: {
          path: '/uploads/test.pdf',
          size: 1024,
          mimetype: 'application/pdf',
          originalname: 'test.pdf',
        } as any,
      };

      await DocumentController.uploadDocument(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getDocuments', () => {
    it('should return documents with default pagination', async () => {
      const mockDocuments = [{ id: 1 }, { id: 2 }];
      (DocumentService.getDocuments as jest.Mock).mockResolvedValue({
        documents: mockDocuments,
        total: 2,
      });

      req = createMockRequest({ query: {} });

      await DocumentController.getDocuments(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockDocuments,
          pagination: expect.objectContaining({ total: 2 }),
        })
      );
    });

    it('should apply taskId filter', async () => {
      (DocumentService.getDocuments as jest.Mock).mockResolvedValue({ documents: [], total: 0 });

      req = createMockRequest({ query: { taskId: '5' } });

      await DocumentController.getDocuments(req as Request, res as Response);

      expect(DocumentService.getDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: 5 })
      );
    });

    it('should return 500 on error', async () => {
      (DocumentService.getDocuments as jest.Mock).mockRejectedValue(new Error('DB error'));

      req = createMockRequest({ query: {} });

      await DocumentController.getDocuments(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getDocument', () => {
    it('should return document when found by numeric id', async () => {
      const mockDocument = { id: 1, name: 'Test' };
      (DocumentService.getDocument as jest.Mock).mockResolvedValue(mockDocument);

      req = createMockRequest({ params: { id: '1' } });

      await DocumentController.getDocument(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: mockDocument })
      );
    });

    it('should return document when found by uuid', async () => {
      const mockDocument = { id: 1, uuid: 'some-uuid' };
      (DocumentService.getDocument as jest.Mock).mockResolvedValue(mockDocument);

      req = createMockRequest({ params: { id: 'some-uuid' } });

      await DocumentController.getDocument(req as Request, res as Response);

      expect(DocumentService.getDocument).toHaveBeenCalledWith('some-uuid');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 404 when document not found', async () => {
      (DocumentService.getDocument as jest.Mock).mockResolvedValue(null);

      req = createMockRequest({ params: { id: '999' } });

      await DocumentController.getDocument(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      (DocumentService.getDocument as jest.Mock).mockRejectedValue(new Error('DB error'));

      req = createMockRequest({ params: { id: '1' } });

      await DocumentController.getDocument(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('downloadDocument', () => {
    it('should send file when found and file exists', async () => {
      const mockDocument = { id: 1, filePath: '/uploads/test.pdf', originalFilename: 'test.pdf' };
      (DocumentService.getDocument as jest.Mock).mockResolvedValue(mockDocument);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockRes: any = {
        ...createMockResponse(),
        download: jest.fn(),
      };

      req = createMockRequest({ params: { id: '1' } });

      await DocumentController.downloadDocument(req as Request, mockRes as Response);

      expect(mockRes.download).toHaveBeenCalledWith('/uploads/test.pdf', 'test.pdf');
    });

    it('should return 404 when document not found', async () => {
      (DocumentService.getDocument as jest.Mock).mockResolvedValue(null);

      req = createMockRequest({ params: { id: '999' } });

      await DocumentController.downloadDocument(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 when file does not exist on disk', async () => {
      const mockDocument = { id: 1, filePath: '/uploads/missing.pdf', originalFilename: 'missing.pdf' };
      (DocumentService.getDocument as jest.Mock).mockResolvedValue(mockDocument);
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      req = createMockRequest({ params: { id: '1' } });

      await DocumentController.downloadDocument(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteDocument', () => {
    it('should delete document and return success', async () => {
      (DocumentService.deleteDocument as jest.Mock).mockResolvedValue(true);

      req = createMockRequest({ params: { id: '1' } });

      await DocumentController.deleteDocument(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 404 when document not found', async () => {
      (DocumentService.deleteDocument as jest.Mock).mockResolvedValue(false);

      req = createMockRequest({ params: { id: '999' } });

      await DocumentController.deleteDocument(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      (DocumentService.deleteDocument as jest.Mock).mockRejectedValue(new Error('DB error'));

      req = createMockRequest({ params: { id: '1' } });

      await DocumentController.deleteDocument(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateDocument', () => {
    it('should update document and return updated data', async () => {
      const mockDocument = { id: 1, name: 'Updated Name' };
      (DocumentService.updateDocument as jest.Mock).mockResolvedValue(mockDocument);

      req = createMockRequest({ params: { id: '1' }, body: { name: 'Updated Name' } });

      await DocumentController.updateDocument(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: mockDocument })
      );
    });

    it('should return 404 when document not found', async () => {
      (DocumentService.updateDocument as jest.Mock).mockResolvedValue(null);

      req = createMockRequest({ params: { id: '999' }, body: { name: 'Test' } });

      await DocumentController.updateDocument(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 on validation error', async () => {
      const { validate } = require('class-validator');
      (validate as jest.Mock).mockResolvedValueOnce([
        { constraints: { maxLength: 'Nazwa może mieć maksymalnie 255 znaków' } },
      ]);

      req = createMockRequest({ params: { id: '1' }, body: { name: 'x'.repeat(300) } });

      await DocumentController.updateDocument(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      (DocumentService.updateDocument as jest.Mock).mockRejectedValue(new Error('DB error'));

      req = createMockRequest({ params: { id: '1' }, body: { name: 'Test' } });

      await DocumentController.updateDocument(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
