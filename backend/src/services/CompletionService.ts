// src/services/CompletionService.ts
// Serwis zarządzania kompletacją materiałów

import { AppDataSource } from '../config/database';
import { CompletionOrder, CompletionOrderStatus } from '../entities/CompletionOrder';
import { CompletionItem, CompletionItemStatus } from '../entities/CompletionItem';
import { WorkflowGeneratedBom } from '../entities/WorkflowGeneratedBom';
import { Pallet, PalletStatus } from '../entities/Pallet';
import { Subsystem, SubsystemStatus } from '../entities/Subsystem';
import { PrefabricationTask, PrefabricationTaskStatus } from '../entities/PrefabricationTask';
import { User } from '../entities/User';
import { SubsystemTaskService } from './SubsystemTaskService';
import { TaskWorkflowStatus } from '../entities/SubsystemTask';
import { serverLogger } from '../utils/logger';
import NotificationService from './NotificationService';
import { TaskMaterial } from '../entities/TaskMaterial';
import { Task } from '../entities/Task';
import { WarehouseStock } from '../entities/WarehouseStock';

export interface CreateCompletionOrderParams {
  subsystemId: number;
  generatedBomId: number;
  assignedToId: number;
}

export interface CreateCompletionOrderFromTaskMaterialsParams {
  taskId: number;
  taskNumber: string;
  subsystemId: number;
  assignedToId: number;
  taskMaterials: TaskMaterial[];
}

export interface ScanMaterialParams {
  completionOrderId: number;
  barcode: string;
  serialNumber?: string;
  quantity?: number;
  userId: number;
}

export interface ReportMissingParams {
  completionOrderId: number;
  itemIds: number[];
  notes?: string;
  userId: number;
}

export interface ApproveCompletionParams {
  completionOrderId: number;
  partial: boolean;
  notes?: string;
  userId: number;
}

export class CompletionService {
  /**
   * Tworzy zlecenie kompletacji (krok 1.6)
   */
  async createCompletionOrder(params: CreateCompletionOrderParams): Promise<CompletionOrder> {
    const completionOrderRepo = AppDataSource.getRepository(CompletionOrder);
    const completionItemRepo = AppDataSource.getRepository(CompletionItem);
    const subsystemRepo = AppDataSource.getRepository(Subsystem);
    const bomRepo = AppDataSource.getRepository(WorkflowGeneratedBom);
    const userRepo = AppDataSource.getRepository(User);

    // Walidacja
    const subsystem = await subsystemRepo.findOne({
      where: { id: params.subsystemId }
    });

    if (!subsystem) {
      throw new Error('Podsystem nie znaleziony');
    }

    const bom = await bomRepo.findOne({
      where: { id: params.generatedBomId },
      relations: ['items']
    });

    if (!bom) {
      throw new Error('BOM nie znaleziony');
    }

    if (bom.subsystemId !== params.subsystemId) {
      throw new Error('BOM nie należy do tego podsystemu');
    }

    const user = await userRepo.findOne({
      where: { id: params.assignedToId }
    });

    if (!user) {
      throw new Error('Użytkownik nie znaleziony');
    }

    // Sprawdź czy już nie istnieje
    const existing = await completionOrderRepo.findOne({
      where: { subsystemId: params.subsystemId }
    });

    if (existing) {
      throw new Error('Zlecenie kompletacji dla tego podsystemu już istnieje');
    }

    // Utwórz zlecenie
    const order = completionOrderRepo.create({
      subsystemId: params.subsystemId,
      generatedBomId: params.generatedBomId,
      assignedToId: params.assignedToId,
      status: CompletionOrderStatus.CREATED
    });

    await completionOrderRepo.save(order);

    // Utwórz pozycje kompletacji na podstawie BOM
    const items: CompletionItem[] = [];

    for (const bomItem of bom.items) {
      const item = completionItemRepo.create({
        completionOrderId: order.id,
        bomItemId: bomItem.id,
        generatedBomItemId: bomItem.id,
        expectedQuantity: bomItem.quantity,
        scannedQuantity: 0,
        status: CompletionItemStatus.PENDING
      });
      items.push(item);
    }

    await completionItemRepo.save(items);

    // Przelicz rezerwacje w magazynie dla nowego zlecenia
    try {
      await this.recalculateAllReservationsForOrder(order.id);
    } catch (reservationError) {
      serverLogger.warn(`Nie udało się przeliczyć rezerwacji dla zlecenia #${order.id}: ${reservationError}`);
    }

    // Aktualizuj status podsystemu
    subsystem.status = SubsystemStatus.IN_COMPLETION;
    await subsystemRepo.save(subsystem);

    // Aktualizuj statusy zadań
    const taskService = new SubsystemTaskService();
    await taskService.updateStatusForSubsystem(
      subsystem.id,
      TaskWorkflowStatus.COMPLETION_ASSIGNED,
      { 
        completionOrderId: order.id,
        completionStartedAt: new Date()
      }
    );

    serverLogger.info(`Utworzono zlecenie kompletacji #${order.id} dla podsystemu ${subsystem.subsystemNumber}`);

    // Powiadom pracownika o przypisaniu zlecenia
    try {
      await NotificationService.notifyNewCompletionTask(order.id);
    } catch (notifError) {
      serverLogger.warn(`Nie udało się wysłać powiadomienia o zleceniu kompletacji #${order.id}: ${notifError}`);
    }

    return order;
  }

