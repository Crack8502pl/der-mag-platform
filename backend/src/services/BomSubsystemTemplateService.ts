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
  id?: number; // Optional ID for updates
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
    
    const findOptions = {
      relations: ['items', 'items.warehouseStock', 'items.dependsOnItem'],
      order: {
        version: 'DESC' as const,
        items: {
          sortOrder: 'ASC' as const
        }
      }
    };

    // First try exact variant match
    if (taskVariant) {
      const exactMatch = await templateRepository.findOne({
        where: { subsystemType, taskVariant, isActive: true },
        ...findOptions
      });
      if (exactMatch) return exactMatch;
      
      // Fallback: try general template
      const fallback = await templateRepository.findOne({
        where: { subsystemType, taskVariant: In([null, '_GENERAL']), isActive: true },
        ...findOptions
      });
      return fallback;
    }
    
    // No variant specified - look for general template
    return await templateRepository.findOne({
      where: { subsystemType, taskVariant: In([null, '_GENERAL']), isActive: true },
      ...findOptions
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
      const existingItemIds = new Set(template.items.map(item => item.id));
      const updatedItemIds = new Set(data.items.filter(item => item.id).map(item => item.id));
      
      // Delete items that were removed (exist in DB but not in update data)
      const itemsToRemove = template.items.filter(item => !updatedItemIds.has(item.id));
      if (itemsToRemove.length > 0) {
        await itemRepository.remove(itemsToRemove);
      }

      // Process each item: update existing or create new
      template.items = [];
      for (const itemData of data.items) {
        let item: BomSubsystemTemplateItem;
        
        if (itemData.id && existingItemIds.has(itemData.id)) {
          // Update existing item
          item = await itemRepository.findOne({ where: { id: itemData.id } }) as BomSubsystemTemplateItem;
          if (item) {
            // Update fields - maintain consistency with create path
            item.materialName = itemData.materialName;
            item.catalogNumber = itemData.catalogNumber;
            item.unit = itemData.unit || 'szt';
            item.defaultQuantity = itemData.defaultQuantity;
            item.quantitySource = itemData.quantitySource || QuantitySource.FIXED;
            item.configParamName = itemData.configParamName ?? null;
            item.warehouseStockId = itemData.warehouseStockId ?? null;
            item.dependsOnItemId = itemData.dependsOnItemId ?? null;
            item.dependencyFormula = itemData.dependencyFormula ?? null;
            item.requiresIp = itemData.requiresIp || false;
            item.isRequired = itemData.isRequired !== false;
            item.groupName = itemData.groupName;
            item.sortOrder = itemData.sortOrder || 0;
            item.notes = itemData.notes;
          }
        } else {
          // Create new item
          item = itemRepository.create({
            templateId: id,
            materialName: itemData.materialName,
            catalogNumber: itemData.catalogNumber,
            unit: itemData.unit || 'szt',
            defaultQuantity: itemData.defaultQuantity,
            quantitySource: itemData.quantitySource || QuantitySource.FIXED,
            configParamName: itemData.configParamName,
            warehouseStockId: itemData.warehouseStockId,
            dependsOnItemId: itemData.dependsOnItemId,
            dependencyFormula: itemData.dependencyFormula,
            requiresIp: itemData.requiresIp || false,
            isRequired: itemData.isRequired !== false,
            groupName: itemData.groupName,
            sortOrder: itemData.sortOrder || 0,
            notes: itemData.notes
          });
        }
        
        template.items.push(item);
      }
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
