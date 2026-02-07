// src/services/BomSubsystemTemplateService.ts
// Service for managing BOM subsystem templates

import { AppDataSource } from '../config/database';
import { BomSubsystemTemplate, SubsystemType } from '../entities/BomSubsystemTemplate';
import { BomSubsystemTemplateItem, QuantitySource } from '../entities/BomSubsystemTemplateItem';
import { TaskMaterial } from '../entities/TaskMaterial';
import { Task } from '../entities/Task';
import { In } from 'typeorm';

export interface CreateTemplateDto {
  templateName: string;
  subsystemType: SubsystemType;
  taskVariant?: string | null;
  description?: string;
  items: CreateTemplateItemDto[];
  createdById?: number;
}

export interface CreateTemplateItemDto {
  warehouseStockId?: number;
  materialName: string;
  catalogNumber?: string;
  unit?: string;
  defaultQuantity: number;
  quantitySource?: QuantitySource;
  configParamName?: string;
  dependsOnItemId?: number;
  dependencyFormula?: string;
  requiresIp?: boolean;
  isRequired?: boolean;
  groupName?: string;
  sortOrder?: number;
  notes?: string;
}

export interface UpdateTemplateDto extends Partial<CreateTemplateDto> {
  isActive?: boolean;
  updatedById?: number;
}

export class BomSubsystemTemplateService {
  /**
   * Get all templates with optional filters
   */
  static async getAllTemplates(filters?: {
    subsystemType?: SubsystemType;
    taskVariant?: string;
    isActive?: boolean;
  }): Promise<BomSubsystemTemplate[]> {
    const templateRepository = AppDataSource.getRepository(BomSubsystemTemplate);
    
    const queryBuilder = templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.items', 'items')
      .leftJoinAndSelect('items.warehouseStock', 'warehouseStock')
      .orderBy('template.subsystemType', 'ASC')
      .addOrderBy('template.taskVariant', 'ASC')
      .addOrderBy('items.sortOrder', 'ASC');

    if (filters?.subsystemType) {
      queryBuilder.andWhere('template.subsystemType = :subsystemType', {
        subsystemType: filters.subsystemType
      });
    }

    if (filters?.taskVariant !== undefined) {
      if (filters.taskVariant === null) {
        queryBuilder.andWhere('template.taskVariant IS NULL');
      } else {
        queryBuilder.andWhere('template.taskVariant = :taskVariant', {
          taskVariant: filters.taskVariant
        });
      }
    }

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('template.isActive = :isActive', {
        isActive: filters.isActive
      });
    }

