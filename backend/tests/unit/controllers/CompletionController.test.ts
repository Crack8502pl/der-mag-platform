// tests/unit/controllers/CompletionController.test.ts
import { Request, Response } from 'express';
import { CompletionController } from '../../../src/controllers/CompletionController';
import { AppDataSource } from '../../../src/config/database';
import { CompletionOrder, CompletionOrderStatus, CompletionDecision } from '../../../src/entities/CompletionOrder';
import { CompletionItem, CompletionItemStatus } from '../../../src/entities/CompletionItem';
import { Pallet } from '../../../src/entities/Pallet';
import { Task } from '../../../src/entities/Task';
import { TaskMaterial } from '../../../src/entities/TaskMaterial';
import { createMockRequest, createMockResponse } from '../../mocks/request.mock';
import { createMockRepository, createMockQueryBuilder } from '../../mocks/database.mock';
import { createMockCompletionOrder, createMockCompletionItem, createMockPallet } from '../../mocks/completion.mock';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../src/services/CompletionService', () => ({
  __esModule: true,
  default: {
    createCompletionOrder: jest.fn(),
    createCompletionOrderFromTaskMaterials: jest.fn(),
    createPallet: jest.fn(),
    approveCompletion: jest.fn(),
    createPrefabricationTask: jest.fn(),
  },
}));