  /**
   * Tworzy zlecenie kompletacji na podstawie TaskMaterial (nowy system BOM)
   */
  async createCompletionOrderFromTaskMaterials(
    params: CreateCompletionOrderFromTaskMaterialsParams
  ): Promise<CompletionOrder> {
    const completionOrderRepo = AppDataSource.getRepository(CompletionOrder);
    const completionItemRepo = AppDataSource.getRepository(CompletionItem);
    const subsystemRepo = AppDataSource.getRepository(Subsystem);

    const subsystem = await subsystemRepo.findOne({
      where: { id: params.subsystemId }
    });

    if (!subsystem) {
      throw new Error('Podsystem nie znaleziony');
    }

    // Sprawdź czy zlecenie już istnieje dla tego podsystemu
    const existingOrder = await completionOrderRepo.findOne({
      where: { subsystemId: params.subsystemId }
    });

    if (existingOrder) {
      serverLogger.info(`Zlecenie kompletacji dla subsystemu ${subsystem.subsystemNumber} już istnieje`);
      return existingOrder;
    }

    // Utwórz zlecenie kompletacji (generatedBomId = null dla nowego systemu BOM)
    const order = completionOrderRepo.create({
      subsystemId: params.subsystemId,
      generatedBomId: null,
      taskNumber: params.taskNumber,
      assignedToId: params.assignedToId,
      status: CompletionOrderStatus.CREATED
    });

    await completionOrderRepo.save(order);

    // Utwórz pozycje kompletacji na podstawie TaskMaterial
    const items: CompletionItem[] = [];

    for (const material of params.taskMaterials) {
      const item = completionItemRepo.create({
        completionOrderId: order.id,
        bomItemId: null,
        generatedBomItemId: null,
        taskMaterialId: material.id,
        expectedQuantity: Math.floor(Number(material.plannedQuantity) || 0),
        scannedQuantity: 0,
        status: CompletionItemStatus.PENDING
      });
      items.push(item);
    }

    await completionItemRepo.save(items);

    // Przelicz rezerwacje w magazynie dla nowego zlecenia
    try {
      await this.recalculateAllReservationsForOrder(order.id);
    } catch (reservationError) {
      serverLogger.warn(`Nie udało się przeliczyć rezerwacji dla zlecenia #${order.id}: ${reservationError}`);
    }

    // Aktualizuj status podsystemu
    subsystem.status = SubsystemStatus.IN_COMPLETION;
    await subsystemRepo.save(subsystem);

    // Aktualizuj statusy zadań
    const taskService = new SubsystemTaskService();
    await taskService.updateStatusForSubsystem(
      subsystem.id,
      TaskWorkflowStatus.COMPLETION_ASSIGNED,
      {
        completionOrderId: order.id,
        completionStartedAt: new Date()
      }
    );

    serverLogger.info(`Utworzono zlecenie kompletacji #${order.id} z TaskMaterial dla podsystemu ${subsystem.subsystemNumber}`);

    // Powiadom pracownika o przypisaniu zlecenia
    try {
      await NotificationService.notifyNewCompletionTask(order.id);
    } catch (notifError) {
      serverLogger.warn(`Nie udało się wysłać powiadomienia o zleceniu kompletacji #${order.id}: ${notifError}`);
    }

    return order;
  }

  /**
   * Tworzy paletę dla zlecenia
   */
  async createPallet(completionOrderId: number, palletNumber: string): Promise<Pallet> {
    const palletRepo = AppDataSource.getRepository(Pallet);
    const orderRepo = AppDataSource.getRepository(CompletionOrder);

    const order = await orderRepo.findOne({
      where: { id: completionOrderId }
    });

    if (!order) {
      throw new Error('Zlecenie kompletacji nie znalezione');
    }

    // Sprawdź czy paleta już istnieje
    const existing = await palletRepo.findOne({
      where: { 
        palletNumber,
        completionOrderId
      }
    });

    if (existing) {
      return existing;
    }

    const pallet = palletRepo.create({
      palletNumber,
      completionOrderId,
      status: PalletStatus.OPEN
    });

    await palletRepo.save(pallet);

    serverLogger.info(`Utworzono paletę ${palletNumber} dla zlecenia #${completionOrderId}`);

    return pallet;
  }

