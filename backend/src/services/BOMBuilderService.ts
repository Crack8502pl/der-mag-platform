// src/services/BOMBuilderService.ts
// Serwis zarządzania szablonami BOM (Builder)

import { AppDataSource } from '../config/database';
import { BOMTemplate } from '../entities/BOMTemplate';
import { In } from 'typeorm';

export class BOMBuilderService {
  /**
   * Pobiera wszystkie materiały (katalog)
   */
  static async getAllMaterials(filters?: {
    category?: string;
    active?: boolean;
    search?: string;
  }): Promise<BOMTemplate[]> {
    const bomRepository = AppDataSource.getRepository(BOMTemplate);
    
    const queryBuilder = bomRepository.createQueryBuilder('bom')
      .leftJoinAndSelect('bom.taskType', 'taskType');

    if (filters?.category) {
      queryBuilder.andWhere('bom.category = :category', { category: filters.category });
    }

    if (filters?.active !== undefined) {
      queryBuilder.andWhere('bom.active = :active', { active: filters.active });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(bom.materialName ILIKE :search OR bom.catalogNumber ILIKE :search OR bom.description ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return await queryBuilder
      .orderBy('bom.category', 'ASC')
      .addOrderBy('bom.sortOrder', 'ASC')
      .addOrderBy('bom.materialName', 'ASC')
      .getMany();
  }

  /**
   * Pobiera unikalne kategorie materiałów
   */
  static async getCategories(): Promise<string[]> {
    const bomRepository = AppDataSource.getRepository(BOMTemplate);
    
    const result = await bomRepository
      .createQueryBuilder('bom')
      .select('DISTINCT bom.category', 'category')
      .where('bom.category IS NOT NULL')
      .andWhere('bom.active = :active', { active: true })
      .orderBy('bom.category', 'ASC')
      .getRawMany();

    return result.map(r => r.category).filter(Boolean);
  }

  /**
   * Pobiera szablon BOM dla typu zadania
   */
  static async getTaskTypeBOM(taskTypeId: number): Promise<BOMTemplate[]> {
    const bomRepository = AppDataSource.getRepository(BOMTemplate);
    
    return await bomRepository.find({
      where: { taskTypeId, active: true },
      relations: ['taskType'],
      order: { sortOrder: 'ASC', materialName: 'ASC' }
    });
  }

  /**
   * Tworzy szablon BOM dla typu zadania (batch)
   */
  static async createTaskTypeBOM(
    taskTypeId: number,
    materials: Array<Partial<BOMTemplate>>
  ): Promise<BOMTemplate[]> {
    const bomRepository = AppDataSource.getRepository(BOMTemplate);
    
    const templates = materials.map((material, index) => 
      bomRepository.create({
        ...material,
        taskTypeId,
        sortOrder: material.sortOrder ?? index
      })
    );

    return await bomRepository.save(templates);
  }

  /**
   * Aktualizuje szablon BOM (batch update)
   */
  static async updateTaskTypeBOM(
    taskTypeId: number,
    updates: {
      toCreate?: Array<Partial<BOMTemplate>>;
      toUpdate?: Array<{ id: number; data: Partial<BOMTemplate> }>;
      toDelete?: number[];
    }
  ): Promise<{ created: BOMTemplate[]; updated: BOMTemplate[]; deleted: number[] }> {
    const bomRepository = AppDataSource.getRepository(BOMTemplate);
    
    const result = {
      created: [] as BOMTemplate[],
      updated: [] as BOMTemplate[],
      deleted: [] as number[]
    };

    // Tworzenie nowych materiałów
    if (updates.toCreate && updates.toCreate.length > 0) {
      const newTemplates = updates.toCreate.map(material =>
        bomRepository.create({ ...material, taskTypeId })
      );
      result.created = await bomRepository.save(newTemplates);
    }

    // Aktualizacja istniejących materiałów
    if (updates.toUpdate && updates.toUpdate.length > 0) {
      for (const update of updates.toUpdate) {
        const template = await bomRepository.findOne({
          where: { id: update.id, taskTypeId }
        });
        
        if (template) {
          Object.assign(template, update.data);
          const saved = await bomRepository.save(template);
          result.updated.push(saved);
        }
      }
    }

    // Usuwanie materiałów (soft delete - ustawienie active = false)
    if (updates.toDelete && updates.toDelete.length > 0) {
      await bomRepository.update(
        { id: In(updates.toDelete), taskTypeId },
        { active: false }
      );
      result.deleted = updates.toDelete;
    }

    return result;
  }

  /**
   * Kopiuje szablon BOM z jednego typu zadania do drugiego
   */
  static async copyBOMTemplate(
    sourceTaskTypeId: number,
    targetTaskTypeId: number
  ): Promise<BOMTemplate[]> {
    const bomRepository = AppDataSource.getRepository(BOMTemplate);
    
    const sourceTemplates = await bomRepository.find({
      where: { taskTypeId: sourceTaskTypeId, active: true },
      order: { sortOrder: 'ASC' }
    });

    if (sourceTemplates.length === 0) {
      throw new Error('Brak szablonu BOM dla typu zadania źródłowego');
    }

    // Usuń istniejące szablony dla typu docelowego
    await bomRepository.update(
      { taskTypeId: targetTaskTypeId },
      { active: false }
    );

    // Skopiuj szablony
    const copiedTemplates = sourceTemplates.map(template => {
      const { id, uuid, taskType, createdAt, updatedAt, ...rest } = template;
      return bomRepository.create({
        ...rest,
        taskTypeId: targetTaskTypeId
      });
    });

    return await bomRepository.save(copiedTemplates);
  }

  /**
   * Dodaje pojedynczy materiał
   */
  static async createMaterial(data: Partial<BOMTemplate>): Promise<BOMTemplate> {
    const bomRepository = AppDataSource.getRepository(BOMTemplate);
    
    const material = bomRepository.create(data);
    return await bomRepository.save(material);
  }

  /**
   * Aktualizuje pojedynczy materiał
   */
  static async updateMaterial(id: number, data: Partial<BOMTemplate>): Promise<BOMTemplate | null> {
    const bomRepository = AppDataSource.getRepository(BOMTemplate);
    
    const material = await bomRepository.findOne({ where: { id } });
    
    if (!material) {
      return null;
    }

    Object.assign(material, data);
    return await bomRepository.save(material);
  }

  /**
   * Usuwa materiał (soft delete)
   */
  static async deleteMaterial(id: number): Promise<boolean> {
    const bomRepository = AppDataSource.getRepository(BOMTemplate);
    
    const result = await bomRepository.update(
      { id },
      { active: false }
    );

    return result.affected ? result.affected > 0 : false;
  }
}
