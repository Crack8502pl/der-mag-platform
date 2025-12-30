// src/services/BomTriggerService.ts
// Serwis zarządzania triggerami BOM

import { AppDataSource } from '../config/database';
import { BomTrigger, TriggerEvent, ActionType } from '../entities/BomTrigger';
import { BomTriggerLog } from '../entities/BomTriggerLog';
import { Task } from '../entities/Task';
import { TaskMaterial } from '../entities/TaskMaterial';
import { BOMTemplate } from '../entities/BOMTemplate';
import { In } from 'typeorm';

export class BomTriggerService {
  /**
   * Pobiera wszystkie triggery z opcjonalnym filtrowaniem
   */
  static async getAllTriggers(filters?: {
    isActive?: boolean;
    triggerEvent?: TriggerEvent;
  }): Promise<BomTrigger[]> {
    const triggerRepository = AppDataSource.getRepository(BomTrigger);
    const where: any = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.triggerEvent) {
      where.triggerEvent = filters.triggerEvent;
    }

    return await triggerRepository.find({
      where,
      relations: ['sourceTaskType', 'targetTaskType', 'creator'],
      order: { priority: 'DESC', createdAt: 'DESC' }
    });
  }

  /**
   * Pobiera trigger po ID
   */
  static async getTriggerById(id: number): Promise<BomTrigger | null> {
    const triggerRepository = AppDataSource.getRepository(BomTrigger);
    
    return await triggerRepository.findOne({
      where: { id },
      relations: ['sourceTaskType', 'targetTaskType', 'creator']
    });
  }

  /**
   * Tworzy nowy trigger
   */
  static async createTrigger(data: Partial<BomTrigger>, userId: number): Promise<BomTrigger> {
    const triggerRepository = AppDataSource.getRepository(BomTrigger);
    
    const trigger = triggerRepository.create({
      ...data,
      createdBy: userId,
      priority: data.priority ?? 10,
      isActive: data.isActive ?? true
    });

    return await triggerRepository.save(trigger);
  }

  /**
   * Aktualizuje trigger
   */
  static async updateTrigger(id: number, data: Partial<BomTrigger>): Promise<BomTrigger> {
    const triggerRepository = AppDataSource.getRepository(BomTrigger);
    
    const trigger = await triggerRepository.findOne({ where: { id } });
    
    if (!trigger) {
      throw new Error('Trigger nie znaleziony');
    }

    Object.assign(trigger, data);
    return await triggerRepository.save(trigger);
  }

  /**
   * Usuwa trigger (soft delete przez isActive)
   */
  static async deleteTrigger(id: number): Promise<void> {
    const triggerRepository = AppDataSource.getRepository(BomTrigger);
    
    const trigger = await triggerRepository.findOne({ where: { id } });
    
    if (!trigger) {
      throw new Error('Trigger nie znaleziony');
    }

    trigger.isActive = false;
    await triggerRepository.save(trigger);
  }

  /**
   * Przełącza aktywność triggera
   */
  static async toggleTrigger(id: number): Promise<BomTrigger> {
    const triggerRepository = AppDataSource.getRepository(BomTrigger);
    
    const trigger = await triggerRepository.findOne({ where: { id } });
    
    if (!trigger) {
      throw new Error('Trigger nie znaleziony');
    }

    trigger.isActive = !trigger.isActive;
    return await triggerRepository.save(trigger);
  }

  /**
   * Wykonuje triggery dla danego eventu
   */
  static async executeTriggers(
    event: TriggerEvent,
    eventData: Record<string, any>
  ): Promise<void> {
    const triggers = await this.getAllTriggers({
      isActive: true,
      triggerEvent: event
    });

    for (const trigger of triggers) {
      try {
        const shouldExecute = this.evaluateCondition(trigger.triggerCondition, eventData);
        
        if (shouldExecute) {
          await this.executeTrigger(trigger, eventData);
        }
      } catch (error) {
        console.error(`Błąd wykonania triggera ${trigger.id}:`, error);
        await this.logTriggerExecution(trigger.id, eventData, false, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  /**
   * Wykonuje pojedynczy trigger
   */
  static async executeTrigger(
    trigger: BomTrigger,
    inputData: Record<string, any>
  ): Promise<any> {
    try {
      let result: any = null;

      switch (trigger.actionType) {
        case 'ADD_MATERIAL':
          result = await this.executeAddMaterial(trigger, inputData);
          break;
        case 'UPDATE_QUANTITY':
          result = await this.executeUpdateQuantity(trigger, inputData);
          break;
        case 'COPY_BOM':
          result = await this.executeCopyBom(trigger, inputData);
          break;
        case 'NOTIFY':
          result = await this.executeNotify(trigger, inputData);
          break;
        case 'CALCULATE_COST':
          result = await this.executeCalculateCost(trigger, inputData);
          break;
        default:
          throw new Error(`Nieznany typ akcji: ${trigger.actionType}`);
      }

      await this.logTriggerExecution(trigger.id, inputData, true, undefined, result);
      return result;
    } catch (error) {
      await this.logTriggerExecution(
        trigger.id,
        inputData,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  /**
   * Sprawdza czy warunek triggera jest spełniony
   */
  private static evaluateCondition(
    condition: Record<string, any>,
    eventData: Record<string, any>
  ): boolean {
    if (!condition || Object.keys(condition).length === 0) {
      return true; // Brak warunku = zawsze wykonuj
    }

    for (const [key, value] of Object.entries(condition)) {
      if (eventData[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Akcja: Dodanie materiału do BOM zadania
   */
  private static async executeAddMaterial(
    trigger: BomTrigger,
    inputData: Record<string, any>
  ): Promise<TaskMaterial> {
    const { taskId } = inputData;
    const { materialName, defaultQuantity, unit, category } = trigger.actionConfig;

    if (!taskId) {
      throw new Error('Brak ID zadania');
    }

    const taskMaterialRepository = AppDataSource.getRepository(TaskMaterial);

    const material = taskMaterialRepository.create({
      taskId,
      materialName: materialName || 'Nowy materiał',
      plannedQuantity: defaultQuantity || 1,
      usedQuantity: 0,
      unit: unit || 'szt',
      category: category || 'default'
    });

    return await taskMaterialRepository.save(material);
  }

  /**
   * Akcja: Aktualizacja ilości materiału
   */
  private static async executeUpdateQuantity(
    trigger: BomTrigger,
    inputData: Record<string, any>
  ): Promise<TaskMaterial> {
    const { materialId, taskId } = inputData;
    const { quantityMultiplier, newQuantity } = trigger.actionConfig;

    if (!materialId && !taskId) {
      throw new Error('Brak ID materiału lub zadania');
    }

    const taskMaterialRepository = AppDataSource.getRepository(TaskMaterial);
    
    let material: TaskMaterial | null = null;

    if (materialId) {
      material = await taskMaterialRepository.findOne({ where: { id: materialId } });
    }

    if (!material) {
      throw new Error('Materiał nie znaleziony');
    }

    if (newQuantity !== undefined) {
      material.plannedQuantity = newQuantity;
    } else if (quantityMultiplier !== undefined) {
      material.plannedQuantity = material.plannedQuantity * quantityMultiplier;
    }

    return await taskMaterialRepository.save(material);
  }

  /**
   * Akcja: Kopiowanie szablonu BOM
   */
  private static async executeCopyBom(
    trigger: BomTrigger,
    inputData: Record<string, any>
  ): Promise<TaskMaterial[]> {
    const { taskId } = inputData;
    const { sourceTaskTypeId } = trigger.actionConfig;

    if (!taskId) {
      throw new Error('Brak ID zadania');
    }

    const bomTemplateRepository = AppDataSource.getRepository(BOMTemplate);
    const taskMaterialRepository = AppDataSource.getRepository(TaskMaterial);

    const templates = await bomTemplateRepository.find({
      where: { taskTypeId: sourceTaskTypeId ?? trigger.sourceTaskTypeId, active: true }
    });

    const materials: TaskMaterial[] = [];

    for (const template of templates) {
      const material = taskMaterialRepository.create({
        taskId,
        bomTemplateId: template.id,
        materialName: template.materialName,
        plannedQuantity: template.defaultQuantity,
        usedQuantity: 0,
        unit: template.unit,
        category: template.category
      });

      materials.push(await taskMaterialRepository.save(material));
    }

    return materials;
  }

  /**
   * Akcja: Wysłanie powiadomienia
   */
  private static async executeNotify(
    trigger: BomTrigger,
    inputData: Record<string, any>
  ): Promise<{ notified: boolean; message: string }> {
    const { message, recipients } = trigger.actionConfig;

    console.log(`📧 Powiadomienie triggera ${trigger.id}:`, message);
    console.log(`📧 Odbiorcy:`, recipients);
    console.log(`📧 Dane eventu:`, inputData);

    // Tutaj można zintegrować z systemem powiadomień
    // np. EmailQueueService lub NotificationService

    return {
      notified: true,
      message: message || 'Trigger wykonany'
    };
  }

  /**
   * Akcja: Przeliczenie kosztów materiałów
   */
  private static async executeCalculateCost(
    trigger: BomTrigger,
    inputData: Record<string, any>
  ): Promise<{ totalCost: number; itemCount: number }> {
    const { taskId } = inputData;

    if (!taskId) {
      throw new Error('Brak ID zadania');
    }

    const taskMaterialRepository = AppDataSource.getRepository(TaskMaterial);
    
    const materials = await taskMaterialRepository.find({
      where: { taskId },
      relations: ['bomTemplate']
    });

    let totalCost = 0;
    let itemCount = 0;

    for (const material of materials) {
      if (material.bomTemplate?.unitPrice) {
        totalCost += material.plannedQuantity * material.bomTemplate.unitPrice;
        itemCount++;
      }
    }

    return { totalCost, itemCount };
  }

  /**
   * Loguje wykonanie triggera
   */
  private static async logTriggerExecution(
    triggerId: number,
    inputData: Record<string, any>,
    success: boolean,
    errorMessage?: string,
    resultData?: Record<string, any>
  ): Promise<void> {
    const logRepository = AppDataSource.getRepository(BomTriggerLog);

    const log = logRepository.create({
      triggerId,
      taskId: inputData.taskId || null,
      success,
      inputData,
      resultData: resultData || {},
      errorMessage
    });

    await logRepository.save(log);
  }

  /**
   * Pobiera logi wykonania triggerów
   */
  static async getTriggerLogs(triggerId?: number, limit: number = 50): Promise<BomTriggerLog[]> {
    const logRepository = AppDataSource.getRepository(BomTriggerLog);
    
    const where: any = {};
    if (triggerId) {
      where.triggerId = triggerId;
    }

    return await logRepository.find({
      where,
      relations: ['trigger', 'task'],
      order: { executedAt: 'DESC' },
      take: limit
    });
  }

  /**
   * Pobiera dostępne typy eventów
   */
  static getAvailableEvents(): { value: TriggerEvent; label: string; description: string }[] {
    return [
      {
        value: 'ON_TASK_CREATE',
        label: 'Przy tworzeniu zadania',
        description: 'Trigger wykonywany podczas tworzenia nowego zadania'
      },
      {
        value: 'ON_STATUS_CHANGE',
        label: 'Przy zmianie statusu',
        description: 'Trigger wykonywany gdy zmienia się status zadania'
      },
      {
        value: 'ON_BOM_UPDATE',
        label: 'Przy aktualizacji BOM',
        description: 'Trigger wykonywany gdy aktualizowany jest szablon BOM'
      },
      {
        value: 'ON_MATERIAL_ADD',
        label: 'Przy dodaniu materiału',
        description: 'Trigger wykonywany gdy dodawany jest materiał do zadania'
      },
      {
        value: 'ON_QUANTITY_CHANGE',
        label: 'Przy zmianie ilości',
        description: 'Trigger wykonywany gdy zmienia się ilość materiału'
      }
    ];
  }

  /**
   * Pobiera dostępne typy akcji
   */
  static getAvailableActions(): { value: ActionType; label: string; description: string }[] {
    return [
      {
        value: 'ADD_MATERIAL',
        label: 'Dodaj materiał',
        description: 'Automatycznie dodaje materiał do BOM zadania'
      },
      {
        value: 'UPDATE_QUANTITY',
        label: 'Aktualizuj ilość',
        description: 'Zmienia ilość materiału wg zadanej reguły'
      },
      {
        value: 'COPY_BOM',
        label: 'Kopiuj BOM',
        description: 'Kopiuje szablon BOM z innego typu zadania'
      },
      {
        value: 'NOTIFY',
        label: 'Wyślij powiadomienie',
        description: 'Wysyła powiadomienie do określonych użytkowników'
      },
      {
        value: 'CALCULATE_COST',
        label: 'Przelicz koszty',
        description: 'Przelicza całkowity koszt materiałów w zadaniu'
      }
    ];
  }
}