  /**
   * Skanowanie materiału z walidacją numerów seryjnych (krok 2.3)
   */
  async scanMaterial(params: ScanMaterialParams): Promise<CompletionItem> {
    const orderRepo = AppDataSource.getRepository(CompletionOrder);
    const itemRepo = AppDataSource.getRepository(CompletionItem);

    const order = await orderRepo.findOne({
      where: { id: params.completionOrderId },
      relations: ['items', 'items.bomItem', 'items.bomItem.templateItem', 'items.taskMaterial']
    });

    if (!order) {
      throw new Error('Zlecenie kompletacji nie znalezione');
    }

    if (order.status === CompletionOrderStatus.COMPLETED) {
      throw new Error('Zlecenie już zakończone');
    }

    // Znajdź pasującą pozycję (BOM lub TaskMaterial)
    const matchingItem = order.items.find(item => {
      const templateItem = item.bomItem?.templateItem;
      const bomMatches =
        templateItem?.partNumber === params.barcode ||
        item.bomItem?.partNumber === params.barcode;

      const taskMaterial = item.taskMaterial as TaskMaterial | undefined;
      const taskMaterialMatches =
        !!taskMaterial &&
        taskMaterial.materialName === params.barcode;

      const statusAllowed =
        item.status === CompletionItemStatus.PENDING ||
        item.status === CompletionItemStatus.PARTIAL;

      return (bomMatches || taskMaterialMatches) && statusAllowed;
    });

    if (!matchingItem) {
      throw new Error('Nie znaleziono pozycji BOM pasującej do zeskanowanego kodu');
    }

    // Aktualizuj pozycję
    const quantity = params.quantity || 1;
    matchingItem.scannedQuantity += quantity;
    matchingItem.scannedBarcode = params.barcode;
    matchingItem.scannedBy = params.userId;
    matchingItem.scannedAt = new Date();

    // Walidacja numeru seryjnego – sprawdź czy element wymaga S/N
    const templateItem = matchingItem.bomItem?.templateItem;
    const requiresSerial =
      templateItem?.requiresSerialNumber ||
      matchingItem.taskMaterial?.requiresSerialNumber ||
      false;

    if (requiresSerial && !params.serialNumber) {
      throw new Error('Ten materiał wymaga podania numeru seryjnego');
    }

    // Waliduj numer seryjny jeśli podany
    if (params.serialNumber) {
      // Sprawdź unikalność
      const existingSerial = await itemRepo.findOne({
        where: {
          serialNumber: params.serialNumber
        }
      });

      if (existingSerial && existingSerial.id !== matchingItem.id) {
        throw new Error(`Numer seryjny ${params.serialNumber} już został użyty`);
      }

      matchingItem.serialNumber = params.serialNumber;
    }

    // Określ status
    if (matchingItem.scannedQuantity >= matchingItem.expectedQuantity) {
      matchingItem.status = CompletionItemStatus.SCANNED;
      matchingItem.scannedQuantity = matchingItem.expectedQuantity; // Nie przekraczaj oczekiwanej ilości
    } else {
      matchingItem.status = CompletionItemStatus.PARTIAL;
    }

    await itemRepo.save(matchingItem);

    // Aktualizuj status zlecenia
    if (order.status === CompletionOrderStatus.CREATED) {
      order.status = CompletionOrderStatus.IN_PROGRESS;
      await orderRepo.save(order);

      // Aktualizuj statusy zadań
      const taskService = new SubsystemTaskService();
      const tasks = await taskService.getTasksBySubsystem(order.subsystemId);
      for (const task of tasks) {
        if (task.status === TaskWorkflowStatus.COMPLETION_ASSIGNED) {
          await taskService.updateStatus(
            task.id,
            TaskWorkflowStatus.COMPLETION_IN_PROGRESS
          );
        }
      }

      // Synchronizuj status zadania
      if (order.taskNumber) {
        try {
          await this.syncTaskStatus(order.taskNumber, CompletionOrderStatus.IN_PROGRESS);
        } catch (syncError) {
          serverLogger.warn(`Nie udało się zsynchronizować statusu zadania ${order.taskNumber}: ${syncError}`);
        }
      }
    }

    serverLogger.info(`Zeskanowano materiał: ${params.barcode} dla zlecenia #${params.completionOrderId} (${quantity} szt)`);

    return matchingItem;
  }

