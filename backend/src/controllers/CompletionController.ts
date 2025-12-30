// src/controllers/CompletionController.ts
// Controller for completion/scanner functionality

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { CompletionOrder, CompletionOrderStatus, CompletionDecision } from '../entities/CompletionOrder';
import { CompletionItem, CompletionItemStatus } from '../entities/CompletionItem';
import { WorkflowGeneratedBomItem } from '../entities/WorkflowGeneratedBomItem';
import { Pallet } from '../entities/Pallet';

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
      console.error('Error listing completion orders:', error);
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
        .leftJoinAndSelect('order.generatedBom', 'generatedBom')
        .leftJoinAndSelect('order.assignedTo', 'assignedTo')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('items.bomItem', 'bomItem')
        .leftJoinAndSelect('bomItem.materialStock', 'materialStock')
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

      // Calculate progress
      const totalItems = order.items.length;
      const scannedItems = order.items.filter(item => item.status === CompletionItemStatus.SCANNED).length;
      const missingItems = order.items.filter(item => item.status === CompletionItemStatus.MISSING).length;
      const partialItems = order.items.filter(item => item.status === CompletionItemStatus.PARTIAL).length;

      res.json({
        success: true,
        data: {
          ...order,
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
      console.error('Error getting completion order:', error);
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
      const { barcode, quantity = 1 } = req.body;
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

      // Find the completion order
      const order = await completionOrderRepo.findOne({
        where: { id: parseInt(id) },
        relations: ['items', 'items.bomItem', 'items.bomItem.materialStock']
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Zlecenie kompletacji nie znalezione'
        });
        return;
      }

      // Try to match barcode to a pending or partial item
      const matchingItem = order.items.find(item => {
        const bomItem = item.bomItem;
        const materialStock = bomItem?.materialStock;
        
        // Check if barcode matches material stock barcode or EAN
        return (
          (materialStock?.barcode && materialStock.barcode === barcode) ||
          (materialStock?.ean && materialStock.ean === barcode)
        ) && (item.status === CompletionItemStatus.PENDING || item.status === CompletionItemStatus.PARTIAL);
      });

      if (!matchingItem) {
        res.status(404).json({
          success: false,
          message: 'Nie znaleziono pozycji BOM pasującej do zeskanowanego kodu',
          code: 'ITEM_NOT_FOUND'
        });
        return;
      }

      // Update the completion item
      const bomItem = matchingItem.bomItem;
      const expectedQuantity = bomItem.quantity;
      const newScannedQuantity = matchingItem.scannedQuantity + quantity;

      if (newScannedQuantity >= expectedQuantity) {
        matchingItem.status = CompletionItemStatus.SCANNED;
        matchingItem.scannedQuantity = expectedQuantity;
      } else {
        matchingItem.status = CompletionItemStatus.PARTIAL;
        matchingItem.scannedQuantity = newScannedQuantity;
      }

      matchingItem.scannedBarcode = barcode;
      matchingItem.scannedBy = userId;
      matchingItem.scannedAt = new Date();

      await completionItemRepo.save(matchingItem);

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
      console.error('Error scanning item:', error);
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

      res.json({
        success: true,
        message: 'Zgłoszono brak pozycji',
        data: item
      });
    } catch (error) {
      console.error('Error reporting missing item:', error);
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
          code: palletCode,
          completionOrderId: parseInt(id)
        }
      });

      if (!pallet) {
        pallet = palletRepo.create({
          code: palletCode,
          completionOrderId: parseInt(id),
          status: 'IN_PROGRESS'
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
      console.error('Error assigning pallet:', error);
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
      order.decisionBy = userId;
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
      console.error('Error making decision:', error);
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

      res.json({
        success: true,
        message: 'Zlecenie kompletacji zakończone',
        data: order
      });
    } catch (error) {
      console.error('Error completing order:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas kończenia zlecenia'
      });
    }
  }
}