jest.mock('../../../src/services/NotificationService', () => ({
  __esModule: true,
  default: {
    notifyNewCompletionTask: jest.fn(),
    notifyCompletionFinished: jest.fn(),
    notifyNewPrefabricationTask: jest.fn(),
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import CompletionService from '../../../src/services/CompletionService';
import NotificationService from '../../../src/services/NotificationService';

describe('CompletionController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let mockOrderRepo: any;
  let mockItemRepo: any;
  let mockPalletRepo: any;
  let mockTaskRepo: any;
  let mockTaskMaterialRepo: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrderRepo = createMockRepository<CompletionOrder>();
    mockItemRepo = createMockRepository<CompletionItem>();
    mockPalletRepo = createMockRepository<Pallet>();
    mockTaskRepo = createMockRepository<Task>();
    mockTaskMaterialRepo = createMockRepository<TaskMaterial>();
    mockQueryBuilder = createMockQueryBuilder<CompletionOrder>();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === CompletionOrder) return mockOrderRepo;
      if (entity === CompletionItem) return mockItemRepo;
      if (entity === Pallet) return mockPalletRepo;
      if (entity === Task) return mockTaskRepo;
      if (entity === TaskMaterial) return mockTaskMaterialRepo;
      return createMockRepository();
    });

    mockOrderRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockItemRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

    req = createMockRequest({ userId: 1 });
    res = createMockResponse();
  });

  // -------------------------------------------------------------------------
  describe('listOrders', () => {
    it('should return list of orders with progress', async () => {
      const scannedItem = createMockCompletionItem({ status: CompletionItemStatus.SCANNED });
      const pendingItem = createMockCompletionItem({ id: 2, status: CompletionItemStatus.PENDING });
      const order = createMockCompletionOrder({ items: [scannedItem, pendingItem] });

      mockQueryBuilder.getMany.mockResolvedValue([order]);

      req.query = {};

      await CompletionController.listOrders(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            ...order,
            progress: {
              totalItems: 2,
              scannedItems: 1,
              missingItems: 0,
              partialItems: 0,
              pendingItems: 1,
              completionPercentage: 50,
            },
          },
        ],
      });
    });

    it('should filter by status when provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      req.query = { status: CompletionOrderStatus.IN_PROGRESS };

      await CompletionController.listOrders(req as Request, res as Response);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('order.status = :status', {
        status: CompletionOrderStatus.IN_PROGRESS,
      });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
    });

    it('should filter by assignedTo when provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      req.query = { assignedTo: '5' };

      await CompletionController.listOrders(req as Request, res as Response);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('order.assignedToId = :assignedTo', {
        assignedTo: '5',
      });
    });

    it('should default to current user when assignedTo and all not provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      req = createMockRequest({ userId: 42, query: {} });

      await CompletionController.listOrders(req as Request, res as Response);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('order.assignedToId = :userId', { userId: 42 });
    });

    it('should return 500 on error', async () => {
      mockQueryBuilder.getMany.mockRejectedValue(new Error('DB error'));
      req.query = {};

      await CompletionController.listOrders(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Błąd serwera podczas pobierania zleceń kompletacji',
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('getOrder', () => {
    it('should return order with progress', async () => {
      const scannedItem = createMockCompletionItem({ status: CompletionItemStatus.SCANNED, lp: 1 });
      const missingItem = createMockCompletionItem({ id: 2, status: CompletionItemStatus.MISSING, lp: 2 });
      const order = createMockCompletionOrder({ items: [scannedItem, missingItem] });

      mockQueryBuilder.getOne.mockResolvedValue(order);

      req.params = { id: '1' };

      await CompletionController.getOrder(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          ...order,
          progress: {
            totalItems: 2,
            scannedItems: 1,
            missingItems: 1,
            partialItems: 0,
            pendingItems: 0,
            completionPercentage: 50,
          },
        },
      });
    });

    it('should return 404 when order not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      req.params = { id: '99' };

      await CompletionController.getOrder(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Zlecenie kompletacji nie znalezione',
      });
    });

    it('should return 500 on error', async () => {
      mockQueryBuilder.getOne.mockRejectedValue(new Error('DB error'));
      req.params = { id: '1' };

      await CompletionController.getOrder(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Błąd serwera podczas pobierania zlecenia kompletacji',
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('scanItem', () => {
    it('should return 400 when barcode is missing', async () => {
      req.params = { id: '1' };
      req.body = {};

      await CompletionController.scanItem(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Kod kreskowy jest wymagany',
      });
    });

    it('should return 404 when order not found', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);
      req.params = { id: '99' };
      req.body = { barcode: 'ABC123' };

      await CompletionController.scanItem(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Zlecenie kompletacji nie znalezione',
      });
    });

    it('should return 404 when no matching item found for barcode', async () => {
      const order = createMockCompletionOrder({ items: [] });
      mockOrderRepo.findOne.mockResolvedValue(order);
      req.params = { id: '1' };
      req.body = { barcode: 'UNKNOWN' };

      await CompletionController.scanItem(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Nie znaleziono pozycji BOM pasującej do zeskanowanego kodu',
        code: 'ITEM_NOT_FOUND',
      });
    });

    it('should scan item successfully and mark as SCANNED when quantity meets expected', async () => {
      const item = createMockCompletionItem({
        status: CompletionItemStatus.PENDING,
        scannedQuantity: 0,
        bomItem: { quantity: 1, templateItem: { partNumber: 'ABC123' } } as any,
      });
      const order = createMockCompletionOrder({ items: [item], status: CompletionOrderStatus.CREATED });
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockItemRepo.save.mockResolvedValue({ ...item, status: CompletionItemStatus.SCANNED, scannedQuantity: 1 });
      mockOrderRepo.save.mockResolvedValue(order);

      req.params = { id: '1' };
      req.body = { barcode: 'ABC123', quantity: 1 };

      await CompletionController.scanItem(req as Request, res as Response);

      expect(mockItemRepo.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'Pozycja zeskanowana pomyślnie' })
      );
    });

    it('should mark item as PARTIAL when scanned quantity is less than expected', async () => {
      const item = createMockCompletionItem({
        status: CompletionItemStatus.PENDING,
        scannedQuantity: 0,
        bomItem: { quantity: 5, templateItem: { partNumber: 'ABC123' } } as any,
      });
      const order = createMockCompletionOrder({ items: [item], status: CompletionOrderStatus.IN_PROGRESS });
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockItemRepo.save.mockResolvedValue(item);

      req.params = { id: '1' };
      req.body = { barcode: 'ABC123', quantity: 2 };

      await CompletionController.scanItem(req as Request, res as Response);

      expect(item.status).toBe(CompletionItemStatus.PARTIAL);
      expect(item.scannedQuantity).toBe(2);
    });

    it('should return 500 on error', async () => {
      mockOrderRepo.findOne.mockRejectedValue(new Error('DB error'));
      req.params = { id: '1' };
      req.body = { barcode: 'ABC123' };

      await CompletionController.scanItem(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Błąd serwera podczas skanowania pozycji',
      });
    });

    it('should match a TaskMaterial-based item by materialName and scan it successfully', async () => {
      const item = createMockCompletionItem({
        status: CompletionItemStatus.PENDING,
        scannedQuantity: 0,
        expectedQuantity: 2,
        bomItem: null as any,
        taskMaterial: { id: 5, materialName: 'Kabel 10m', requiresSerialNumber: false } as any,
      });
      const order = createMockCompletionOrder({ items: [item], status: CompletionOrderStatus.IN_PROGRESS });
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockItemRepo.save.mockResolvedValue(item);

      req.params = { id: '1' };
      req.body = { barcode: 'Kabel 10m', quantity: 2 };

      await CompletionController.scanItem(req as Request, res as Response);

      expect(item.status).toBe(CompletionItemStatus.SCANNED);
      expect(mockItemRepo.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'Pozycja zeskanowana pomyślnie' })
      );
    });

    it('should return 400 when TaskMaterial item requiresSerialNumber but no serialNumber provided', async () => {
      const item = createMockCompletionItem({
        status: CompletionItemStatus.PENDING,
        scannedQuantity: 0,
        expectedQuantity: 1,
        bomItem: null as any,
        taskMaterial: { id: 5, materialName: 'Urządzenie SN', requiresSerialNumber: true } as any,
      });
      const order = createMockCompletionOrder({ items: [item], status: CompletionOrderStatus.IN_PROGRESS });
      mockOrderRepo.findOne.mockResolvedValue(order);

      req.params = { id: '1' };
      req.body = { barcode: 'Urządzenie SN' };

      await CompletionController.scanItem(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Ten materiał wymaga podania numeru seryjnego',
        code: 'SERIAL_NUMBER_REQUIRED',
      });
      expect(mockItemRepo.save).not.toHaveBeenCalled();
    });

    it('should return 400 when BOM item requiresSerialNumber but no serialNumber provided', async () => {
      const item = createMockCompletionItem({
        status: CompletionItemStatus.PENDING,
        scannedQuantity: 0,
        expectedQuantity: 1,
        bomItem: {
          quantity: 1,
          templateItem: { partNumber: 'SN-DEVICE', requiresSerialNumber: true },
        } as any,
      });
      const order = createMockCompletionOrder({ items: [item], status: CompletionOrderStatus.IN_PROGRESS });
      mockOrderRepo.findOne.mockResolvedValue(order);

      req.params = { id: '1' };
      req.body = { barcode: 'SN-DEVICE' };

      await CompletionController.scanItem(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Ten materiał wymaga podania numeru seryjnego',
        code: 'SERIAL_NUMBER_REQUIRED',
      });
      expect(mockItemRepo.save).not.toHaveBeenCalled();
    });

    it('should save serialNumber on item when provided', async () => {
      const item = createMockCompletionItem({
        status: CompletionItemStatus.PENDING,
        scannedQuantity: 0,
        expectedQuantity: 1,
        bomItem: {
          quantity: 1,
          templateItem: { partNumber: 'SN-DEVICE', requiresSerialNumber: true },
        } as any,
      });
      const order = createMockCompletionOrder({ items: [item], status: CompletionOrderStatus.IN_PROGRESS });
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockItemRepo.save.mockResolvedValue(item);

      req.params = { id: '1' };
      req.body = { barcode: 'SN-DEVICE', serialNumber: 'SN-XYZ-001' };

      await CompletionController.scanItem(req as Request, res as Response);

      expect(item.serialNumber).toBe('SN-XYZ-001');
      expect(mockItemRepo.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  // -------------------------------------------------------------------------
  describe('reportMissing', () => {
    it('should return 400 when itemId is missing', async () => {
      req.params = { id: '1' };
      req.body = {};

      await CompletionController.reportMissing(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'ID pozycji jest wymagane',
      });
    });

    it('should return 404 when item not found', async () => {
      mockItemRepo.findOne.mockResolvedValue(null);
      req.params = { id: '1' };
      req.body = { itemId: 99 };

      await CompletionController.reportMissing(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Pozycja kompletacji nie znaleziona',
      });
    });

    it('should mark item as missing and return success', async () => {
      const item = createMockCompletionItem();
      mockItemRepo.findOne.mockResolvedValue(item);
      mockItemRepo.save.mockResolvedValue({ ...item, status: CompletionItemStatus.MISSING });

      req.params = { id: '1' };
      req.body = { itemId: 1, notes: 'Out of stock' };

      await CompletionController.reportMissing(req as Request, res as Response);

      expect(item.status).toBe(CompletionItemStatus.MISSING);
      expect(item.notes).toBe('Out of stock');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Zgłoszono brak pozycji',
        data: item,
      });
    });

    it('should use default note when notes not provided', async () => {
      const item = createMockCompletionItem();
      mockItemRepo.findOne.mockResolvedValue(item);
      mockItemRepo.save.mockResolvedValue(item);

      req.params = { id: '1' };
      req.body = { itemId: 1 };

      await CompletionController.reportMissing(req as Request, res as Response);

      expect(item.notes).toBe('Brak materiału');
    });

    it('should return 500 on error', async () => {
      mockItemRepo.findOne.mockRejectedValue(new Error('DB error'));
      req.params = { id: '1' };
      req.body = { itemId: 1 };

      await CompletionController.reportMissing(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Błąd serwera podczas zgłaszania braku pozycji',
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('assignPallet', () => {
    it('should return 400 when itemIds is missing', async () => {
      req.params = { id: '1' };
      req.body = { palletCode: 'PAL-001' };

      await CompletionController.assignPallet(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lista ID pozycji jest wymagana',
      });
    });

    it('should return 400 when itemIds is empty array', async () => {
      req.params = { id: '1' };
      req.body = { itemIds: [], palletCode: 'PAL-001' };

      await CompletionController.assignPallet(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when palletCode is missing', async () => {
      req.params = { id: '1' };
      req.body = { itemIds: [1, 2] };

      await CompletionController.assignPallet(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Kod palety jest wymagany',
      });
    });

    it('should create new pallet and assign items', async () => {
      const pallet = createMockPallet();
      mockPalletRepo.findOne.mockResolvedValue(null);
      mockPalletRepo.create.mockReturnValue(pallet);
      mockPalletRepo.save.mockResolvedValue(pallet);

      const updateExec = jest.fn().mockResolvedValue({ affected: 2 });
      const mockItemQb: any = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: updateExec,
      };
      mockItemRepo.createQueryBuilder.mockReturnValue(mockItemQb);

      req.params = { id: '1' };
      req.body = { itemIds: [1, 2], palletCode: 'PAL-001' };

      await CompletionController.assignPallet(req as Request, res as Response);

      expect(mockPalletRepo.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Przypisano 2 pozycji do palety PAL-001',
        data: {
          pallet,
          assignedItemsCount: 2,
        },
      });
    });

    it('should reuse existing pallet', async () => {
      const pallet = createMockPallet();
      mockPalletRepo.findOne.mockResolvedValue(pallet);

      const updateExec = jest.fn().mockResolvedValue({ affected: 1 });
      const mockItemQb: any = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: updateExec,
      };
      mockItemRepo.createQueryBuilder.mockReturnValue(mockItemQb);

      req.params = { id: '1' };
      req.body = { itemIds: [1], palletCode: 'PAL-001' };

      await CompletionController.assignPallet(req as Request, res as Response);

      expect(mockPalletRepo.create).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 500 on error', async () => {
      mockPalletRepo.findOne.mockRejectedValue(new Error('DB error'));
      req.params = { id: '1' };
      req.body = { itemIds: [1], palletCode: 'PAL-001' };

      await CompletionController.assignPallet(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Błąd serwera podczas przypisywania do palety',
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('makeDecision', () => {
    it('should return 400 when decision is invalid', async () => {
      req.params = { id: '1' };
      req.body = { decision: 'INVALID_DECISION' };

      await CompletionController.makeDecision(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Nieprawidłowa decyzja. Dozwolone: CONTINUE_PARTIAL, WAIT_FOR_COMPLETE',
      });
    });

    it('should return 400 when decision is missing', async () => {
      req.params = { id: '1' };
      req.body = {};

      await CompletionController.makeDecision(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when order not found', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);
      req.params = { id: '99' };
      req.body = { decision: CompletionDecision.CONTINUE_PARTIAL };

      await CompletionController.makeDecision(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Zlecenie kompletacji nie znalezione',
      });
    });

    it('should set COMPLETED when CONTINUE_PARTIAL decision', async () => {
      const order = createMockCompletionOrder();
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockOrderRepo.save.mockResolvedValue(order);

      req = createMockRequest({ userId: 5 });
      req.params = { id: '1' };
      req.body = { decision: CompletionDecision.CONTINUE_PARTIAL, notes: 'Proceeding' };

      await CompletionController.makeDecision(req as Request, res as Response);

      expect(order.status).toBe(CompletionOrderStatus.COMPLETED);
      expect(order.decision).toBe(CompletionDecision.CONTINUE_PARTIAL);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Decyzja zapisana pomyślnie',
        data: order,
      });
    });

    it('should set WAITING_DECISION when WAIT_FOR_COMPLETE decision', async () => {
      const order = createMockCompletionOrder();
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockOrderRepo.save.mockResolvedValue(order);

      req = createMockRequest({ userId: 5 });
      req.params = { id: '1' };
      req.body = { decision: CompletionDecision.WAIT_FOR_COMPLETE };

      await CompletionController.makeDecision(req as Request, res as Response);

      expect(order.status).toBe(CompletionOrderStatus.WAITING_DECISION);
    });

    it('should return 500 on error', async () => {
      mockOrderRepo.findOne.mockRejectedValue(new Error('DB error'));
      req.params = { id: '1' };
      req.body = { decision: CompletionDecision.CONTINUE_PARTIAL };

      await CompletionController.makeDecision(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Błąd serwera podczas zapisywania decyzji',
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('completeOrder', () => {
    it('should return 404 when order not found', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);
      req.params = { id: '99' };

      await CompletionController.completeOrder(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Zlecenie kompletacji nie znalezione',
      });
    });

    it('should return 400 when not all items are scanned or missing', async () => {
      const items = [
        createMockCompletionItem({ status: CompletionItemStatus.SCANNED }),
        createMockCompletionItem({ id: 2, status: CompletionItemStatus.PENDING }),
      ];
      const order = createMockCompletionOrder({ items });
      mockOrderRepo.findOne.mockResolvedValue(order);

      req.params = { id: '1' };

      await CompletionController.completeOrder(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Nie wszystkie pozycje zostały zeskanowane lub zgłoszone jako brakujące',
      });
    });

    it('should complete order when all items are scanned or missing', async () => {
      const items = [
        createMockCompletionItem({ status: CompletionItemStatus.SCANNED }),
        createMockCompletionItem({ id: 2, status: CompletionItemStatus.MISSING }),
      ];
      const order = createMockCompletionOrder({ items });
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockOrderRepo.save.mockResolvedValue({ ...order, status: CompletionOrderStatus.COMPLETED });

      req.params = { id: '1' };

      await CompletionController.completeOrder(req as Request, res as Response);

      expect(order.status).toBe(CompletionOrderStatus.COMPLETED);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Zlecenie kompletacji zakończone',
        data: order,
      });
    });

    it('should return 500 on error', async () => {
      mockOrderRepo.findOne.mockRejectedValue(new Error('DB error'));
      req.params = { id: '1' };

      await CompletionController.completeOrder(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Błąd serwera podczas kończenia zlecenia',
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('createOrder', () => {
    it('should return 400 when required params are missing', async () => {
      req.body = { subsystemId: 1 };

      await CompletionController.createOrder(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Brak wymaganych parametrów: taskNumber, subsystemId, assignedToId',
      });
    });

    it('should return 404 when task is not found', async () => {
      mockTaskRepo.findOne.mockResolvedValue(null);

      req.body = { taskNumber: 'Z0001ABCD', subsystemId: 1, assignedToId: 1 };

      await CompletionController.createOrder(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Zadanie o numerze Z0001ABCD nie znalezione',
      });
    });

    it('should return 400 when task has no BOM materials', async () => {
      const mockTask = { id: 1, taskNumber: 'Z0001ABCD', status: 'assigned' };
      mockTaskRepo.findOne.mockResolvedValue(mockTask);
      mockTaskMaterialRepo.find.mockResolvedValue([]);

      req.body = { taskNumber: 'Z0001ABCD', subsystemId: 1, assignedToId: 1 };

      await CompletionController.createOrder(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Zadanie Z0001ABCD nie ma skonfigurowanych materiałów BOM',
      });
    });

    it('should create order and update task status on success', async () => {
      const mockTask = { id: 1, taskNumber: 'Z0001ABCD', status: 'assigned' };
      const mockMaterials = [{ id: 1, taskId: 1, materialName: 'Material A', plannedQuantity: 2 }];
      const order = createMockCompletionOrder();

      mockTaskRepo.findOne.mockResolvedValue(mockTask);
      mockTaskMaterialRepo.find.mockResolvedValue(mockMaterials);
      (CompletionService.createCompletionOrderFromTaskMaterials as jest.Mock).mockResolvedValue(order);
      mockTaskRepo.save.mockResolvedValue({ ...mockTask, status: 'in_completion' });

      req.body = { taskNumber: 'Z0001ABCD', subsystemId: 1, assignedToId: 1 };

      await CompletionController.createOrder(req as Request, res as Response);

      expect(CompletionService.createCompletionOrderFromTaskMaterials).toHaveBeenCalledWith({
        taskId: 1,
        taskNumber: 'Z0001ABCD',
        subsystemId: 1,
        assignedToId: 1,
        taskMaterials: mockMaterials,
      });
      expect(mockTaskRepo.save).toHaveBeenCalledWith({ ...mockTask, status: 'in_completion' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Zlecenie kompletacji utworzone',
        data: order,
      });
    });

    it('should return 500 on service error', async () => {
      const mockTask = { id: 1, taskNumber: 'Z0001ABCD', status: 'assigned' };
      const mockMaterials = [{ id: 1, taskId: 1, materialName: 'Material A', plannedQuantity: 2 }];

      mockTaskRepo.findOne.mockResolvedValue(mockTask);
      mockTaskMaterialRepo.find.mockResolvedValue(mockMaterials);
      (CompletionService.createCompletionOrderFromTaskMaterials as jest.Mock).mockRejectedValue(
        new Error('Podsystem nie znaleziony')
      );

      req.body = { taskNumber: 'Z0001ABCD', subsystemId: 99, assignedToId: 1 };

      await CompletionController.createOrder(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Podsystem nie znaleziony',
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('approveCompletion', () => {
    it('should return 401 when userId is missing', async () => {
      req = createMockRequest();
      req.params = { id: '1' };
      req.body = { partial: false };

      await CompletionController.approveCompletion(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Brak autoryzacji',
      });
    });

    it('should approve full completion and send notification', async () => {
      const order = createMockCompletionOrder({ status: CompletionOrderStatus.COMPLETED });
      (CompletionService.approveCompletion as jest.Mock).mockResolvedValue(order);
      (NotificationService.notifyCompletionFinished as jest.Mock).mockResolvedValue(undefined);

      req = createMockRequest({ userId: 1 });
      req.params = { id: '1' };
      req.body = { partial: false, notes: 'All good' };

      await CompletionController.approveCompletion(req as Request, res as Response);

      expect(CompletionService.approveCompletion).toHaveBeenCalledWith({
        completionOrderId: 1,
        partial: false,
        notes: 'All good',
        userId: 1,
      });
      expect(NotificationService.notifyCompletionFinished).toHaveBeenCalledWith(order.id);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Kompletacja pełna zatwierdzona',
        data: order,
      });
    });

    it('should approve partial completion', async () => {
      const order = createMockCompletionOrder({ status: CompletionOrderStatus.WAITING_DECISION });
      (CompletionService.approveCompletion as jest.Mock).mockResolvedValue(order);

      req = createMockRequest({ userId: 1 });
      req.params = { id: '1' };
      req.body = { partial: true };

      await CompletionController.approveCompletion(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Kompletacja częściowa zatwierdzona',
        data: order,
      });
    });

    it('should return 500 on service error', async () => {
      (CompletionService.approveCompletion as jest.Mock).mockRejectedValue(
        new Error('Nie wszystkie pozycje zostały przetworzone')
      );

      req = createMockRequest({ userId: 1 });
      req.params = { id: '1' };
      req.body = { partial: false };

      await CompletionController.approveCompletion(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Nie wszystkie pozycje zostały przetworzone',
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('createPallet', () => {
    it('should return 400 when palletNumber is missing', async () => {
      req.params = { id: '1' };
      req.body = {};

      await CompletionController.createPallet(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Brak numeru palety',
      });
    });

    it('should create pallet successfully', async () => {
      const pallet = createMockPallet();
      (CompletionService.createPallet as jest.Mock).mockResolvedValue(pallet);

      req.params = { id: '1' };
      req.body = { palletNumber: 'PAL-001' };

      await CompletionController.createPallet(req as Request, res as Response);

      expect(CompletionService.createPallet).toHaveBeenCalledWith(1, 'PAL-001');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Paleta utworzona',
        data: pallet,
      });
    });

    it('should return 500 on service error', async () => {
      (CompletionService.createPallet as jest.Mock).mockRejectedValue(
        new Error('Zlecenie kompletacji nie znalezione')
      );

      req.params = { id: '99' };
      req.body = { palletNumber: 'PAL-001' };

      await CompletionController.createPallet(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Zlecenie kompletacji nie znalezione',
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('createPrefabTask', () => {
    it('should return 400 when assignedToId is missing', async () => {
      req.params = { id: '1' };
      req.body = {};

      await CompletionController.createPrefabTask(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Brak ID użytkownika do przypisania',
      });
    });

    it('should create prefab task and send notification', async () => {
      const prefabTask = { id: 1, completionOrderId: 1, subsystemId: 1 };
      (CompletionService.createPrefabricationTask as jest.Mock).mockResolvedValue(prefabTask);
      (NotificationService.notifyNewPrefabricationTask as jest.Mock).mockResolvedValue(undefined);

      req.params = { id: '1' };
      req.body = { assignedToId: 2 };

      await CompletionController.createPrefabTask(req as Request, res as Response);

      expect(CompletionService.createPrefabricationTask).toHaveBeenCalledWith(1, 2);
      expect(NotificationService.notifyNewPrefabricationTask).toHaveBeenCalledWith(prefabTask.id);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Zadanie prefabrykacji utworzone',
        data: prefabTask,
      });
    });

    it('should return 500 on service error', async () => {
      (CompletionService.createPrefabricationTask as jest.Mock).mockRejectedValue(
        new Error('Zlecenie kompletacji nie jest zakończone')
      );

      req.params = { id: '1' };
      req.body = { assignedToId: 2 };

      await CompletionController.createPrefabTask(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Zlecenie kompletacji nie jest zakończone',
      });
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order successfully', async () => {
      const order = createMockCompletionOrder({ status: CompletionOrderStatus.CREATED });
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockOrderRepo.save.mockResolvedValue({ ...order, status: CompletionOrderStatus.CANCELLED });
      (CompletionService.recalculateAllReservationsForOrder as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      req.params = { id: '1' };

      await CompletionController.cancelOrder(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 when order not found', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);
      req.params = { id: '99' };

      await CompletionController.cancelOrder(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 when order is already completed', async () => {
      const order = createMockCompletionOrder({ status: CompletionOrderStatus.COMPLETED });
      mockOrderRepo.findOne.mockResolvedValue(order);
      req.params = { id: '1' };

      await CompletionController.cancelOrder(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getCompletedOrders', () => {
    it('should return completed orders', async () => {
      const orders = [createMockCompletionOrder({ status: CompletionOrderStatus.COMPLETED })];
      (CompletionService.getCompletedOrders as jest.Mock) = jest.fn().mockResolvedValue(orders);

      req.query = {};

      await CompletionController.getCompletedOrders(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: orders });
    });

    it('should apply assignedTo and subsystemId filters', async () => {
      (CompletionService.getCompletedOrders as jest.Mock) = jest.fn().mockResolvedValue([]);

      req.query = { assignedTo: '5', subsystemId: '10' };

      await CompletionController.getCompletedOrders(req as Request, res as Response);

      expect(CompletionService.getCompletedOrders).toHaveBeenCalledWith(
        expect.objectContaining({ assignedToId: 5, subsystemId: 10 })
      );
    });
  });

  describe('saveIssuedQuantities', () => {
    it('should save issued quantities successfully', async () => {
      (CompletionService.saveIssuedQuantities as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      req.params = { id: '1' };
      req.body = { quantities: { 1: 3, 2: 5 } };

      await CompletionController.saveIssuedQuantities(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Ilości wydane zapisane' });
    });

    it('should return 400 when quantities is missing', async () => {
      req.params = { id: '1' };
      req.body = {};

      await CompletionController.saveIssuedQuantities(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // -------------------------------------------------------------------------
  describe('saveItemSerials', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockItemRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
      mockTaskMaterialRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
    });

    it('should return 400 when serialNumbers is not an array', async () => {
      req.params = { id: '1', itemId: '1' };
      req.body = { serialNumbers: 'not-an-array' };

      await CompletionController.saveItemSerials(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'serialNumbers musi być tablicą' });
    });

    it('should return 404 when completion item is not found', async () => {
      mockItemRepo.findOne.mockResolvedValue(null);

      req.params = { id: '1', itemId: '99' };
      req.body = { serialNumbers: ['SN001'] };

      await CompletionController.saveItemSerials(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should save serial numbers successfully when no duplicates exist', async () => {
      const item = createMockCompletionItem({ id: 1, completionOrderId: 1, taskMaterial: null, taskMaterialId: null, expectedQuantity: 2 });
      mockItemRepo.findOne.mockResolvedValue(item);
      mockItemRepo.save.mockResolvedValue(item);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      req.params = { id: '1', itemId: '1' };
      req.body = { serialNumbers: ['SN001', 'SN002'] };

      await CompletionController.saveItemSerials(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 when a serial number is already used in another completion item', async () => {
      const item = createMockCompletionItem({ id: 1, completionOrderId: 1, taskMaterial: null, taskMaterialId: null });
      mockItemRepo.findOne.mockResolvedValue(item);

      const duplicateQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce([createMockCompletionItem({ id: 2, serialNumber: 'SN001' })])
          .mockResolvedValue([]),
      };
      mockItemRepo.createQueryBuilder = jest.fn().mockReturnValue(duplicateQueryBuilder);
      mockTaskMaterialRepo.createQueryBuilder = jest.fn().mockReturnValue(duplicateQueryBuilder);

      req.params = { id: '1', itemId: '1' };
      req.body = { serialNumbers: ['SN001', 'SN002'] };

      await CompletionController.saveItemSerials(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('SN001'),
      }));
    });

    it('should return 400 when a serial number is already used in another task material', async () => {
      const item = createMockCompletionItem({ id: 1, completionOrderId: 1, taskMaterial: null, taskMaterialId: null });
      mockItemRepo.findOne.mockResolvedValue(item);

      const noItemDuplicates = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      const withMaterialDuplicates = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: 5, serialNumbers: ['SN001', 'SN003'] }
        ]),
      };
      mockItemRepo.createQueryBuilder = jest.fn().mockReturnValue(noItemDuplicates);
      mockTaskMaterialRepo.createQueryBuilder = jest.fn().mockReturnValue(withMaterialDuplicates);

      req.params = { id: '1', itemId: '1' };
      req.body = { serialNumbers: ['SN001', 'SN002'] };

      await CompletionController.saveItemSerials(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('SN001'),
      }));
    });
  });
});
