// src/services/BOMService.ts
// Serwis zarządzania Bill of Materials

import { AppDataSource } from '../config/database';
import { BOMTemplate } from '../entities/BOMTemplate';
import { TaskMaterial } from '../entities/TaskMaterial';

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
    return await bomRepository.save(template);
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

    material.usedQuantity = usedQuantity;
    
    if (serialNumbers) {
      material.serialNumbers = serialNumbers;
    }

    return await materialRepository.save(material);
  }
}