  /**
   * Zgłaszanie braków materiałowych (krok 2.4)
   */
  async reportMissing(params: ReportMissingParams): Promise<void> {
    const itemRepo = AppDataSource.getRepository(CompletionItem);
    const orderRepo = AppDataSource.getRepository(CompletionOrder);

    const order = await orderRepo.findOne({
      where: { id: params.completionOrderId }
    });

    if (!order) {
      throw new Error('Zlecenie kompletacji nie znalezione');
    }

    // Oznacz pozycje jako brakujące
    for (const itemId of params.itemIds) {
      const item = await itemRepo.findOne({
        where: { 
          id: itemId,
          completionOrderId: params.completionOrderId
        }
      });

      if (item) {
        item.status = CompletionItemStatus.MISSING;
        item.notes = params.notes || 'Brak materiału';
        await itemRepo.save(item);
      }
    }

    // Aktualizuj status zlecenia
    order.status = CompletionOrderStatus.WAITING_FOR_MATERIALS;
    await orderRepo.save(order);

    // Synchronizuj status zadania
    if (order.taskNumber) {
      try {
        await this.syncTaskStatus(order.taskNumber, CompletionOrderStatus.WAITING_FOR_MATERIALS);
      } catch (syncError) {
        serverLogger.warn(`Nie udało się zsynchronizować statusu zadania ${order.taskNumber}: ${syncError}`);
      }
    }

    serverLogger.warn(`Zgłoszono braki materiałowe w zleceniu #${params.completionOrderId}: ${params.itemIds.length} pozycji`);
  }

  /**
   * Zatwierdzenie kompletacji pełnej (krok 2.6a) lub częściowej (krok 2.6b)
   */
  async approveCompletion(params: ApproveCompletionParams): Promise<CompletionOrder> {
    const orderRepo = AppDataSource.getRepository(CompletionOrder);
    const subsystemRepo = AppDataSource.getRepository(Subsystem);

    const order = await orderRepo.findOne({
      where: { id: params.completionOrderId },
      relations: ['items', 'subsystem']
    });

    if (!order) {
      throw new Error('Zlecenie kompletacji nie znalezione');
    }

    // Sprawdź status pozycji
    const totalItems = order.items.length;
    const completedItems = order.items.filter(
      item => item.status === CompletionItemStatus.SCANNED
    ).length;
    const missingItems = order.items.filter(
      item => item.status === CompletionItemStatus.MISSING
    ).length;

    // Określ czy kompletacja jest pełna czy częściowa
    const isFullCompletion = completedItems === totalItems;
    const isPartialCompletion = completedItems > 0 && completedItems + missingItems === totalItems;

    if (!isFullCompletion && !isPartialCompletion) {
      throw new Error('Nie wszystkie pozycje zostały przetworzone');
    }

    // Aktualizuj zlecenie
    if (params.partial && isPartialCompletion) {
      order.status = CompletionOrderStatus.WAITING_DECISION;
      order.decisionNotes = params.notes || '';
      order.decisionBy = params.userId;
      order.decisionAt = new Date();
    } else if (isFullCompletion || params.partial) {
      order.status = CompletionOrderStatus.COMPLETED;
      order.completedAt = new Date();

      // Aktualizuj status podsystemu
      if (order.subsystem) {
        order.subsystem.status = SubsystemStatus.IN_PREFABRICATION;
        await subsystemRepo.save(order.subsystem);
      }

      // Aktualizuj statusy zadań
      const taskService = new SubsystemTaskService();
      await taskService.updateStatusForSubsystem(
        order.subsystemId,
        TaskWorkflowStatus.COMPLETION_COMPLETED,
        { 
          completionCompletedAt: new Date()
        }
      );
    }

    await orderRepo.save(order);

    serverLogger.info(`Zatwierdzono kompletację zlecenia #${order.id} (${params.partial ? 'częściowa' : 'pełna'})`);

    // Przelicz rezerwacje po zmianie statusu na COMPLETED lub WAITING_DECISION
    if (order.status === CompletionOrderStatus.COMPLETED) {
      try {
        await this.recalculateAllReservationsForOrder(order.id);
      } catch (reservationError) {
        serverLogger.warn(`Nie udało się przeliczyć rezerwacji dla zlecenia #${order.id}: ${reservationError}`);
      }
    }

    // Synchronizuj status zadania
    if (order.taskNumber) {
      try {
        await this.syncTaskStatus(order.taskNumber, order.status);
      } catch (syncError) {
        serverLogger.warn(`Nie udało się zsynchronizować statusu zadania ${order.taskNumber}: ${syncError}`);
      }
    }

    // Powiadom o zakończeniu kompletacji
    if (order.status === CompletionOrderStatus.COMPLETED || order.status === CompletionOrderStatus.WAITING_DECISION) {
      try {
        await NotificationService.notifyCompletionFinished(order.id);
      } catch (notifError) {
        serverLogger.warn(`Nie udało się wysłać powiadomienia o zakończeniu kompletacji #${order.id}: ${notifError}`);
      }
    }

    return order;
  }

