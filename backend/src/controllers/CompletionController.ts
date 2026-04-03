// src/controllers/CompletionController.ts
// Controller for completion/scanner functionality

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { CompletionOrder, CompletionOrderStatus, CompletionDecision } from '../entities/CompletionOrder';
import { CompletionItem, CompletionItemStatus } from '../entities/CompletionItem';
import { WorkflowGeneratedBomItem } from '../entities/WorkflowGeneratedBomItem';
import { Pallet } from '../entities/Pallet';
import { Task } from '../entities/Task';
import { TaskMaterial } from '../entities/TaskMaterial';
import { WarehouseStock } from '../entities/WarehouseStock';
import { SystemConfig } from '../entities/SystemConfig';
import { User } from '../entities/User';
import CompletionService from '../services/CompletionService';
import NotificationService from '../services/NotificationService';
import { serverLogger } from '../utils/logger';

/** Resolve the planned/expected quantity for a completion item from multiple possible sources */
function resolvePlannedQty(item: CompletionItem): number {
  return Number(item.taskMaterial?.plannedQuantity ?? item.bomItem?.quantity ?? item.expectedQuantity ?? 0);
}

export class CompletionController {
  /**
   * GET /api/completion/orders
   * List all completion orders
   */
  static async listOrders(req: Request, res: Response): Promise<void> {
    try {
      const { status, assignedTo } = req.query;
      const userId = req.userId;

      const completionOrderRepo = AppDataSource.getRepository(CompletionOrder);
      const queryBuilder = completionOrderRepo.createQueryBuilder('order')
        .leftJoinAndSelect('order.subsystem', 'subsystem')
        .leftJoinAndSelect('order.assignedTo', 'assignedTo')
        .leftJoinAndSelect('order.completedBy', 'completedBy')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('items.bomItem', 'bomItem')
        .orderBy('order.createdAt', 'DESC');

      // Filter by status if provided
      if (status) {
        queryBuilder.andWhere('order.status = :status', { status });
      }

      // Filter by assigned user if provided
      if (assignedTo) {
        queryBuilder.andWhere('order.assignedToId = :assignedTo', { assignedTo });
      } else if (!req.query.all) {
        // By default, show only orders assigned to current user
        queryBuilder.andWhere('order.assignedToId = :userId', { userId });
      }

      const orders = await queryBuilder.getMany();

      // Calculate progress for each order
      const ordersWithProgress = orders.map(order => {
        const totalItems = order.items.length;
        const scannedItems = order.items.filter(item => item.status === CompletionItemStatus.SCANNED).length;
        const missingItems = order.items.filter(item => item.status === CompletionItemStatus.MISSING).length;
        const partialItems = order.items.filter(item => item.status === CompletionItemStatus.PARTIAL).length;

        return {
          ...order,
          progress: {
            totalItems,
            scannedItems,
            missingItems,
            partialItems,
            pendingItems: totalItems - scannedItems - missingItems - partialItems,
            completionPercentage: totalItems > 0 ? Math.round((scannedItems / totalItems) * 100) : 0
          }
        };
      });

      res.json({
        success: true,
        data: ordersWithProgress
      });
    } catch (error) {
      serverLogger.error(`Error listing completion orders: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas pobierania zleceń kompletacji'
      });
    }
  }

  /**
   * GET /api/completion/orders/:id
   * Get single completion order with details
   */
  static async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const completionOrderRepo = AppDataSource.getRepository(CompletionOrder);
      const order = await completionOrderRepo
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.subsystem', 'subsystem')
        .leftJoinAndSelect('subsystem.contract', 'contract')
        .leftJoinAndSelect('contract.projectManager', 'projectManager')
        .leftJoinAndSelect('order.generatedBom', 'generatedBom')
        .leftJoinAndSelect('order.assignedTo', 'assignedTo')
        .leftJoinAndSelect('order.completedBy', 'completedBy')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('items.bomItem', 'bomItem')
        .leftJoinAndSelect('bomItem.templateItem', 'templateItem')
        .leftJoinAndSelect('items.taskMaterial', 'taskMaterial')
        .leftJoinAndSelect('taskMaterial.bomTemplate', 'bomTemplate')
        .leftJoinAndSelect('items.pallet', 'pallet')
        .where('order.id = :id', { id })
        .getOne();

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Zlecenie kompletacji nie znalezione'
        });
        return;
      }

      // Collect catalog numbers and material names for WarehouseStock lookup
      const catalogNumbers = order.items
        .map(item => item.taskMaterial?.bomTemplate?.catalogNumber || item.taskMaterial?.bomTemplate?.partNumber || item.bomItem?.partNumber)
        .filter((cn): cn is string => !!cn);

      const materialNames = order.items
        .map(item => item.taskMaterial?.materialName || item.bomItem?.itemName)
        .filter((mn): mn is string => !!mn);

      const stockByCatalog: Record<string, WarehouseStock> = {};
      const stockByName: Record<string, WarehouseStock> = {};

      if (catalogNumbers.length > 0) {
        const warehouseStockRepo = AppDataSource.getRepository(WarehouseStock);
        const stocks = await warehouseStockRepo.createQueryBuilder('ws')
          .where('ws.catalogNumber IN (:...catalogNumbers)', { catalogNumbers })
          .getMany();
        for (const s of stocks) {
          stockByCatalog[s.catalogNumber] = s;
        }
      }

      if (materialNames.length > 0) {
        const warehouseStockRepo = AppDataSource.getRepository(WarehouseStock);
        const stocks = await warehouseStockRepo.createQueryBuilder('ws')
          .where('ws.materialName IN (:...materialNames)', { materialNames })
          .getMany();
        for (const s of stocks) {
          if (!stockByName[s.materialName]) {
            stockByName[s.materialName] = s;
          }
        }
      }

      // Enrich items with resolved fields for the BOM table
      const newWarehouseLinks: { itemId: number; stockId: number }[] = [];
      const enrichedItems = order.items.map((item, index) => {
        const catalogNumber =
          item.taskMaterial?.bomTemplate?.catalogNumber ||
          item.taskMaterial?.bomTemplate?.partNumber ||
          item.bomItem?.partNumber ||
          null;
        const materialName = item.taskMaterial?.materialName || item.bomItem?.itemName || null;
        const stock =
          (catalogNumber ? stockByCatalog[catalogNumber] : null) ||
          (materialName ? stockByName[materialName] : null) ||
          null;
        const requiresSerial = !!(
          item.taskMaterial?.requiresSerialNumber ||
          item.taskMaterial?.bomTemplate?.isSerialized ||
          item.bomItem?.templateItem?.requiresSerialNumber
        );
        // Track newly discovered warehouse stock links for persistence
        if (stock && !item.warehouseStockId) {
          newWarehouseLinks.push({ itemId: item.id, stockId: stock.id });
        }
        return {
          ...item,
          lp: index + 1,
          materialName: materialName || '',
          catalogNumber: catalogNumber ?? (stock?.catalogNumber ?? null),
          warehouseStockId: stock?.id ?? item.warehouseStockId ?? null,
          plannedQuantity: resolvePlannedQty(item),
          stockQuantity: stock != null ? Number(stock.quantityAvailable) : null,
          warehouseLocation: stock?.warehouseLocation ?? null,
          requiresSerialNumber: requiresSerial,
          isSerialized: stock?.isSerialized ?? requiresSerial,
          serialNumbers: Array.isArray(item.taskMaterial?.serialNumbers) ? item.taskMaterial?.serialNumbers ?? [] : []
        };
      });

      // Persist newly discovered warehouse stock links (fire-and-forget, does not block response)
      if (newWarehouseLinks.length > 0) {
        const completionItemRepo = AppDataSource.getRepository(CompletionItem);
        Promise.allSettled(
          newWarehouseLinks.map(({ itemId, stockId }) =>
            completionItemRepo.update(itemId, { warehouseStockId: stockId })
          )
        ).then(results => {
          results.forEach((result, i) => {
            if (result.status === 'rejected') {
              serverLogger.warn(`Nie udało się zapisać warehouseStockId dla pozycji #${newWarehouseLinks[i].itemId}: ${result.reason}`);
            }
          });
        });
      }

      // Calculate progress
      const totalItems = order.items.length;
      const scannedItems = order.items.filter(item => item.status === CompletionItemStatus.SCANNED).length;
      const missingItems = order.items.filter(item => item.status === CompletionItemStatus.MISSING).length;
      const partialItems = order.items.filter(item => item.status === CompletionItemStatus.PARTIAL).length;

      res.json({
        success: true,
        data: {
          ...order,
          items: enrichedItems,
          progress: {
            totalItems,
            scannedItems,
            missingItems,
            partialItems,
            pendingItems: totalItems - scannedItems - missingItems - partialItems,
            completionPercentage: totalItems > 0 ? Math.round((scannedItems / totalItems) * 100) : 0
          }
        }
      });
    } catch (error) {
      serverLogger.error(`Error getting completion order: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas pobierania zlecenia kompletacji'
      });
    }
  }

  /**
   * POST /api/completion/orders/:id/scan
   * Scan a barcode and match to BOM item
   */
  static async scanItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { barcode, quantity = 1, serialNumber } = req.body;
      const userId = req.userId;

      if (!barcode) {
        res.status(400).json({
          success: false,
          message: 'Kod kreskowy jest wymagany'
        });
        return;
      }

      const completionOrderRepo = AppDataSource.getRepository(CompletionOrder);
      const completionItemRepo = AppDataSource.getRepository(CompletionItem);

      // Find the completion order – include taskMaterial so TaskMaterial-based items can be matched
      const order = await completionOrderRepo.findOne({
        where: { id: parseInt(id) },
        relations: ['items', 'items.bomItem', 'items.bomItem.templateItem', 'items.taskMaterial']
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Zlecenie kompletacji nie znalezione'
        });
        return;
      }

      // Try to match barcode to a pending or partial item.
      // BOM-based items match by templateItem.partNumber; TaskMaterial-based items match by materialName.
      const matchingItem = order.items.find(item => {
        const templateItem = item.bomItem?.templateItem;
        const bomMatches = templateItem?.partNumber === barcode;
        const taskMaterialMatches = !!item.taskMaterial && item.taskMaterial.materialName === barcode;

        return (bomMatches || taskMaterialMatches) &&
          (item.status === CompletionItemStatus.PENDING || item.status === CompletionItemStatus.PARTIAL);
      });

      if (!matchingItem) {
        res.status(404).json({
          success: false,
          message: 'Nie znaleziono pozycji BOM pasującej do zeskanowanego kodu',
          code: 'ITEM_NOT_FOUND'
        });
        return;
      }

      // Enforce requiresSerialNumber validation
      const requiresSerial =
        matchingItem.bomItem?.templateItem?.requiresSerialNumber ||
        matchingItem.taskMaterial?.requiresSerialNumber ||
        false;

      if (requiresSerial && !serialNumber) {
        res.status(400).json({
          success: false,
          message: 'Ten materiał wymaga podania numeru seryjnego',
          code: 'SERIAL_NUMBER_REQUIRED'
        });
        return;
      }

      // Update the completion item
      const bomItem = matchingItem.bomItem;
      const expectedQuantity = bomItem?.quantity || matchingItem.expectedQuantity || 0;
      const newScannedQuantity = matchingItem.scannedQuantity + quantity;

      if (newScannedQuantity >= expectedQuantity) {
        matchingItem.status = CompletionItemStatus.SCANNED;
        matchingItem.scannedQuantity = expectedQuantity;
      } else {
        matchingItem.status = CompletionItemStatus.PARTIAL;
        matchingItem.scannedQuantity = newScannedQuantity;
      }

      matchingItem.scannedBarcode = barcode;
      matchingItem.scannedBy = userId!;
      matchingItem.scannedAt = new Date();

      if (serialNumber) {
        matchingItem.serialNumber = serialNumber;
      }

      await completionItemRepo.save(matchingItem);

      // Dynamically recalculate warehouse reservations for the scanned item
      if (matchingItem.warehouseStockId) {
        try {
          await CompletionService.recalculateReservations(matchingItem.warehouseStockId);
        } catch (reservationError) {
          serverLogger.warn(`Nie udało się przeliczyć rezerwacji dla pozycji #${matchingItem.id}: ${reservationError}`);
        }
      }

      // Update order status
      if (order.status === CompletionOrderStatus.CREATED) {
        order.status = CompletionOrderStatus.IN_PROGRESS;
        await completionOrderRepo.save(order);
      }

      // Get remaining items
      const remainingItems = order.items.filter(item => 
        item.status === CompletionItemStatus.PENDING || 
        item.status === CompletionItemStatus.PARTIAL
      );

      res.json({
        success: true,
        message: 'Pozycja zeskanowana pomyślnie',
        data: {
          scannedItem: matchingItem,
          remainingItems: remainingItems.length,
          totalItems: order.items.length,
          scannedItems: order.items.filter(item => item.status === CompletionItemStatus.SCANNED).length
        }
      });
    } catch (error) {
      serverLogger.error(`Error scanning item: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas skanowania pozycji'
      });
    }
  }

  /**
   * POST /api/completion/orders/:id/report-missing
   * Report a BOM item as missing
   */
  static async reportMissing(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { itemId, notes } = req.body;

      if (!itemId) {
        res.status(400).json({
          success: false,
          message: 'ID pozycji jest wymagane'
        });
        return;
      }

      const completionItemRepo = AppDataSource.getRepository(CompletionItem);
      
      const item = await completionItemRepo.findOne({
        where: { 
          id: itemId,
          completionOrderId: parseInt(id)
        }
      });

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Pozycja kompletacji nie znaleziona'
        });
        return;
      }

      // Update item status to missing
      item.status = CompletionItemStatus.MISSING;
      item.notes = notes || 'Brak materiału';
      
      await completionItemRepo.save(item);

      // Dynamically recalculate warehouse reservations for the missing item
      if (item.warehouseStockId) {
        try {
          await CompletionService.recalculateReservations(item.warehouseStockId);
        } catch (reservationError) {
          serverLogger.warn(`Nie udało się przeliczyć rezerwacji dla pozycji #${item.id}: ${reservationError}`);
        }
      }

      res.json({
        success: true,
        message: 'Zgłoszono brak pozycji',
        data: item
      });
    } catch (error) {
      serverLogger.error(`Error reporting missing item: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas zgłaszania braku pozycji'
      });
    }
  }

  /**
   * POST /api/completion/orders/:id/assign-pallet
   * Assign items to a pallet
   */
  static async assignPallet(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { itemIds, palletCode } = req.body;

      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Lista ID pozycji jest wymagana'
        });
        return;
      }

      if (!palletCode) {
        res.status(400).json({
          success: false,
          message: 'Kod palety jest wymagany'
        });
        return;
      }

      const palletRepo = AppDataSource.getRepository(Pallet);
      const completionItemRepo = AppDataSource.getRepository(CompletionItem);

      // Find or create pallet
      let pallet = await palletRepo.findOne({
        where: { 
          palletNumber: palletCode,
          completionOrderId: parseInt(id)
        }
      });

      if (!pallet) {
        pallet = palletRepo.create({
          palletNumber: palletCode,
          completionOrderId: parseInt(id),
          status: 'OPEN' as any
        });
        await palletRepo.save(pallet);
      }

      // Update completion items
      await completionItemRepo
        .createQueryBuilder()
        .update(CompletionItem)
        .set({ palletId: pallet.id })
        .where('id IN (:...itemIds)', { itemIds })
        .andWhere('completionOrderId = :orderId', { orderId: parseInt(id) })
        .execute();

      res.json({
        success: true,
        message: `Przypisano ${itemIds.length} pozycji do palety ${palletCode}`,
        data: {
          pallet,
          assignedItemsCount: itemIds.length
        }
      });
    } catch (error) {
      serverLogger.error(`Error assigning pallet: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas przypisywania do palety'
      });
    }
  }

  /**
   * PATCH /api/completion/orders/:id/decision
   * Make a decision on partial completion
   */
  static async makeDecision(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { decision, notes } = req.body;
      const userId = req.userId;

      if (!decision || !Object.values(CompletionDecision).includes(decision)) {
        res.status(400).json({
          success: false,
          message: 'Nieprawidłowa decyzja. Dozwolone: CONTINUE_PARTIAL, WAIT_FOR_COMPLETE'
        });
        return;
      }

      const completionOrderRepo = AppDataSource.getRepository(CompletionOrder);
      
      const order = await completionOrderRepo.findOne({
        where: { id: parseInt(id) }
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Zlecenie kompletacji nie znalezione'
        });
        return;
      }

      // Update order with decision
      order.decision = decision;
      order.decisionNotes = notes;
      order.decisionBy = userId!;
      order.decisionAt = new Date();

      if (decision === CompletionDecision.CONTINUE_PARTIAL) {
        order.status = CompletionOrderStatus.COMPLETED;
        order.completedAt = new Date();
      } else {
        order.status = CompletionOrderStatus.WAITING_DECISION;
      }

      await completionOrderRepo.save(order);

      res.json({
        success: true,
        message: 'Decyzja zapisana pomyślnie',
        data: order
      });
    } catch (error) {
      serverLogger.error(`Error making decision: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas zapisywania decyzji'
      });
    }
  }

  /**
   * POST /api/completion/orders/:id/complete
   * Mark completion order as complete
   */
  static async completeOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const completionOrderRepo = AppDataSource.getRepository(CompletionOrder);
      
      const order = await completionOrderRepo.findOne({
        where: { id: parseInt(id) },
        relations: ['items']
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Zlecenie kompletacji nie znalezione'
        });
        return;
      }

      // Check if all items are scanned
      const allScanned = order.items.every(item => 
        item.status === CompletionItemStatus.SCANNED || 
        item.status === CompletionItemStatus.MISSING
      );

      if (!allScanned) {
        res.status(400).json({
          success: false,
          message: 'Nie wszystkie pozycje zostały zeskanowane lub zgłoszone jako brakujące'
        });
        return;
      }

      order.status = CompletionOrderStatus.COMPLETED;
      order.completedAt = new Date();

      await completionOrderRepo.save(order);

      // Przelicz rezerwacje po zakończeniu zlecenia
      try {
        await CompletionService.recalculateAllReservationsForOrder(order.id);
      } catch (reservationError) {
        serverLogger.warn(`Nie udało się przeliczyć rezerwacji po zakończeniu zlecenia #${order.id}: ${reservationError}`);
      }

      res.json({
        success: true,
        message: 'Zlecenie kompletacji zakończone',
        data: order
      });
    } catch (error) {
      serverLogger.error(`Error completing order: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas kończenia zlecenia'
      });
    }
  }

  /**
   * POST /api/completion
   * Tworzy nowe zlecenie kompletacji
   */
  static async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const { taskNumber, subsystemId, assignedToId } = req.body;

      if (!taskNumber || !subsystemId || !assignedToId) {
        res.status(400).json({
          success: false,
          message: 'Brak wymaganych parametrów: taskNumber, subsystemId, assignedToId'
        });
        return;
      }

      const taskRepository = AppDataSource.getRepository(Task);
      const taskMaterialRepository = AppDataSource.getRepository(TaskMaterial);

      const task = await taskRepository.findOne({
        where: { taskNumber }
      });

      if (!task) {
        res.status(404).json({
          success: false,
          message: `Zadanie o numerze ${taskNumber} nie znalezione`
        });
        return;
      }

      const taskMaterials = await taskMaterialRepository.find({
        where: { taskId: task.id }
      });

      if (taskMaterials.length === 0) {
        res.status(400).json({
          success: false,
          message: `Zadanie ${taskNumber} nie ma skonfigurowanych materiałów BOM`
        });
        return;
      }

      const order = await CompletionService.createCompletionOrderFromTaskMaterials({
        taskId: task.id,
        taskNumber: task.taskNumber,
        subsystemId,
        assignedToId,
        taskMaterials
      });

      // Aktualizuj status zadania
      task.status = 'in_completion';
      await taskRepository.save(task);

      res.status(201).json({
        success: true,
        message: 'Zlecenie kompletacji utworzone',
        data: order
      });
    } catch (error) {
      serverLogger.error(`Error creating completion order: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd tworzenia zlecenia kompletacji'
      });
    }
  }

  /**
   * POST /api/completion/:id/pallets
   * Tworzy paletę dla zlecenia
   */
  static async createPallet(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { palletNumber } = req.body;

      if (!palletNumber) {
        res.status(400).json({
          success: false,
          message: 'Brak numeru palety'
        });
        return;
      }

      const pallet = await CompletionService.createPallet(
        parseInt(id, 10),
        palletNumber
      );

      res.status(201).json({
        success: true,
        message: 'Paleta utworzona',
        data: pallet
      });
    } catch (error) {
      serverLogger.error(`Error creating pallet: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd tworzenia palety'
      });
    }
  }

  /**
   * POST /api/completion/:id/approve
   * Zatwierdza kompletację (pełną lub częściową)
   */
  static async approveCompletion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { partial, notes } = req.body;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      const order = await CompletionService.approveCompletion({
        completionOrderId: parseInt(id, 10),
        partial: partial || false,
        notes,
        userId
      });

      // Wyślij powiadomienie o zakończeniu
      if (order.status === CompletionOrderStatus.COMPLETED) {
        await NotificationService.notifyCompletionFinished(order.id);
      }

      res.json({
        success: true,
        message: partial ? 'Kompletacja częściowa zatwierdzona' : 'Kompletacja pełna zatwierdzona',
        data: order
      });
    } catch (error) {
      serverLogger.error(`Error approving completion: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd zatwierdzania kompletacji'
      });
    }
  }

  /**
   * POST /api/completion/:id/create-prefab
   * Tworzy zadanie prefabrykacji po zakończeniu kompletacji
   */
  static async createPrefabTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { assignedToId } = req.body;

      if (!assignedToId) {
        res.status(400).json({
          success: false,
          message: 'Brak ID użytkownika do przypisania'
        });
        return;
      }

      const prefabTask = await CompletionService.createPrefabricationTask(
        parseInt(id, 10),
        assignedToId
      );

      // Wyślij powiadomienie
      await NotificationService.notifyNewPrefabricationTask(prefabTask.id);

      res.status(201).json({
        success: true,
        message: 'Zadanie prefabrykacji utworzone',
        data: prefabTask
      });
    } catch (error) {
      serverLogger.error(`Error creating prefabrication task: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd tworzenia zadania prefabrykacji'
      });
    }
  }

  /**
   * PATCH /api/completion/orders/:id/cancel
   * Cancel a completion order
   */
  static async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const completionOrderRepo = AppDataSource.getRepository(CompletionOrder);

      const order = await completionOrderRepo.findOne({
        where: { id: parseInt(id) }
      });

      if (!order) {
        res.status(404).json({ success: false, message: 'Zlecenie kompletacji nie znalezione' });
        return;
      }

      if (order.status === CompletionOrderStatus.COMPLETED) {
        res.status(400).json({ success: false, message: 'Nie można anulować zakończonego zlecenia' });
        return;
      }

      order.status = CompletionOrderStatus.CANCELLED;
      await completionOrderRepo.save(order);

      // Przelicz rezerwacje po anulowaniu zlecenia
      try {
        await CompletionService.recalculateAllReservationsForOrder(order.id);
      } catch (reservationError) {
        serverLogger.warn(`Nie udało się przeliczyć rezerwacji po anulowaniu zlecenia #${order.id}: ${reservationError}`);
      }

      res.json({ success: true, message: 'Zlecenie anulowane', data: order });
    } catch (error) {
      serverLogger.error(`Error cancelling order: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ success: false, message: 'Błąd serwera podczas anulowania zlecenia' });
    }
  }

  /**
   * PATCH /api/completion/orders/:id/items/:itemId/serials
   * Save serial numbers for a completion item
   */
  static async saveItemSerials(req: Request, res: Response): Promise<void> {
    try {
      const { id, itemId } = req.params;
      const { serialNumbers } = req.body;
      const userId = req.userId;

      if (!Array.isArray(serialNumbers)) {
        res.status(400).json({ success: false, message: 'serialNumbers musi być tablicą' });
        return;
      }

      const completionItemRepo = AppDataSource.getRepository(CompletionItem);
      const taskMaterialRepo = AppDataSource.getRepository(TaskMaterial);

      const item = await completionItemRepo.findOne({
        where: { id: parseInt(itemId), completionOrderId: parseInt(id) },
        relations: ['taskMaterial', 'bomItem']
      });

      if (!item) {
        res.status(404).json({ success: false, message: 'Pozycja kompletacji nie znaleziona' });
        return;
      }

      const expectedQty = resolvePlannedQty(item);
      const uniqueSerials = [...new Set(serialNumbers.map((s: string) => s.trim()).filter(Boolean))];

      // Check global serial number uniqueness across other completion items and task materials
      if (uniqueSerials.length > 0) {
        // Check other completion items (serialNumber field) - exclude current item
        const duplicateItems = await completionItemRepo
          .createQueryBuilder('ci')
          .where('ci.id != :currentId', { currentId: item.id })
          .andWhere('ci.serialNumber IN (:...serials)', { serials: uniqueSerials })
          .getMany();

        if (duplicateItems.length > 0) {
          const duplicates = uniqueSerials.filter(sn =>
            duplicateItems.some(ci => ci.serialNumber === sn)
          );
          res.status(400).json({
            success: false,
            message: `Numery seryjne już użyte w innych pozycjach: ${duplicates.join(', ')}`
          });
          return;
        }

        // Check other task materials (serialNumbers JSONB array) - exclude current item's task material
        const currentTaskMaterialId = item.taskMaterialId ?? 0;
        const duplicateMaterials = await taskMaterialRepo
          .createQueryBuilder('tm')
          .where('tm.id != :currentId', { currentId: currentTaskMaterialId })
          .andWhere(
            'EXISTS (SELECT 1 FROM jsonb_array_elements_text(tm.serialNumbers) AS serial WHERE serial IN (:...serials))',
            { serials: uniqueSerials }
          )
          .getMany();

        if (duplicateMaterials.length > 0) {
          const duplicates = uniqueSerials.filter(sn =>
            duplicateMaterials.some(tm => tm.serialNumbers?.includes(sn))
          );
          res.status(400).json({
            success: false,
            message: `Numery seryjne już użyte w innych pozycjach: ${duplicates.join(', ')}`
          });
          return;
        }
      }

      // Update taskMaterial serialNumbers if exists
      if (item.taskMaterial) {
        item.taskMaterial.serialNumbers = uniqueSerials;
        item.taskMaterial.usedQuantity = uniqueSerials.length;
        await taskMaterialRepo.save(item.taskMaterial);
      }

      // Update the completion item
      item.scannedQuantity = uniqueSerials.length;
      item.scannedBy = userId!;
      item.scannedAt = new Date();

      if (uniqueSerials.length >= expectedQty && expectedQty > 0) {
        item.status = CompletionItemStatus.SCANNED;
      } else if (uniqueSerials.length > 0) {
        item.status = CompletionItemStatus.PARTIAL;
      } else {
        item.status = CompletionItemStatus.PENDING;
      }

      if (uniqueSerials.length > 0) {
        item.serialNumber = uniqueSerials[0];
      }

      await completionItemRepo.save(item);

      res.json({
        success: true,
        message: 'Numery seryjne zapisane',
        data: { itemId: item.id, serialNumbers: uniqueSerials, scannedQuantity: uniqueSerials.length }
      });
    } catch (error) {
      serverLogger.error(`Error saving item serials: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ success: false, message: 'Błąd serwera podczas zapisywania numerów seryjnych' });
    }
  }

  /**
   * GET /api/admin/config/serial-patterns
   * Get serial number validation patterns (admin only)
   */
  static async getSerialPatterns(req: Request, res: Response): Promise<void> {
    try {
      const systemConfigRepo = AppDataSource.getRepository(SystemConfig);
      const config = await systemConfigRepo.findOne({ where: { key: 'serial_number_patterns' } });

      let patterns = { patterns: [], stripPrefixes: [] };
      if (config) {
        try {
          patterns = JSON.parse(config.value);
        } catch {
          serverLogger.error('Invalid serial patterns configuration in database – using defaults');
        }
      }

      res.json({ success: true, data: patterns });
    } catch (error) {
      serverLogger.error(`Error getting serial patterns: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ success: false, message: 'Błąd pobierania wzorców numerów seryjnych' });
    }
  }

  /**
   * PUT /api/admin/config/serial-patterns
   * Update serial number validation patterns (admin only)
   */
  static async setSerialPatterns(req: Request, res: Response): Promise<void> {
    try {
      const { patterns, stripPrefixes } = req.body;
      const userId = req.userId;

      if (!Array.isArray(patterns) || !Array.isArray(stripPrefixes)) {
        res.status(400).json({ success: false, message: 'patterns i stripPrefixes muszą być tablicami' });
        return;
      }

      const systemConfigRepo = AppDataSource.getRepository(SystemConfig);
      let config = await systemConfigRepo.findOne({ where: { key: 'serial_number_patterns' } });

      const value = JSON.stringify({ patterns, stripPrefixes });

      if (config) {
        config.value = value;
        config.updatedById = userId!;
      } else {
        config = systemConfigRepo.create({
          key: 'serial_number_patterns',
          value,
          category: 'completion',
          updatedById: userId
        });
      }

      await systemConfigRepo.save(config);

      res.json({ success: true, message: 'Wzorce numerów seryjnych zapisane', data: { patterns, stripPrefixes } });
    } catch (error) {
      serverLogger.error(`Error setting serial patterns: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ success: false, message: 'Błąd zapisywania wzorców numerów seryjnych' });
    }
  }

  /**
   * PATCH /api/completion/orders/:id/items/:itemId/warehouse-location
   * Update warehouse location for a completion item in WarehouseStock
   */
  static async updateWarehouseLocation(req: Request, res: Response): Promise<void> {
    try {
      const { id, itemId } = req.params;
      const { location } = req.body;

      if (typeof location !== 'string') {
        res.status(400).json({ success: false, message: 'Pole location jest wymagane' });
        return;
      }

      const completionItemRepo = AppDataSource.getRepository(CompletionItem);
      const warehouseStockRepo = AppDataSource.getRepository(WarehouseStock);

      const item = await completionItemRepo.findOne({
        where: { id: parseInt(itemId), completionOrderId: parseInt(id) }
      });

      if (!item) {
        res.status(404).json({ success: false, message: 'Pozycja kompletacji nie znaleziona' });
        return;
      }

      if (!item.warehouseStockId) {
        res.status(404).json({ success: false, message: 'Pozycja nie jest powiązana z magazynem' });
        return;
      }

      const stock = await warehouseStockRepo.findOne({ where: { id: item.warehouseStockId } });
      if (!stock) {
        res.status(404).json({ success: false, message: 'Pozycja magazynowa nie znaleziona' });
        return;
      }

      stock.warehouseLocation = (location.trim() || null) as unknown as string;
      await warehouseStockRepo.save(stock);

      res.json({
        success: true,
        message: 'Lokalizacja zaktualizowana',
        data: { warehouseStockId: stock.id, warehouseLocation: stock.warehouseLocation }
      });
    } catch (error) {
      serverLogger.error(`Error updating warehouse location: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ success: false, message: 'Błąd aktualizacji lokalizacji' });
    }
  }

  /**
   * POST /api/completion/orders/:id/request-partial
   * Zgłoszenie prośby o częściowe wydanie materiałów
   */
  static async requestPartialIssue(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { notes, issuedQuantities } = req.body;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Brak autoryzacji' });
        return;
      }

      const order = await CompletionService.requestPartialIssue(
        parseInt(id, 10),
        userId,
        issuedQuantities,
        notes
      );

      // Get missing items for notification
      const orderRepo = AppDataSource.getRepository(CompletionOrder);
      const fullOrder = await orderRepo.findOne({
        where: { id: parseInt(id, 10) },
        relations: ['items', 'items.taskMaterial', 'items.taskMaterial.bomTemplate', 'items.bomItem', 'assignedTo', 'subsystem']
      });

      if (fullOrder) {
        const enrichedItems = await CompletionService.enrichItemsWithWarehouseData(fullOrder.items);
        const missingItems = enrichedItems
          .filter(item => !(item.requiresSerialNumber || item.isSerialized))
          .map(item => {
            const planned = resolvePlannedQty(item);
            const issued = issuedQuantities?.[item.id] ?? item.issuedQuantity ?? 0;
            return { name: item.materialName || item.bomItem?.itemName || '—', catalogNumber: item.catalogNumber || '—', plannedQuantity: planned, issuedQuantity: issued, missing: Math.max(0, planned - issued) };
          })
          .filter(item => item.missing > 0);

        const requestedByName = fullOrder.assignedTo
          ? `${fullOrder.assignedTo.firstName} ${fullOrder.assignedTo.lastName}`
          : `#${userId}`;

        await NotificationService.notifyPartialIssueRequest(order.id, missingItems, requestedByName, notes);
      }

      res.json({
        success: true,
        message: 'Proszę czekać na zgodę kierownika',
        data: order
      });
    } catch (error) {
      serverLogger.error(`Error requesting partial issue: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd zgłoszenia częściowego wydania'
      });
    }
  }

  /**
   * POST /api/completion/orders/:id/approve-partial
   * Akceptacja częściowego wydania przez kierownika
   */
  static async approvePartialIssue(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Brak autoryzacji' });
        return;
      }

      const order = await CompletionService.approvePartialIssue(parseInt(id, 10), userId, notes);

      // Get manager name for notification
      const userRepo = AppDataSource.getRepository(User);
      const manager = await userRepo.findOne({ where: { id: userId } });
      const managerName = manager ? `${manager.firstName} ${manager.lastName}` : `#${userId}`;

      await NotificationService.notifyPartialIssueApproved(order.id, managerName, notes);

      res.json({
        success: true,
        message: 'Częściowe wydanie zatwierdzone',
        data: order
      });
    } catch (error) {
      serverLogger.error(`Error approving partial issue: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd zatwierdzania częściowego wydania'
      });
    }
  }

  /**
   * POST /api/completion/orders/:id/reopen
   * Ponowne otwarcie zlecenia częściowego do dokończenia
   */
  static async reopenPartialOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Brak autoryzacji' });
        return;
      }

      const order = await CompletionService.reopenPartialOrder(parseInt(id, 10), userId);

      res.json({
        success: true,
        message: 'Zlecenie ponownie otwarte',
        data: order
      });
    } catch (error) {
      serverLogger.error(`Error reopening partial order: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd ponownego otwarcia zlecenia'
      });
    }
  }

  /**
   * GET /api/completion/completed
   * Lista zakończonych zleceń kompletacji (COMPLETED + PARTIAL_ISSUED)
   */
  static async getCompletedOrders(req: Request, res: Response): Promise<void> {
    try {
      const { assignedTo, subsystemId } = req.query;

      const orders = await CompletionService.getCompletedOrders({
        assignedToId: assignedTo ? parseInt(assignedTo as string, 10) : undefined,
        subsystemId: subsystemId ? parseInt(subsystemId as string, 10) : undefined
      });

      res.json({ success: true, data: orders });
    } catch (error) {
      serverLogger.error(`Error getting completed orders: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ success: false, message: 'Błąd pobierania zakończonych zleceń' });
    }
  }

  /**
   * PATCH /api/completion/orders/:id/issued-quantities
   * Zapisanie ilości wydanych dla pozycji nieserializowanych
   */
  static async saveIssuedQuantities(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { quantities } = req.body;

      if (!quantities || typeof quantities !== 'object') {
        res.status(400).json({ success: false, message: 'Brak danych quantities' });
        return;
      }

      await CompletionService.saveIssuedQuantities(parseInt(id, 10), quantities);

      res.json({ success: true, message: 'Ilości wydane zapisane' });
    } catch (error) {
      serverLogger.error(`Error saving issued quantities: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ success: false, message: 'Błąd zapisywania ilości wydanych' });
    }
  }
}