    return await queryBuilder.getMany();
  }

  /**
   * Get a specific template by ID
   */
  static async getTemplateById(id: number): Promise<BomSubsystemTemplate | null> {
    const templateRepository = AppDataSource.getRepository(BomSubsystemTemplate);
    
    return await templateRepository.findOne({
      where: { id },
      relations: ['items', 'items.warehouseStock', 'items.dependsOnItem']
    });
  }

  /**
   * Get active template for specific subsystem type and task variant
   */
  static async getTemplate(
    subsystemType: SubsystemType,
    taskVariant?: string | null
  ): Promise<BomSubsystemTemplate | null> {
    const templateRepository = AppDataSource.getRepository(BomSubsystemTemplate);
    
    const where: any = {
      subsystemType,
      isActive: true
    };

    if (taskVariant) {
      where.taskVariant = taskVariant;
    } else {
      where.taskVariant = In([null, '_GENERAL']);
    }

    return await templateRepository.findOne({
      where,
      relations: ['items', 'items.warehouseStock', 'items.dependsOnItem'],
      order: {
        version: 'DESC',
        items: {
          sortOrder: 'ASC'
        }
      }
    });
  }

  /**
   * Create a new template with items
   */
  static async createTemplate(data: CreateTemplateDto): Promise<BomSubsystemTemplate> {
    const templateRepository = AppDataSource.getRepository(BomSubsystemTemplate);
    
    // Create template
    const template = templateRepository.create({
      templateName: data.templateName,
      subsystemType: data.subsystemType,
      taskVariant: data.taskVariant || null,
      description: data.description,
      createdById: data.createdById,
      items: data.items.map(item => ({
        materialName: item.materialName,
        catalogNumber: item.catalogNumber,
        unit: item.unit || 'szt',
        defaultQuantity: item.defaultQuantity,
        quantitySource: item.quantitySource || QuantitySource.FIXED,
        configParamName: item.configParamName,
        warehouseStockId: item.warehouseStockId,
        dependsOnItemId: item.dependsOnItemId,
        dependencyFormula: item.dependencyFormula,
        requiresIp: item.requiresIp || false,
        isRequired: item.isRequired !== false,
        groupName: item.groupName,
        sortOrder: item.sortOrder || 0,
        notes: item.notes
      }))
    });

    return await templateRepository.save(template);
  }

  /**
   * Update an existing template
   */
  static async updateTemplate(
    id: number,
    data: UpdateTemplateDto
  ): Promise<BomSubsystemTemplate> {
    const templateRepository = AppDataSource.getRepository(BomSubsystemTemplate);
    const itemRepository = AppDataSource.getRepository(BomSubsystemTemplateItem);

    const template = await templateRepository.findOne({
      where: { id },
      relations: ['items']
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Update template fields
    if (data.templateName !== undefined) template.templateName = data.templateName;
    if (data.description !== undefined) template.description = data.description;
    if (data.isActive !== undefined) template.isActive = data.isActive;
    if (data.updatedById) template.updatedById = data.updatedById;

    // Update items if provided
    if (data.items) {
      // Remove old items
      if (template.items && template.items.length > 0) {
        await itemRepository.remove(template.items);
      }

      // Create new items
      template.items = data.items.map(item => 
        itemRepository.create({
          templateId: id,
          materialName: item.materialName,
          catalogNumber: item.catalogNumber,
          unit: item.unit || 'szt',
          defaultQuantity: item.defaultQuantity,
          quantitySource: item.quantitySource || QuantitySource.FIXED,
          configParamName: item.configParamName,
          warehouseStockId: item.warehouseStockId,
          dependsOnItemId: item.dependsOnItemId,
          dependencyFormula: item.dependencyFormula,
          requiresIp: item.requiresIp || false,
          isRequired: item.isRequired !== false,
          groupName: item.groupName,
          sortOrder: item.sortOrder || 0,
          notes: item.notes
        })
      );
    }

    return await templateRepository.save(template);
  }

  /**
   * Delete a template (soft delete - set isActive to false)
   */
  static async deleteTemplate(id: number): Promise<void> {
    const templateRepository = AppDataSource.getRepository(BomSubsystemTemplate);
    
    const template = await templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new Error('Template not found');
    }

    template.isActive = false;
    await templateRepository.save(template);
  }

  /**
   * Apply template to a task, generating task materials
   */
  static async applyTemplateToTask(
    taskId: number,
    templateId: number,
    configParams: Record<string, any>
  ): Promise<TaskMaterial[]> {
    const taskRepository = AppDataSource.getRepository(Task);
    const templateRepository = AppDataSource.getRepository(BomSubsystemTemplate);
    const taskMaterialRepository = AppDataSource.getRepository(TaskMaterial);

    // Load task
    const task = await taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new Error('Task not found');
    }

    // Load template with items
    const template = await templateRepository.findOne({
      where: { id: templateId },
      relations: ['items', 'items.warehouseStock']
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Resolve quantities and create task materials
    const taskMaterials: TaskMaterial[] = [];
    const itemQuantities = new Map<number, number>();

    // Sort items to process dependencies correctly
    const sortedItems = [...template.items].sort((a, b) => {
      if (a.quantitySource === QuantitySource.DEPENDENT && b.quantitySource !== QuantitySource.DEPENDENT) {
        return 1;
      }
      if (a.quantitySource !== QuantitySource.DEPENDENT && b.quantitySource === QuantitySource.DEPENDENT) {
        return -1;
      }
      return a.sortOrder - b.sortOrder;
    });

    for (const item of sortedItems) {
      let quantity = item.defaultQuantity;

      // Resolve quantity based on source
      switch (item.quantitySource) {
        case QuantitySource.FROM_CONFIG:
          if (item.configParamName && configParams[item.configParamName] !== undefined) {
            quantity = Number(configParams[item.configParamName]) || item.defaultQuantity;
          }
          break;

        case QuantitySource.PER_UNIT:
          if (item.configParamName && configParams[item.configParamName] !== undefined) {
            quantity = item.defaultQuantity * Number(configParams[item.configParamName]);
          }
          break;

        case QuantitySource.DEPENDENT:
          if (item.dependsOnItemId && itemQuantities.has(item.dependsOnItemId)) {
            const baseQuantity = itemQuantities.get(item.dependsOnItemId)!;
            quantity = this.evaluateDependencyFormula(
              baseQuantity,
              item.dependencyFormula || '* 1'
            );
          }
          break;

        case QuantitySource.FIXED:
        default:
          quantity = item.defaultQuantity;
          break;
      }

      // Store calculated quantity for dependent items
      itemQuantities.set(item.id, quantity);

      // Create task material
      const taskMaterial = taskMaterialRepository.create({
        taskId: task.id,
        materialName: item.materialName,
        plannedQuantity: quantity,
        unit: item.unit,
        category: item.groupName,
        notes: item.notes
      });

      taskMaterials.push(taskMaterial);
    }

    // Save all task materials
    return await taskMaterialRepository.save(taskMaterials);
  }

  /**
   * Evaluate dependency formula (simple math operations)
   */
  private static evaluateDependencyFormula(baseQuantity: number, formula: string): number {
    try {
      // Simple formula evaluation (e.g., "* 2", "+ 1", "/ 2", "- 1")
      const match = formula.match(/([*+\-/])\s*(\d+(?:\.\d+)?)/);
      if (match) {
        const [, operator, value] = match;
        const numValue = parseFloat(value);

        switch (operator) {
          case '*':
            return baseQuantity * numValue;
          case '+':
            return baseQuantity + numValue;
          case '-':
            return baseQuantity - numValue;
          case '/':
            return baseQuantity / numValue;
        }
      }
      
      // If formula doesn't match, return base quantity
      return baseQuantity;
    } catch (error) {
      console.error('Error evaluating formula:', error);
      return baseQuantity;
    }
  }
}