  /**
   * Automatyczne tworzenie zadania prefabrykacji po zakończeniu (krok 2.7)
   */
  async createPrefabricationTask(completionOrderId: number, assignedToId: number): Promise<PrefabricationTask> {
    const orderRepo = AppDataSource.getRepository(CompletionOrder);
    const prefabTaskRepo = AppDataSource.getRepository(PrefabricationTask);

    const order = await orderRepo.findOne({
      where: { id: completionOrderId },
      relations: ['subsystem']
    });

    if (!order) {
      throw new Error('Zlecenie kompletacji nie znalezione');
    }

    if (order.status !== CompletionOrderStatus.COMPLETED) {
      throw new Error('Zlecenie kompletacji nie jest zakończone');
    }

    // Sprawdź czy zadanie już istnieje
    const existing = await prefabTaskRepo.findOne({
      where: { completionOrderId }
    });

    if (existing) {
      return existing;
    }

    // Utwórz zadanie prefabrykacji
    const prefabTask = prefabTaskRepo.create({
      completionOrderId,
      subsystemId: order.subsystemId,
      assignedToId,
      status: PrefabricationTaskStatus.CREATED,
      ipMatrixReceived: false,
      materialsReceived: true
    });

    await prefabTaskRepo.save(prefabTask);

    // Aktualizuj statusy zadań
    const taskService = new SubsystemTaskService();
    await taskService.updateStatusForSubsystem(
      order.subsystemId,
      TaskWorkflowStatus.PREFABRICATION_ASSIGNED,
      { 
        prefabricationTaskId: prefabTask.id,
        prefabricationStartedAt: new Date()
      }
    );

    serverLogger.info(`Utworzono zadanie prefabrykacji #${prefabTask.id} dla zlecenia #${completionOrderId}`);

    return prefabTask;
  }

  /**
   * Pobiera szczegóły zlecenia kompletacji
   */
  async getCompletionOrder(id: number) {
    const orderRepo = AppDataSource.getRepository(CompletionOrder);

    const order = await orderRepo.findOne({
      where: { id },
      relations: [
        'subsystem',
        'subsystem.contract',
        'generatedBom',
        'assignedTo',
        'items',
        'items.bomItem',
        'items.bomItem.templateItem',
        'items.taskMaterial',
        'items.pallet',
        'pallets'
      ]
    });

    if (!order) {
      throw new Error('Zlecenie kompletacji nie znalezione');
    }

    return order;
  }

  /**
   * Synchronizuje status zadania (Task) na podstawie statusu zlecenia kompletacji
   */
  private async syncTaskStatus(taskNumber: string, completionStatus: CompletionOrderStatus): Promise<void> {
    const taskRepository = AppDataSource.getRepository(Task);

    const task = await taskRepository.findOne({
      where: { taskNumber }
    });

    if (!task) {
      serverLogger.warn(`Nie znaleziono zadania ${taskNumber} do synchronizacji statusu`);
      return;
    }

    const statusMap: Record<CompletionOrderStatus, string> = {
      [CompletionOrderStatus.CREATED]: 'completion_assigned',
      [CompletionOrderStatus.IN_PROGRESS]: 'in_completion',
      [CompletionOrderStatus.WAITING_FOR_MATERIALS]: 'waiting_materials',
      [CompletionOrderStatus.WAITING_DECISION]: 'waiting_decision',
      [CompletionOrderStatus.PARTIAL_PENDING_APPROVAL]: 'partial_pending_approval',
      [CompletionOrderStatus.PARTIAL_ISSUED]: 'partial_issued',
      [CompletionOrderStatus.COMPLETED]: 'completion_completed',
      [CompletionOrderStatus.CANCELLED]: 'cancelled'
    };

    const newStatus = statusMap[completionStatus];
    if (newStatus && task.status !== newStatus) {
      task.status = newStatus;
      await taskRepository.save(task);
      serverLogger.info(`Zaktualizowano status zadania ${taskNumber} na ${newStatus}`);
    }
  }

