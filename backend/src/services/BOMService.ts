// src/services/BOMService.ts
// Serwis zarządzania Bill of Materials

import { AppDataSource } from '../config/database';
import { BOMTemplate } from '../entities/BOMTemplate';
import { TaskMaterial } from '../entities/TaskMaterial';
import { BomTriggerService } from './BomTriggerService';

export class BOMService {
  /**
   * Pobiera szablony BOM dla typu zadania
   */
  static async getTemplatesForTaskType(taskTypeId: number): Promise<BOMTemplate[]> {
    const bomRepository = AppDataSource.getRepository(BOMTemplate);
    
    return await bomRepository.find({
      where: { taskTypeId, active: true },
      relations: ['taskType']
    });
  }

  /**
   * Tworzy szablon BOM
   */
  static async createTemplate(data: Partial<BOMTemplate>): Promise<BOMTemplate> {
    const bomRepository = AppDataSource.getRepository(BOMTemplate);
    
    const template = bomRepository.create(data);
    const savedTemplate = await bomRepository.save(template);

    // Wykonaj triggery ON_BOM_UPDATE
    try {
      await BomTriggerService.executeTriggers('ON_BOM_UPDATE', {
        bomTemplateId: savedTemplate.id,
        taskTypeId: savedTemplate.taskTypeId,
        materialName: savedTemplate.materialName,
        action: 'create'
      });
    } catch (error) {
      console.error('Błąd wykonania triggerów ON_BOM_UPDATE:', error);
    }

    return savedTemplate;
  }

  /**
   * Dodaje materiał do zadania
   */
  static async addMaterialToTask(taskId: number, materialData: Partial<TaskMaterial>): Promise<TaskMaterial> {
    const materialRepository = AppDataSource.getRepository(TaskMaterial);
    
    const material = materialRepository.create({
      taskId,
      ...materialData
    });
    
    const savedMaterial = await materialRepository.save(material);

    // Wykonaj triggery ON_MATERIAL_ADD
    try {
      await BomTriggerService.executeTriggers('ON_MATERIAL_ADD', {
        taskId,
        materialId: savedMaterial.id,
        materialName: savedMaterial.materialName,
        plannedQuantity: savedMaterial.plannedQuantity
      });
    } catch (error) {
      console.error('Błąd wykonania triggerów ON_MATERIAL_ADD:', error);
    }

    return savedMaterial;
  }

  /**
   * Pobiera materiały dla zadania
   */
  static async getTaskMaterials(taskId: number): Promise<TaskMaterial[]> {
    const materialRepository = AppDataSource.getRepository(TaskMaterial);
    
    return await materialRepository.find({
      where: { taskId },
      relations: ['bomTemplate']
    });
  }

  /**
   * Aktualizuje użycie materiału
   */
  static async updateMaterialUsage(
    id: number,
    usedQuantity: number,
    serialNumbers?: string[]
  ): Promise<TaskMaterial> {
    const materialRepository = AppDataSource.getRepository(TaskMaterial);
    
    const material = await materialRepository.findOne({
      where: { id }
    });

    if (!material) {
      throw new Error('Materiał nie znaleziony');
    }

    const oldQuantity = material.usedQuantity;
    material.usedQuantity = usedQuantity;
    
    if (serialNumbers) {
      material.serialNumbers = serialNumbers;
    }

    const savedMaterial = await materialRepository.save(material);

    // Wykonaj triggery ON_QUANTITY_CHANGE jeśli ilość się zmieniła
    if (oldQuantity !== usedQuantity) {
      try {
        await BomTriggerService.executeTriggers('ON_QUANTITY_CHANGE', {
          materialId: id,
          taskId: material.taskId,
          materialName: material.materialName,
          oldQuantity,
          newQuantity: usedQuantity,
          quantityDifference: usedQuantity - oldQuantity
        });
      } catch (error) {
        console.error('Błąd wykonania triggerów ON_QUANTITY_CHANGE:', error);
      }
    }

    return savedMaterial;
  }
}
