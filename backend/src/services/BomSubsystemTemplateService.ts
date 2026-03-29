// src/services/BomSubsystemTemplateService.ts
// Service for managing BOM subsystem templates

import { AppDataSource } from '../config/database';
import { BomSubsystemTemplate, SubsystemType } from '../entities/BomSubsystemTemplate';
import { BomSubsystemTemplateItem, QuantitySource } from '../entities/BomSubsystemTemplateItem';
import { TaskMaterial } from '../entities/TaskMaterial';
import { Task } from '../entities/Task';
import { BomGroup } from '../entities/BomGroup';
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
    const bomGroupRepository = AppDataSource.getRepository(BomGroup);
    
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

    const templates = await queryBuilder.getMany();
    
    // Load BomGroups to get sortOrder
    const bomGroups = await bomGroupRepository.find({ where: { isActive: true } });
    const groupSortMap = new Map<string, number>();
    bomGroups.forEach(group => {
      groupSortMap.set(group.name, group.sortOrder);
    });
    
    // Sort items by group sortOrder (primary) then item sortOrder (secondary)
    templates.forEach(template => {
      if (template.items) {
        template.items.sort((a, b) => {
          const groupA = a.groupName || 'Inne';
          const groupB = b.groupName || 'Inne';
          const sortOrderA = groupSortMap.get(groupA) ?? 999;
          const sortOrderB = groupSortMap.get(groupB) ?? 999;
          
          if (sortOrderA !== sortOrderB) {
            return sortOrderA - sortOrderB;
          }
          return a.sortOrder - b.sortOrder;
        });
      }
    });
    
    return templates;
  }

  /**
   * Get a specific template by ID
   */
  static async getTemplateById(id: number): Promise<BomSubsystemTemplate | null> {
    const templateRepository = AppDataSource.getRepository(BomSubsystemTemplate);
    const bomGroupRepository = AppDataSource.getRepository(BomGroup);
    
    const template = await templateRepository.findOne({
      where: { id },
      relations: ['items', 'items.warehouseStock', 'items.dependsOnItem']
    });
    
    if (template && template.items) {
      // Load BomGroups to get sortOrder
      const bomGroups = await bomGroupRepository.find({ where: { isActive: true } });
      const groupSortMap = new Map<string, number>();
      bomGroups.forEach(group => {
        groupSortMap.set(group.name, group.sortOrder);
      });
      
      // Sort items by group sortOrder (primary) then item sortOrder (secondary)
      template.items.sort((a, b) => {
        const groupA = a.groupName || 'Inne';
        const groupB = b.groupName || 'Inne';
        const sortOrderA = groupSortMap.get(groupA) ?? 999;
        const sortOrderB = groupSortMap.get(groupB) ?? 999;
        
        if (sortOrderA !== sortOrderB) {
          return sortOrderA - sortOrderB;
        }
        return a.sortOrder - b.sortOrder;
      });
    }
    
    return template;
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
        // Round to integer if unit is 'szt' (pieces)
        defaultQuantity: (item.unit === 'szt' || !item.unit) 
          ? Math.round(item.defaultQuantity) 
          : item.defaultQuantity,
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
      
      // Count new items for versioning
      const newItems = data.items.filter(item => !item.id || !existingItemIds.has(item.id));
      const newItemCount = newItems.length;
      
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
            // Round to integer if unit is 'szt' (pieces)
            item.defaultQuantity = (item.unit === 'szt') 
              ? Math.round(itemData.defaultQuantity) 
              : itemData.defaultQuantity;
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
            
            // Save the updated item to persist changes
            await itemRepository.save(item);
          }
        } else {
          // Create new item
          const unit = itemData.unit || 'szt';
          item = itemRepository.create({
            templateId: id,
            materialName: itemData.materialName,
            catalogNumber: itemData.catalogNumber,
            unit: unit,
            // Round to integer if unit is 'szt' (pieces)
            defaultQuantity: (unit === 'szt') 
              ? Math.round(itemData.defaultQuantity) 
              : itemData.defaultQuantity,
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
      
      // Update version based on changes
      if (newItemCount === 0) {
        // Edit only (no new materials added): version += 0.01
        template.version = Number(template.version) + 0.01;
      } else if (newItemCount < 11) {
        // Added < 11 new materials: version += 0.1
        template.version = Number(template.version) + 0.1;
      } else {
        // Added >= 11 new materials: version += 1
        template.version = Number(template.version) + 1;
      }
      
      // Round to 2 decimal places using toFixed for reliable precision
      template.version = Number(template.version.toFixed(2));
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
          if (item.configParamName) {
            // Try both prefixed and unprefixed param names
            const prefixedName = `${item.groupName || 'Inne'}_${item.configParamName}`;
            const value = configParams[prefixedName] ?? configParams[item.configParamName];
            if (value !== undefined) {
              quantity = Number(value) || item.defaultQuantity;
            }
          }
          break;

        case QuantitySource.PER_UNIT:
          if (item.configParamName) {
            // Try both prefixed and unprefixed param names
            const prefixedName = `${item.groupName || 'Inne'}_${item.configParamName}`;
            const value = configParams[prefixedName] ?? configParams[item.configParamName];
            if (value !== undefined) {
              quantity = item.defaultQuantity * Number(value);
            }
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

      // Check if this item belongs to a camera/model-picker group
      // and was deselected by the user
      const groupNameLower = (item.groupName || '').toLowerCase();
      if (groupNameLower.includes('kamera') || groupNameLower.includes('lpr')) {
        const selectedModels = configParams.selectedModels;
        if (selectedModels && typeof selectedModels === 'object') {
          const modelKey = `${item.groupName}_selectedModels_${item.id}`;
          const modelState = selectedModels[modelKey];
          
          // Handle both old boolean format and new object format
          if (typeof modelState === 'boolean') {
            if (!modelState) {
              // This camera model was NOT selected — skip it
              continue;
            }
          } else if (typeof modelState === 'object' && modelState !== null) {
            if (!modelState.checked) {
              // This camera model was NOT selected — skip it
              continue;
            }
            // Use the per-item quantity if available
            if (modelState.quantity !== undefined) {
              quantity = modelState.quantity;
            }
          } else {
            // If no state exists for this model, skip it
            continue;
          }
        }
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
        notes: item.notes,
        requiresSerialNumber: item.requiresSerialNumber || false
      });

      taskMaterials.push(taskMaterial);
    }

    // Apply template dependency rules if any exist
    const { BomTemplateDependencyRuleService } = await import('./BomTemplateDependencyRuleService');
    const { DependencyRuleEngine } = await import('./DependencyRuleEngine');
    
    const depRules = await BomTemplateDependencyRuleService.getRulesForTemplate(templateId);
    if (depRules.length > 0) {
      // Evaluate rules and get updated quantities
      const updatedQuantities = await DependencyRuleEngine.evaluate(
        depRules,
        itemQuantities,
        configParams.selectedModels
      );
      
      // Update task materials with rule-computed quantities
      for (const taskMaterial of taskMaterials) {
        // Find the corresponding template item
        const templateItem = sortedItems.find(item => item.materialName === taskMaterial.materialName);
        if (templateItem) {
          const ruleQuantity = updatedQuantities.get(templateItem.id);
          if (ruleQuantity !== undefined) {
            taskMaterial.plannedQuantity = ruleQuantity;
          }
        }
      }
    }

    // Save all task materials
    return await taskMaterialRepository.save(taskMaterials);
  }

  /**
   * Generate empty CSV template with headers
   */
  static generateCsvTemplate(): string {
    const UTF8_BOM = '\uFEFF';
    const header = 'nazwa_materialu;numer_katalogowy;ilosc;jednostka;wymagane;grupa;wymaga_ip;notatki';
    return UTF8_BOM + header + '\n';
  }

  /**
   * Export template items to CSV string
   */
  static async exportTemplateToCsv(id: number): Promise<string> {
    const template = await this.getTemplateById(id);
    if (!template) {
      throw new Error('Template not found');
    }

    const UTF8_BOM = '\uFEFF';
    const header = 'nazwa_materialu;numer_katalogowy;ilosc;jednostka;wymagane;grupa;wymaga_ip;notatki';
    const rows = template.items.map(item => {
      const escapeCsv = (val: string | undefined | null) => {
        const str = val ?? '';
        if (str.includes(';') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      };
      return [
        escapeCsv(item.materialName),
        escapeCsv(item.catalogNumber),
        String(item.defaultQuantity),
        escapeCsv(item.unit),
        item.isRequired ? 'tak' : 'nie',
        escapeCsv(item.groupName),
        item.requiresIp ? 'tak' : 'nie',
        escapeCsv(item.notes)
      ].join(';');
    });

    return UTF8_BOM + header + '\n' + rows.join('\n');
  }

  /**
   * Import template from CSV content
   */
  static async importTemplateFromCsv(
    csvContent: string,
    metadata: {
      templateName: string;
      subsystemType: SubsystemType;
      taskVariant?: string | null;
      description?: string;
      createdById?: number;
    }
  ): Promise<BomSubsystemTemplate> {
    // Strip UTF-8 BOM if present
    const content = csvContent.startsWith('\uFEFF') ? csvContent.slice(1) : csvContent;

    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      throw new Error('CSV musi zawierać nagłówek i co najmniej jeden wiersz danych');
    }

    // Skip header row
    const dataLines = lines.slice(1);

    const parseCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ';' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
      result.push(current);
      return result;
    };

    const items = dataLines.map((line, idx) => {
      const cols = parseCsvLine(line);
      if (cols.length < 1 || !cols[0].trim()) {
        throw new Error(`Wiersz ${idx + 2}: brakuje nazwy materiału`);
      }
      return {
        materialName: cols[0].trim(),
        catalogNumber: cols[1]?.trim() || undefined,
        defaultQuantity: cols[2] ? parseFloat(cols[2].trim()) || 1 : 1,
        unit: cols[3]?.trim() || 'szt',
        isRequired: cols[4]?.trim().toLowerCase() !== 'nie',
        groupName: cols[5]?.trim() || undefined,
        requiresIp: cols[6]?.trim().toLowerCase() === 'tak',
        notes: cols[7]?.trim() || undefined,
        sortOrder: idx
      };
    });

    return await this.createTemplate({
      templateName: metadata.templateName,
      subsystemType: metadata.subsystemType,
      taskVariant: metadata.taskVariant,
      description: metadata.description,
      createdById: metadata.createdById,
      items
    });
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