  /**
   * Pobiera listę zleceń kompletacji
   */
  async listCompletionOrders(filters?: {
    status?: CompletionOrderStatus;
    assignedToId?: number;
    subsystemId?: number;
  }) {
    const orderRepo = AppDataSource.getRepository(CompletionOrder);

    const queryBuilder = orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.subsystem', 'subsystem')
      .leftJoinAndSelect('order.assignedTo', 'assignedTo')
      .leftJoinAndSelect('order.items', 'items')
      .orderBy('order.createdAt', 'DESC');

    if (filters?.status) {
      queryBuilder.andWhere('order.status = :status', { status: filters.status });
    }

    if (filters?.assignedToId) {
      queryBuilder.andWhere('order.assignedToId = :assignedToId', { assignedToId: filters.assignedToId });
    }

    if (filters?.subsystemId) {
      queryBuilder.andWhere('order.subsystemId = :subsystemId', { subsystemId: filters.subsystemId });
    }

    return await queryBuilder.getMany();
  }

  /**
   * Wzbogaca pozycje kompletacji o dane z WarehouseStock.
   * Dopasowanie: catalogNumber → WarehouseStock.catalogNumber, fallback po materialName.
   */
  async enrichItemsWithWarehouseData(items: CompletionItem[]): Promise<CompletionItem[]> {
    if (items.length === 0) return items;

    const warehouseStockRepo = AppDataSource.getRepository(WarehouseStock);

    // Collect catalog numbers and material names for lookup
    const catalogNumbers = items
      .map(item =>
        item.taskMaterial?.bomTemplate?.catalogNumber ||
        item.taskMaterial?.bomTemplate?.partNumber ||
        item.bomItem?.partNumber ||
        null
      )
      .filter((cn): cn is string => !!cn);

    const materialNames = items
      .map(item => item.taskMaterial?.materialName || item.bomItem?.itemName || null)
      .filter((mn): mn is string => !!mn);

    const stocksByCatalog: Record<string, WarehouseStock> = {};
    const stocksByName: Record<string, WarehouseStock> = {};

    if (catalogNumbers.length > 0) {
      const stocks = await warehouseStockRepo
        .createQueryBuilder('ws')
        .where('ws.catalogNumber IN (:...catalogNumbers)', { catalogNumbers })
        .getMany();
      for (const s of stocks) {
        stocksByCatalog[s.catalogNumber] = s;
      }
    }

    if (materialNames.length > 0) {
      const stocks = await warehouseStockRepo
        .createQueryBuilder('ws')
        .where('ws.materialName IN (:...materialNames)', { materialNames })
        .getMany();
      for (const s of stocks) {
        if (!stocksByName[s.materialName]) {
          stocksByName[s.materialName] = s;
        }
      }
    }

    return items.map(item => {
      const catalogNumber =
        item.taskMaterial?.bomTemplate?.catalogNumber ||
        item.taskMaterial?.bomTemplate?.partNumber ||
        item.bomItem?.partNumber ||
        null;
      const materialName = item.taskMaterial?.materialName || item.bomItem?.itemName || null;

      const stock =
        (catalogNumber ? stocksByCatalog[catalogNumber] : null) ||
        (materialName ? stocksByName[materialName] : null) ||
        null;

      if (stock) {
        item.warehouseStockId = stock.id;
        item.catalogNumber = catalogNumber ?? stock.catalogNumber;
        item.stockQuantity = Number(stock.quantityAvailable);
        item.warehouseLocation = stock.warehouseLocation ?? null;
        item.isSerialized = stock.isSerialized;
      } else {
        item.warehouseStockId = null;
        item.catalogNumber = catalogNumber;
        item.stockQuantity = null;
        item.warehouseLocation = null;
      }

      return item;
    });
  }

  /**
   * Przelicza pole quantity_reserved w WarehouseStock dla danego materiału.
   * Sumuje expectedQuantity ze wszystkich aktywnych zleceń kompletacji.
   */
  async recalculateReservations(warehouseStockId: number): Promise<void> {
    const warehouseStockRepo = AppDataSource.getRepository(WarehouseStock);
    const completionItemRepo = AppDataSource.getRepository(CompletionItem);

    const stock = await warehouseStockRepo.findOne({ where: { id: warehouseStockId } });
    if (!stock) return;

    const activeStatuses = [
      CompletionOrderStatus.CREATED,
      CompletionOrderStatus.IN_PROGRESS,
      CompletionOrderStatus.WAITING_DECISION,
      CompletionOrderStatus.PARTIAL_PENDING_APPROVAL
    ] as string[];

    const result = await completionItemRepo
      .createQueryBuilder('ci')
      .select('COALESCE(SUM(ci.expectedQuantity), 0)', 'total')
      .innerJoin('ci.completionOrder', 'co')
      .where('co.status IN (:...statuses)', { statuses: activeStatuses })
      .andWhere('ci.warehouseStockId = :stockId', { stockId: warehouseStockId })
      .getRawOne<{ total: string }>();

    const reserved = Number(result?.total ?? 0);
    stock.quantityReserved = reserved;
    await warehouseStockRepo.save(stock);

    serverLogger.info(`Zaktualizowano rezerwacje dla ${stock.catalogNumber}: ${reserved}`);
  }

