// tests/unit/services/CompletionService.test.ts
import { CompletionService } from '../../../src/services/CompletionService';
import { AppDataSource } from '../../../src/config/database';
import { CompletionOrder, CompletionOrderStatus } from '../../../src/entities/CompletionOrder';
import { CompletionItem, CompletionItemStatus } from '../../../src/entities/CompletionItem';
import { Pallet, PalletStatus } from '../../../src/entities/Pallet';
import { Subsystem, SubsystemStatus } from '../../../src/entities/Subsystem';
import { WorkflowGeneratedBom } from '../../../src/entities/WorkflowGeneratedBom';
import { User } from '../../../src/entities/User';
import { PrefabricationTask, PrefabricationTaskStatus } from '../../../src/entities/PrefabricationTask';
import { createMockRepository } from '../../mocks/database.mock';
import { createMockCompletionOrder, createMockCompletionItem, createMockPallet } from '../../mocks/completion.mock';

// Mock the database
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

// Mock SubsystemTaskService
jest.mock('../../../src/services/SubsystemTaskService', () => ({
  SubsystemTaskService: jest.fn().mockImplementation(() => ({
    updateStatusForSubsystem: jest.fn().mockResolvedValue(undefined),
    getTasksBySubsystem: jest.fn().mockResolvedValue([]),
    updateStatus: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock NotificationService
jest.mock('../../../src/services/NotificationService', () => ({
  __esModule: true,
  default: {
    notifyNewCompletionTask: jest.fn().mockResolvedValue(undefined),
    notifyCompletionFinished: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CompletionService', () => {
  let service: CompletionService;
  let mockOrderRepo: any;
  let mockItemRepo: any;
  let mockPalletRepo: any;
  let mockSubsystemRepo: any;
  let mockBomRepo: any;
  let mockUserRepo: any;
  let mockPrefabTaskRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new CompletionService();

    mockOrderRepo = createMockRepository<CompletionOrder>();
    mockItemRepo = createMockRepository<CompletionItem>();
    mockPalletRepo = createMockRepository<Pallet>();
    mockSubsystemRepo = createMockRepository<Subsystem>();
    mockBomRepo = createMockRepository<WorkflowGeneratedBom>();
    mockUserRepo = createMockRepository<User>();
    mockPrefabTaskRepo = createMockRepository<PrefabricationTask>();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === CompletionOrder) return mockOrderRepo;
      if (entity === CompletionItem) return mockItemRepo;
      if (entity === Pallet) return mockPalletRepo;
      if (entity === Subsystem) return mockSubsystemRepo;
      if (entity === WorkflowGeneratedBom) return mockBomRepo;
      if (entity === User) return mockUserRepo;
      if (entity === PrefabricationTask) return mockPrefabTaskRepo;
      return createMockRepository();
    });
  });

  // -------------------------------------------------------------------------
  describe('createCompletionOrder', () => {
    it('should throw when subsystem not found', async () => {
      mockSubsystemRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createCompletionOrder({ subsystemId: 99, generatedBomId: 1, assignedToId: 1 })
      ).rejects.toThrow('Podsystem nie znaleziony');
    });

    it('should throw when BOM not found', async () => {
      mockSubsystemRepo.findOne.mockResolvedValue({ id: 1, subsystemNumber: 'S001' });
      mockBomRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createCompletionOrder({ subsystemId: 1, generatedBomId: 99, assignedToId: 1 })
      ).rejects.toThrow('BOM nie znaleziony');
    });

    it('should throw when BOM does not belong to subsystem', async () => {
      mockSubsystemRepo.findOne.mockResolvedValue({ id: 1, subsystemNumber: 'S001' });
      mockBomRepo.findOne.mockResolvedValue({ id: 1, subsystemId: 2, items: [] });

      await expect(
        service.createCompletionOrder({ subsystemId: 1, generatedBomId: 1, assignedToId: 1 })
      ).rejects.toThrow('BOM nie należy do tego podsystemu');
    });

    it('should throw when user not found', async () => {
      mockSubsystemRepo.findOne.mockResolvedValue({ id: 1, subsystemNumber: 'S001' });
      mockBomRepo.findOne.mockResolvedValue({ id: 1, subsystemId: 1, items: [] });
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createCompletionOrder({ subsystemId: 1, generatedBomId: 1, assignedToId: 99 })
      ).rejects.toThrow('Użytkownik nie znaleziony');
    });

    it('should throw when completion order already exists', async () => {
      mockSubsystemRepo.findOne.mockResolvedValue({ id: 1, subsystemNumber: 'S001' });
      mockBomRepo.findOne.mockResolvedValue({ id: 1, subsystemId: 1, items: [] });
      mockUserRepo.findOne.mockResolvedValue({ id: 1 });
      mockOrderRepo.findOne.mockResolvedValue(createMockCompletionOrder());

      await expect(
        service.createCompletionOrder({ subsystemId: 1, generatedBomId: 1, assignedToId: 1 })
      ).rejects.toThrow('Zlecenie kompletacji dla tego podsystemu już istnieje');
    });

    it('should create completion order with items successfully', async () => {
      const subsystem = { id: 1, subsystemNumber: 'S001', status: SubsystemStatus.BOM_GENERATED };
      const bom = {
        id: 1,
        subsystemId: 1,
        items: [
          { id: 10, quantity: 5 },
          { id: 11, quantity: 3 },
        ],
      };
      const user = { id: 1, name: 'Worker' };
      const order = createMockCompletionOrder({ id: 42 });

      mockSubsystemRepo.findOne.mockResolvedValue(subsystem);
      mockBomRepo.findOne.mockResolvedValue(bom);
      mockUserRepo.findOne.mockResolvedValue(user);
      mockOrderRepo.findOne.mockResolvedValue(null); // no existing order
      mockOrderRepo.create.mockReturnValue(order);
      mockOrderRepo.save.mockResolvedValue(order);

      const item1 = createMockCompletionItem({ id: 1 });
      const item2 = createMockCompletionItem({ id: 2 });
      mockItemRepo.create
        .mockReturnValueOnce(item1)
        .mockReturnValueOnce(item2);
      mockItemRepo.save.mockResolvedValue([item1, item2]);
      mockSubsystemRepo.save.mockResolvedValue(subsystem);

      const result = await service.createCompletionOrder({
        subsystemId: 1,
        generatedBomId: 1,
        assignedToId: 1,
      });

      expect(mockOrderRepo.create).toHaveBeenCalledWith({
        subsystemId: 1,
        generatedBomId: 1,
        assignedToId: 1,
        status: CompletionOrderStatus.CREATED,
      });
      expect(mockOrderRepo.save).toHaveBeenCalledWith(order);
      expect(mockItemRepo.create).toHaveBeenCalledTimes(2);
      expect(mockItemRepo.save).toHaveBeenCalled();
      expect(subsystem.status).toBe(SubsystemStatus.IN_COMPLETION);
      expect(result).toBe(order);
    });
  });

  // -------------------------------------------------------------------------
  describe('createPallet', () => {
    it('should throw when completion order not found', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);

      await expect(service.createPallet(99, 'PAL-001')).rejects.toThrow(
        'Zlecenie kompletacji nie znalezione'
      );
    });

    it('should return existing pallet if already created', async () => {
      const order = createMockCompletionOrder();
      const pallet = createMockPallet();
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockPalletRepo.findOne.mockResolvedValue(pallet);

      const result = await service.createPallet(1, 'PAL-001');

      expect(mockPalletRepo.create).not.toHaveBeenCalled();
      expect(result).toBe(pallet);
    });

    it('should create and save a new pallet', async () => {
      const order = createMockCompletionOrder();
      const pallet = createMockPallet();
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockPalletRepo.findOne.mockResolvedValue(null);
      mockPalletRepo.create.mockReturnValue(pallet);
      mockPalletRepo.save.mockResolvedValue(pallet);

      const result = await service.createPallet(1, 'PAL-001');

      expect(mockPalletRepo.create).toHaveBeenCalledWith({
        palletNumber: 'PAL-001',
        completionOrderId: 1,
        status: PalletStatus.OPEN,
      });
      expect(mockPalletRepo.save).toHaveBeenCalledWith(pallet);
      expect(result).toBe(pallet);
    });
  });

  // -------------------------------------------------------------------------
  describe('scanMaterial', () => {
    const baseParams = {
      completionOrderId: 1,
      barcode: 'ABC123',
      quantity: 1,
      userId: 1,
    };

    it('should throw when order not found', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);

      await expect(service.scanMaterial(baseParams)).rejects.toThrow(
        'Zlecenie kompletacji nie znalezione'
      );
    });

    it('should throw when order is already completed', async () => {
      const order = createMockCompletionOrder({ status: CompletionOrderStatus.COMPLETED });
      mockOrderRepo.findOne.mockResolvedValue(order);

      await expect(service.scanMaterial(baseParams)).rejects.toThrow('Zlecenie już zakończone');
    });

    it('should throw when no matching item found', async () => {
      const order = createMockCompletionOrder({
        items: [],
        status: CompletionOrderStatus.IN_PROGRESS,
      });
      mockOrderRepo.findOne.mockResolvedValue(order);

      await expect(service.scanMaterial(baseParams)).rejects.toThrow(
        'Nie znaleziono pozycji BOM pasującej do zeskanowanego kodu'
      );
    });

    it('should scan item and mark as SCANNED when quantity met', async () => {
      const item = createMockCompletionItem({
        status: CompletionItemStatus.PENDING,
        scannedQuantity: 0,
        expectedQuantity: 1,
        bomItem: { partNumber: 'ABC123', templateItem: { partNumber: 'ABC123' } } as any,
      });
      const order = createMockCompletionOrder({
        items: [item],
        status: CompletionOrderStatus.IN_PROGRESS,
      });
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockItemRepo.save.mockResolvedValue(item);

      const result = await service.scanMaterial(baseParams);

      expect(item.status).toBe(CompletionItemStatus.SCANNED);
      expect(item.scannedQuantity).toBe(1);
      expect(result).toBe(item);
    });

    it('should mark item as PARTIAL when scanned quantity is less than expected', async () => {
      const item = createMockCompletionItem({
        status: CompletionItemStatus.PENDING,
        scannedQuantity: 0,
        expectedQuantity: 5,
        bomItem: { partNumber: 'ABC123', templateItem: { partNumber: 'ABC123' } } as any,
      });
      const order = createMockCompletionOrder({
        items: [item],
        status: CompletionOrderStatus.IN_PROGRESS,
      });
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockItemRepo.save.mockResolvedValue(item);

      await service.scanMaterial({ ...baseParams, quantity: 2 });

      expect(item.status).toBe(CompletionItemStatus.PARTIAL);
      expect(item.scannedQuantity).toBe(2);
    });

    it('should throw when serial number is already used', async () => {
      const item = createMockCompletionItem({
        id: 10,
        status: CompletionItemStatus.PENDING,
        scannedQuantity: 0,
        expectedQuantity: 1,
        bomItem: { partNumber: 'ABC123', templateItem: { partNumber: 'ABC123' } } as any,
      });
      const order = createMockCompletionOrder({
        items: [item],
        status: CompletionOrderStatus.IN_PROGRESS,
      });
      mockOrderRepo.findOne.mockResolvedValue(order);
      // Return an item with a different id - serial already used
      mockItemRepo.findOne.mockResolvedValue(createMockCompletionItem({ id: 99 }));

      await expect(
        service.scanMaterial({ ...baseParams, serialNumber: 'SN001' })
      ).rejects.toThrow('Numer seryjny SN001 już został użyty');
    });

    it('should update order status to IN_PROGRESS when it is CREATED', async () => {
      const item = createMockCompletionItem({
        status: CompletionItemStatus.PENDING,
        scannedQuantity: 0,
        expectedQuantity: 1,
        bomItem: { partNumber: 'ABC123', templateItem: { partNumber: 'ABC123' } } as any,
      });
      const order = createMockCompletionOrder({
        items: [item],
        status: CompletionOrderStatus.CREATED,
        subsystemId: 5,
      });
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockItemRepo.save.mockResolvedValue(item);
      mockOrderRepo.save.mockResolvedValue(order);

      await service.scanMaterial(baseParams);

      expect(mockOrderRepo.save).toHaveBeenCalledWith(order);
    });
  });

  // -------------------------------------------------------------------------
  describe('reportMissing', () => {
    it('should throw when order not found', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);

      await expect(
        service.reportMissing({ completionOrderId: 99, itemIds: [1], userId: 1 })
      ).rejects.toThrow('Zlecenie kompletacji nie znalezione');
    });

    it('should mark items as missing and update order status', async () => {
      const order = createMockCompletionOrder();
      const item = createMockCompletionItem();
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockItemRepo.findOne.mockResolvedValue(item);
      mockItemRepo.save.mockResolvedValue(item);
      mockOrderRepo.save.mockResolvedValue(order);

      await service.reportMissing({
        completionOrderId: 1,
        itemIds: [1],
        notes: 'Not in stock',
        userId: 1,
      });

      expect(item.status).toBe(CompletionItemStatus.MISSING);
      expect(item.notes).toBe('Not in stock');
      expect(order.status).toBe(CompletionOrderStatus.WAITING_FOR_MATERIALS);
    });

    it('should use default note when notes not provided', async () => {
      const order = createMockCompletionOrder();
      const item = createMockCompletionItem();
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockItemRepo.findOne.mockResolvedValue(item);
      mockItemRepo.save.mockResolvedValue(item);
      mockOrderRepo.save.mockResolvedValue(order);

      await service.reportMissing({ completionOrderId: 1, itemIds: [1], userId: 1 });

      expect(item.notes).toBe('Brak materiału');
    });

    it('should skip items that are not found', async () => {
      const order = createMockCompletionOrder();
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockItemRepo.findOne.mockResolvedValue(null);
      mockOrderRepo.save.mockResolvedValue(order);

      await service.reportMissing({ completionOrderId: 1, itemIds: [999], userId: 1 });

      expect(mockItemRepo.save).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('approveCompletion', () => {
    it('should throw when order not found', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);

      await expect(
        service.approveCompletion({ completionOrderId: 99, partial: false, userId: 1 })
      ).rejects.toThrow('Zlecenie kompletacji nie znalezione');
    });

    it('should throw when not all items are processed', async () => {
      const items = [
        createMockCompletionItem({ status: CompletionItemStatus.PENDING }),
        createMockCompletionItem({ id: 2, status: CompletionItemStatus.SCANNED }),
      ];
      const order = createMockCompletionOrder({ items });
      mockOrderRepo.findOne.mockResolvedValue(order);

      await expect(
        service.approveCompletion({ completionOrderId: 1, partial: false, userId: 1 })
      ).rejects.toThrow('Nie wszystkie pozycje zostały przetworzone');
    });

    it('should set COMPLETED status for full completion', async () => {
      const items = [
        createMockCompletionItem({ status: CompletionItemStatus.SCANNED }),
        createMockCompletionItem({ id: 2, status: CompletionItemStatus.SCANNED }),
      ];
      const order = createMockCompletionOrder({
        items,
        subsystem: { id: 1, status: SubsystemStatus.IN_COMPLETION } as any,
        subsystemId: 1,
      });
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockOrderRepo.save.mockResolvedValue(order);
      mockSubsystemRepo.save.mockResolvedValue(order.subsystem);

      const result = await service.approveCompletion({
        completionOrderId: 1,
        partial: false,
        userId: 1,
      });

      expect(result.status).toBe(CompletionOrderStatus.COMPLETED);
      expect(result.completedAt).toBeDefined();
    });

    it('should set WAITING_DECISION for partial completion with missing items', async () => {
      const items = [
        createMockCompletionItem({ status: CompletionItemStatus.SCANNED }),
        createMockCompletionItem({ id: 2, status: CompletionItemStatus.MISSING }),
      ];
      const order = createMockCompletionOrder({ items, subsystem: null as any });
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockOrderRepo.save.mockResolvedValue(order);

      const result = await service.approveCompletion({
        completionOrderId: 1,
        partial: true,
        notes: 'Some items missing',
        userId: 5,
      });

      expect(result.status).toBe(CompletionOrderStatus.WAITING_DECISION);
      expect(result.decisionBy).toBe(5);
    });

    it('should set COMPLETED for partial=false when all items are scanned', async () => {
      const items = [
        createMockCompletionItem({ status: CompletionItemStatus.SCANNED }),
        createMockCompletionItem({ id: 2, status: CompletionItemStatus.SCANNED }),
      ];
      const order = createMockCompletionOrder({ items, subsystem: null as any });
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockOrderRepo.save.mockResolvedValue(order);

      const result = await service.approveCompletion({
        completionOrderId: 1,
        partial: false,
        userId: 1,
      });

      expect(result.status).toBe(CompletionOrderStatus.COMPLETED);
    });
  });

  // -------------------------------------------------------------------------
  describe('createPrefabricationTask', () => {
    it('should throw when order not found', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);

      await expect(service.createPrefabricationTask(99, 1)).rejects.toThrow(
        'Zlecenie kompletacji nie znalezione'
      );
    });

    it('should throw when order is not completed', async () => {
      const order = createMockCompletionOrder({ status: CompletionOrderStatus.IN_PROGRESS });
      mockOrderRepo.findOne.mockResolvedValue(order);

      await expect(service.createPrefabricationTask(1, 1)).rejects.toThrow(
        'Zlecenie kompletacji nie jest zakończone'
      );
    });

    it('should return existing prefab task if already exists', async () => {
      const order = createMockCompletionOrder({ status: CompletionOrderStatus.COMPLETED });
      const existingTask = { id: 5, completionOrderId: 1 };
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockPrefabTaskRepo.findOne.mockResolvedValue(existingTask);

      const result = await service.createPrefabricationTask(1, 1);

      expect(mockPrefabTaskRepo.create).not.toHaveBeenCalled();
      expect(result).toBe(existingTask);
    });

    it('should create a new prefab task', async () => {
      const order = createMockCompletionOrder({
        status: CompletionOrderStatus.COMPLETED,
        subsystemId: 3,
        subsystem: { id: 3 } as any,
      });
      const prefabTask = { id: 1, completionOrderId: 1, subsystemId: 3 };
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockPrefabTaskRepo.findOne.mockResolvedValue(null);
      mockPrefabTaskRepo.create.mockReturnValue(prefabTask);
      mockPrefabTaskRepo.save.mockResolvedValue(prefabTask);

      const result = await service.createPrefabricationTask(1, 2);

      expect(mockPrefabTaskRepo.create).toHaveBeenCalledWith({
        completionOrderId: 1,
        subsystemId: 3,
        assignedToId: 2,
        status: PrefabricationTaskStatus.CREATED,
        ipMatrixReceived: false,
        materialsReceived: true,
      });
      expect(mockPrefabTaskRepo.save).toHaveBeenCalledWith(prefabTask);
      expect(result).toBe(prefabTask);
    });
  });
});
