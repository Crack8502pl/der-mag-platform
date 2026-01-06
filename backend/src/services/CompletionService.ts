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

export interface CreateCompletionOrderParams {
  subsystemId: number;
  generatedBomId: number;
  assignedToId: number;
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

    // Aktualizuj status podsystemu
    subsystem.status = SubsystemStatus.IN_COMPLETION;
    await subsystemRepo.save(subsystem);

    console.log(`✅ Utworzono zlecenie kompletacji #${order.id} dla podsystemu ${subsystem.subsystemNumber}`);

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

    console.log(`✅ Utworzono paletę ${palletNumber} dla zlecenia #${completionOrderId}`);

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
      relations: ['items', 'items.bomItem', 'items.bomItem.templateItem']
    });

    if (!order) {
      throw new Error('Zlecenie kompletacji nie znalezione');
    }

    if (order.status === CompletionOrderStatus.COMPLETED) {
      throw new Error('Zlecenie już zakończone');
    }

    // Znajdź pasującą pozycję
    const matchingItem = order.items.find(item => {
      const templateItem = item.bomItem?.templateItem;
      return (
        (templateItem?.partNumber === params.barcode || item.bomItem?.partNumber === params.barcode) &&
        (item.status === CompletionItemStatus.PENDING || item.status === CompletionItemStatus.PARTIAL)
      );
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
    }

    console.log(`✅ Zeskanowano materiał: ${params.barcode} (${quantity} szt)`);

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

    console.log(`✅ Zgłoszono braki materiałowe w zleceniu #${params.completionOrderId}: ${params.itemIds.length} pozycji`);
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
    }

    await orderRepo.save(order);

    console.log(`✅ Zatwierdzono kompletację zlecenia #${order.id} (${params.partial ? 'częściowa' : 'pełna'})`);

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

    console.log(`✅ Utworzono zadanie prefabrykacji #${prefabTask.id} dla zlecenia #${completionOrderId}`);

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
}

export default new CompletionService();