  /**
   * Przelicza rezerwacje dla wszystkich materiałów powiązanych z danym zleceniem.
   * Jeśli pozycje nie mają jeszcze ustawionego warehouseStockId, dopasowuje je do magazynu
   * po numerze katalogowym lub nazwie materiału i zapisuje powiązanie do bazy.
   */
  async recalculateAllReservationsForOrder(orderId: number): Promise<void> {
    const completionItemRepo = AppDataSource.getRepository(CompletionItem);

    const items = await completionItemRepo.find({
      where: { completionOrderId: orderId },
      relations: ['completionOrder', 'taskMaterial', 'taskMaterial.bomTemplate', 'bomItem']
    });

    // Link items without warehouseStockId to their warehouse stocks and persist
    const needsLink = items.filter(i => !i.warehouseStockId);
    if (needsLink.length > 0) {
      const enriched = await this.enrichItemsWithWarehouseData(needsLink);
      const toSave = enriched.filter(i => i.warehouseStockId != null);
      if (toSave.length > 0) {
        await Promise.all(
          toSave.map(i => completionItemRepo.update(i.id, { warehouseStockId: i.warehouseStockId }))
        );
        // Update local references so stockIds collection below picks them up
        const itemsById = new Map(items.map(i => [i.id, i]));
        for (const ei of toSave) {
          const orig = itemsById.get(ei.id);
          if (orig) orig.warehouseStockId = ei.warehouseStockId;
        }
      }
    }

    // Collect unique warehouseStockIds
    const stockIds = new Set<number>();
    for (const item of items) {
      if (item.warehouseStockId) {
        stockIds.add(item.warehouseStockId);
      }
    }

    for (const stockId of stockIds) {
      await this.recalculateReservations(stockId);
    }
  }

  /**
   * Zgłoszenie prośby o częściowe wydanie materiałów
   */
  async requestPartialIssue(orderId: number, userId: number, issuedQuantities?: Record<number, number>, notes?: string): Promise<CompletionOrder> {
    const orderRepo = AppDataSource.getRepository(CompletionOrder);

    const order = await orderRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'subsystem', 'assignedTo']
    });

    if (!order) {
      throw new Error('Zlecenie kompletacji nie znalezione');
    }

    if (order.status !== CompletionOrderStatus.IN_PROGRESS && order.status !== CompletionOrderStatus.CREATED) {
      throw new Error(`Zlecenie ma status ${order.status} - nie można zgłosić prośby o częściowe wydanie`);
    }

    // Save issued quantities if provided
    if (issuedQuantities) {
      await this.saveIssuedQuantities(orderId, issuedQuantities);
    }

    order.status = CompletionOrderStatus.PARTIAL_PENDING_APPROVAL;
    order.decisionNotes = (notes || null) as unknown as string;
    order.decisionBy = userId;
    order.decisionAt = new Date();

    await orderRepo.save(order);

    serverLogger.info(`Zgłoszono prośbę o częściowe wydanie dla zlecenia #${orderId}`);

    // Sync task status
    if (order.taskNumber) {
      await this.syncTaskStatus(order.taskNumber, CompletionOrderStatus.PARTIAL_PENDING_APPROVAL);
    }

    return order;
  }

  /**
   * Akceptacja częściowego wydania przez kierownika
   */
  async approvePartialIssue(orderId: number, managerId: number, notes?: string): Promise<CompletionOrder> {
    const orderRepo = AppDataSource.getRepository(CompletionOrder);
    const subsystemRepo = AppDataSource.getRepository(Subsystem);

    const order = await orderRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'subsystem', 'assignedTo']
    });

    if (!order) {
      throw new Error('Zlecenie kompletacji nie znalezione');
    }

    if (order.status !== CompletionOrderStatus.PARTIAL_PENDING_APPROVAL) {
      throw new Error(`Zlecenie ma status ${order.status} - nie można zatwierdzić częściowego wydania`);
    }

    order.status = CompletionOrderStatus.PARTIAL_ISSUED;
    order.completedAt = new Date();
    order.completedById = managerId;
    order.decisionBy = managerId;
    order.decisionAt = new Date();
    if (notes) {
      order.decisionNotes = notes;
    }

    await orderRepo.save(order);

    serverLogger.info(`Zatwierdzono częściowe wydanie dla zlecenia #${orderId} przez użytkownika #${managerId}`);

    // Sync task status
    if (order.taskNumber) {
      await this.syncTaskStatus(order.taskNumber, CompletionOrderStatus.PARTIAL_ISSUED);
    }

    // Recalculate reservations
    try {
      await this.recalculateAllReservationsForOrder(order.id);
    } catch (err) {
      serverLogger.warn(`Nie udało się przeliczyć rezerwacji dla zlecenia #${order.id}: ${err}`);
    }

    return order;
  }

  /**
   * Ponowne otwarcie częściowo wydanego zlecenia (dokończenie kompletacji)
   */
  async reopenPartialOrder(orderId: number, userId: number): Promise<CompletionOrder> {
    const orderRepo = AppDataSource.getRepository(CompletionOrder);

    const order = await orderRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'subsystem']
    });

    if (!order) {
      throw new Error('Zlecenie kompletacji nie znalezione');
    }

    if (order.status !== CompletionOrderStatus.PARTIAL_ISSUED && order.status !== CompletionOrderStatus.PARTIAL_PENDING_APPROVAL) {
      throw new Error(`Zlecenie ma status ${order.status} - nie można ponownie otworzyć`);
    }

    order.status = CompletionOrderStatus.IN_PROGRESS;
    order.completedAt = null as unknown as Date;
    order.completedById = null;

    await orderRepo.save(order);

    serverLogger.info(`Ponownie otwarto zlecenie #${orderId} przez użytkownika #${userId}`);

    if (order.taskNumber) {
      await this.syncTaskStatus(order.taskNumber, CompletionOrderStatus.IN_PROGRESS);
    }

    return order;
  }

  /**
   * Pobieranie zakończonych zleceń (COMPLETED i PARTIAL_ISSUED)
   */
  async getCompletedOrders(filters?: {
    assignedToId?: number;
    subsystemId?: number;
  }) {
    const orderRepo = AppDataSource.getRepository(CompletionOrder);

    const queryBuilder = orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.subsystem', 'subsystem')
      .leftJoinAndSelect('order.assignedTo', 'assignedTo')
      .leftJoinAndSelect('order.completedBy', 'completedBy')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.status IN (:...statuses)', {
        statuses: [CompletionOrderStatus.COMPLETED, CompletionOrderStatus.PARTIAL_ISSUED]
      })
      .orderBy('order.completedAt', 'DESC');

    if (filters?.assignedToId) {
      queryBuilder.andWhere('order.assignedToId = :assignedToId', { assignedToId: filters.assignedToId });
    }

    if (filters?.subsystemId) {
      queryBuilder.andWhere('order.subsystemId = :subsystemId', { subsystemId: filters.subsystemId });
    }

    return await queryBuilder.getMany();
  }

  /**
   * Zapisywanie ilości wydanych dla pozycji nieserializowanych
   */
  async saveIssuedQuantities(orderId: number, quantities: Record<number, number>): Promise<void> {
    const completionItemRepo = AppDataSource.getRepository(CompletionItem);

    const items = await completionItemRepo.find({
      where: { completionOrderId: orderId },
      relations: ['taskMaterial', 'bomItem', 'bomItem.templateItem']
    });

    for (const item of items) {
      if (quantities[item.id] !== undefined) {
        const issuedQty = Math.max(0, quantities[item.id]);
        const expectedQty = Number(
          item.taskMaterial?.plannedQuantity ??
          item.bomItem?.quantity ??
          item.expectedQuantity ??
          0
        );
        item.issuedQuantity = issuedQty;

        // Only update status for non-serialized items; serialized items have
        // their status managed exclusively by saveItemSerials.
        const requiresSerial =
          item.taskMaterial?.requiresSerialNumber === true ||
          item.bomItem?.templateItem?.requiresSerialNumber === true;

        if (!requiresSerial) {
          if (issuedQty >= expectedQty && expectedQty > 0) {
            item.status = CompletionItemStatus.SCANNED;
          } else if (issuedQty > 0) {
            item.status = CompletionItemStatus.PARTIAL;
          } else {
            item.status = CompletionItemStatus.PENDING;
          }
        }

        await completionItemRepo.save(item);
      }
    }

    serverLogger.info(`Zapisano ilości wydane dla zlecenia #${orderId}`);
  }
}

export default new CompletionService();
