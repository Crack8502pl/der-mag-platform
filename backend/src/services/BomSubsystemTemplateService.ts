// src/services/BomSubsystemTemplateService.ts
// Service for managing BOM subsystem templates

import { AppDataSource } from '../config/database';
import { BomSubsystemTemplate, SubsystemType } from '../entities/BomSubsystemTemplate';
import { BomSubsystemTemplateItem, QuantitySource } from '../entities/BomSubsystemTemplateItem';
import {
  AggregationType,
  BomTemplateDependencyRule,
  MathOperation
} from '../entities/BomTemplateDependencyRule';
import { BomTemplateDependencyRuleInput, InputType } from '../entities/BomTemplateDependencyRuleInput';
import {
  BomTemplateDependencyRuleCondition,
  ComparisonOperator
} from '../entities/BomTemplateDependencyRuleCondition';
import { TaskMaterial } from '../entities/TaskMaterial';
import { Task } from '../entities/Task';
import { BomGroup } from '../entities/BomGroup';
import { EntityManager, In } from 'typeorm';
import {
  ImportMode,
  RecorderExportJson,
  RecorderSpecificationService
} from './RecorderSpecificationService';
import { DiskExportJson, DiskSpecificationService } from './DiskSpecificationService';

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

export interface BomImportExportRef {
  catalogNumber?: string | null;
  materialName?: string | null;
  ruleCode?: string | null;
  ruleName?: string | null;
  modelName?: string | null;
}

export interface BomTemplateRuleInputJson {
  inputType: InputType;
  sourceItemRef: BomImportExportRef | null;
  sourceRuleRef: BomImportExportRef | null;
  inputMultiplier: number;
  onlyIfSelected: boolean;
  sortOrder: number;
}

export interface BomTemplateRuleConditionJson {
  conditionOrder: number;
  comparisonOperator: string;
  compareValue: number;
  compareValueMax: number | null;
  resultValue: number;
  description: string | null;
}

export interface BomTemplateRuleJson {
  ruleName: string;
  ruleCode: string | null;
  evaluationOrder: number;
  aggregationType: string;
  mathOperation: string;
  mathOperand: number | null;
  isActive: boolean;
  storageDaysParam: string | null;
  storageBitrateMbps: number;
  targetWarehouseCategory: string | null;
  selectionCriteria: Record<string, unknown> | null;
  description: string | null;
  targetItemRef: BomImportExportRef | null;
  inputs: BomTemplateRuleInputJson[];
  conditions: BomTemplateRuleConditionJson[];
}

export interface BomTemplateItemJson {
  sortOrder: number;
  materialName: string;
  catalogNumber: string | undefined;
  unit: string;
  defaultQuantity: number;
  quantitySource: QuantitySource;
  configParamName: string | null | undefined;
  groupName: string | undefined;
  requiresIp: boolean;
  isRequired: boolean;
  notes: string | undefined;
}

export interface BomTemplateJson {
  subsystemType: SubsystemType;
  taskVariant: string | null;
  templateName: string;
  version: number;
  isActive: boolean;
  description: string | null;
  items: BomTemplateItemJson[];
  rules: BomTemplateRuleJson[];
}

export interface BomFullExportJson {
  exportVersion: string;
  exportedAt: string;
  templates: BomTemplateJson[];
  recorders: RecorderExportJson[];
  disks: DiskExportJson[];
}

export interface BomImportStats {
  templatesImported: number;
  rulesImported: number;
  recordersImported: number;
  disksImported: number;
  skipped: number;
  errors: string[];
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
        configParams.selectedModels,
        configParams
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

  static async exportAllToJson(): Promise<BomFullExportJson> {
    const templateRepository = AppDataSource.getRepository(BomSubsystemTemplate);
    const ruleRepository = AppDataSource.getRepository(BomTemplateDependencyRule);

    const templates = await templateRepository.find({
      where: { isActive: true },
      relations: ['items', 'items.warehouseStock'],
      order: {
        subsystemType: 'ASC',
        taskVariant: 'ASC',
        items: { sortOrder: 'ASC' }
      }
    });

    const templateIds = templates.map((template) => template.id);
    const rules = templateIds.length
      ? await ruleRepository.find({
          where: { templateId: In(templateIds), isActive: true },
          relations: ['inputs', 'inputs.sourceItem', 'inputs.sourceRule', 'conditions', 'targetItem'],
          order: {
            evaluationOrder: 'ASC',
            inputs: { sortOrder: 'ASC' },
            conditions: { conditionOrder: 'ASC' }
          }
        })
      : [];

    const rulesByTemplate = new Map<number, BomTemplateDependencyRule[]>();
    rules.forEach((rule) => {
      const existing = rulesByTemplate.get(rule.templateId) ?? [];
      existing.push(rule);
      rulesByTemplate.set(rule.templateId, existing);
    });

    const templatesJson: BomTemplateJson[] = templates.map((template) => ({
      subsystemType: template.subsystemType,
      taskVariant: template.taskVariant ?? null,
      templateName: template.templateName,
      version: Number(template.version),
      isActive: template.isActive,
      description: template.description ?? null,
      items: (template.items ?? []).map((item) => ({
        sortOrder: item.sortOrder,
        materialName: item.materialName,
        catalogNumber: item.catalogNumber,
        unit: item.unit,
        defaultQuantity: Number(item.defaultQuantity),
        quantitySource: item.quantitySource,
        configParamName: item.configParamName,
        groupName: item.groupName,
        requiresIp: item.requiresIp,
        isRequired: item.isRequired,
        notes: item.notes
      })),
      rules: (rulesByTemplate.get(template.id) ?? []).map((rule) => ({
        ruleName: rule.ruleName,
        ruleCode: rule.ruleCode,
        evaluationOrder: rule.evaluationOrder,
        aggregationType: rule.aggregationType,
        mathOperation: rule.mathOperation,
        mathOperand: rule.mathOperand,
        isActive: rule.isActive,
        storageDaysParam: rule.storageDaysParam,
        storageBitrateMbps: Number(rule.storageBitrateMbps),
        targetWarehouseCategory: rule.targetWarehouseCategory,
        selectionCriteria: rule.selectionCriteria,
        description: rule.description,
        targetItemRef: rule.targetItem
          ? {
              catalogNumber: rule.targetItem.catalogNumber ?? null,
              materialName: rule.targetItem.materialName
            }
          : null,
        inputs: (rule.inputs ?? []).map((input) => ({
          inputType: input.inputType,
          sourceItemRef: input.sourceItem
            ? {
                catalogNumber: input.sourceItem.catalogNumber ?? null,
                materialName: input.sourceItem.materialName
              }
            : null,
          sourceRuleRef: input.sourceRule
            ? {
                ruleCode: input.sourceRule.ruleCode ?? null,
                ruleName: input.sourceRule.ruleName
              }
            : null,
          inputMultiplier: Number(input.inputMultiplier),
          onlyIfSelected: input.onlyIfSelected,
          sortOrder: input.sortOrder
        })),
        conditions: (rule.conditions ?? []).map((condition) => ({
          conditionOrder: condition.conditionOrder,
          comparisonOperator: condition.comparisonOperator,
          compareValue: Number(condition.compareValue),
          compareValueMax: condition.compareValueMax !== null ? Number(condition.compareValueMax) : null,
          resultValue: Number(condition.resultValue),
          description: condition.description
        }))
      }))
    }));

    const [recorders, disks] = await Promise.all([
      RecorderSpecificationService.exportToJsonArray(),
      DiskSpecificationService.exportToJsonArray()
    ]);

    return {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      templates: templatesJson,
      recorders,
      disks
    };
  }

  static async importAllFromJson(
    data: Partial<BomFullExportJson>,
    options?: { mode?: ImportMode }
  ): Promise<BomImportStats> {
    const mode = options?.mode ?? 'SKIP';
    const stats: BomImportStats = {
      templatesImported: 0,
      rulesImported: 0,
      recordersImported: 0,
      disksImported: 0,
      skipped: 0,
      errors: []
    };

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;
      for (const templateData of data.templates ?? []) {
        try {
          const result = await this.importTemplateJson(templateData, manager, mode);
          stats.templatesImported += result.templatesImported;
          stats.rulesImported += result.rulesImported;
          stats.skipped += result.skipped;
          stats.errors.push(...result.errors);
        } catch (error: any) {
          stats.errors.push(
            `Szablon ${templateData.subsystemType}/${templateData.taskVariant ?? '_GENERAL'}: ${error.message}`
          );
        }
      }

      const recorderStats = await RecorderSpecificationService.importFromJsonArray(data.recorders ?? [], {
        mode,
        manager
      });
      stats.recordersImported += recorderStats.recordersImported;
      stats.skipped += recorderStats.skipped;
      stats.errors.push(...recorderStats.errors);

      const diskStats = await DiskSpecificationService.importFromJsonArray(data.disks ?? [], {
        mode,
        manager
      });
      stats.disksImported += diskStats.disksImported;
      stats.skipped += diskStats.skipped;
      stats.errors.push(...diskStats.errors);

      await queryRunner.commitTransaction();
      return stats;
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private static async importTemplateJson(
    templateData: BomTemplateJson,
    manager: EntityManager,
    mode: ImportMode
  ): Promise<Pick<BomImportStats, 'templatesImported' | 'rulesImported' | 'skipped' | 'errors'>> {
    const templateRepository = manager.getRepository(BomSubsystemTemplate);
    const itemRepository = manager.getRepository(BomSubsystemTemplateItem);
    const ruleRepository = manager.getRepository(BomTemplateDependencyRule);
    const ruleInputRepository = manager.getRepository(BomTemplateDependencyRuleInput);
    const ruleConditionRepository = manager.getRepository(BomTemplateDependencyRuleCondition);

    const result = {
      templatesImported: 0,
      rulesImported: 0,
      skipped: 0,
      errors: [] as string[]
    };

    const existingTemplateQuery = templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.items', 'items')
      .where('template.subsystemType = :subsystemType', { subsystemType: templateData.subsystemType });
    if (templateData.taskVariant === null) {
      existingTemplateQuery.andWhere('template.taskVariant IS NULL');
    } else {
      existingTemplateQuery.andWhere('template.taskVariant = :taskVariant', {
        taskVariant: templateData.taskVariant
      });
    }
    const existingTemplate = await existingTemplateQuery.getOne();

    if (existingTemplate && mode === 'SKIP') {
      result.skipped += 1;
      return result;
    }

    let template: BomSubsystemTemplate;
    if (existingTemplate) {
      template = existingTemplate;
      template.templateName = templateData.templateName;
      template.description = templateData.description ?? '';
      template.version = Number(templateData.version ?? template.version);
      template.isActive = templateData.isActive !== false;
      await templateRepository.save(template);
    } else {
      template = templateRepository.create({
        templateName: templateData.templateName,
        subsystemType: templateData.subsystemType,
        taskVariant: templateData.taskVariant ?? null,
        version: Number(templateData.version ?? 1),
        isActive: templateData.isActive !== false,
        description: templateData.description ?? '',
        items: []
      });
      template = await templateRepository.save(template);
    }

    const existingItems = await itemRepository.find({ where: { templateId: template.id } });
    const itemIdByStableKey = new Map<string, number>();
    existingItems.forEach((item) => {
      itemIdByStableKey.set(this.getItemStableKey(item.catalogNumber, item.materialName), item.id);
    });

    if (existingTemplate && mode === 'OVERWRITE') {
      if (existingItems.length > 0) {
        await itemRepository.delete({ templateId: template.id });
      }
      await ruleInputRepository
        .createQueryBuilder()
        .delete()
        .where('rule_id IN (SELECT id FROM bom_template_dependency_rules WHERE template_id = :templateId)', {
          templateId: template.id
        })
        .execute();
      await ruleConditionRepository
        .createQueryBuilder()
        .delete()
        .where('rule_id IN (SELECT id FROM bom_template_dependency_rules WHERE template_id = :templateId)', {
          templateId: template.id
        })
        .execute();
      await ruleRepository.delete({ templateId: template.id });
      itemIdByStableKey.clear();
    }

    const latestItems = mode === 'OVERWRITE' ? [] : existingItems;
    const existingItemByStableKey = new Map<string, BomSubsystemTemplateItem>();
    latestItems.forEach((existingItem) => {
      existingItemByStableKey.set(
        this.getItemStableKey(existingItem.catalogNumber, existingItem.materialName),
        existingItem
      );
    });

    for (const itemData of templateData.items ?? []) {
      const itemKey = this.getItemStableKey(itemData.catalogNumber, itemData.materialName);
      let item = existingItemByStableKey.get(itemKey);

      if (!item) {
        item = itemRepository.create({
          templateId: template.id
        });
      }

      item.materialName = itemData.materialName;
      item.catalogNumber = itemData.catalogNumber;
      item.unit = itemData.unit || 'szt';
      item.defaultQuantity = Number(itemData.defaultQuantity ?? 1);
      item.quantitySource = itemData.quantitySource ?? QuantitySource.FIXED;
      item.configParamName = itemData.configParamName ?? null;
      item.groupName = itemData.groupName;
      item.requiresIp = Boolean(itemData.requiresIp);
      item.isRequired = itemData.isRequired !== false;
      item.sortOrder = itemData.sortOrder ?? 0;
      item.notes = itemData.notes;
      item.dependsOnItemId = null;
      item.dependencyFormula = null;

      const savedItem = await itemRepository.save(item);
      itemIdByStableKey.set(itemKey, savedItem.id);
      existingItemByStableKey.set(itemKey, savedItem);
    }

    const templateRules = await ruleRepository.find({
      where: { templateId: template.id },
      relations: ['inputs', 'conditions']
    });
    const ruleIdByStableKey = new Map<string, number>();
    const existingRuleByStableKey = new Map<string, BomTemplateDependencyRule>();
    templateRules.forEach((rule) => {
      const ruleKey = this.getRuleStableKey(rule.ruleCode, rule.ruleName);
      ruleIdByStableKey.set(ruleKey, rule.id);
      existingRuleByStableKey.set(ruleKey, rule);
    });

    const savedRules: Array<{ ruleId: number; data: BomTemplateRuleJson }> = [];
    for (const ruleData of templateData.rules ?? []) {
      const targetItemId = this.resolveItemRef(ruleData.targetItemRef, itemIdByStableKey);
      if (!targetItemId) {
        result.errors.push(
          `Szablon ${templateData.subsystemType}/${templateData.taskVariant ?? '_GENERAL'}: nie znaleziono targetItemRef dla reguły ${ruleData.ruleCode || ruleData.ruleName}`
        );
        continue;
      }

      const stableRuleKey = this.getRuleStableKey(ruleData.ruleCode, ruleData.ruleName);
      let rule = existingRuleByStableKey.get(stableRuleKey);
      if (!rule) {
        rule = ruleRepository.create({ templateId: template.id });
      }

      rule.ruleName = ruleData.ruleName;
      rule.ruleCode = ruleData.ruleCode ?? null;
      rule.description = ruleData.description ?? null;
      rule.evaluationOrder = ruleData.evaluationOrder ?? 0;
      rule.aggregationType = this.toAggregationType(ruleData.aggregationType, result.errors, ruleData);
      rule.mathOperation = this.toMathOperation(ruleData.mathOperation, result.errors, ruleData);
      rule.mathOperand = ruleData.mathOperand;
      rule.targetItemId = targetItemId;
      rule.isActive = ruleData.isActive !== false;
      rule.targetWarehouseCategory = ruleData.targetWarehouseCategory ?? null;
      rule.selectionCriteria = ruleData.selectionCriteria ?? null;
      rule.storageDaysParam = ruleData.storageDaysParam ?? null;
      rule.storageBitrateMbps = Number(ruleData.storageBitrateMbps ?? 4.0);

      const savedRule = await ruleRepository.save(rule);
      ruleIdByStableKey.set(stableRuleKey, savedRule.id);
      existingRuleByStableKey.set(stableRuleKey, savedRule);
      savedRules.push({ ruleId: savedRule.id, data: ruleData });
      result.rulesImported += 1;
    }

    for (const { ruleId, data: ruleData } of savedRules) {
      await ruleInputRepository.delete({ ruleId });
      await ruleConditionRepository.delete({ ruleId });

      const inputsToSave: BomTemplateDependencyRuleInput[] = [];
      for (const inputData of ruleData.inputs ?? []) {
        const sourceItemId =
          inputData.inputType === InputType.ITEM ? this.resolveItemRef(inputData.sourceItemRef, itemIdByStableKey) : null;
        const sourceRuleId =
          inputData.inputType === InputType.RULE_RESULT
            ? this.resolveRuleRef(inputData.sourceRuleRef, ruleIdByStableKey)
            : null;

        if (inputData.inputType === InputType.ITEM && !sourceItemId) {
          result.errors.push(`Reguła ${ruleData.ruleCode || ruleData.ruleName}: brak sourceItemRef`);
          continue;
        }
        if (inputData.inputType === InputType.RULE_RESULT && !sourceRuleId) {
          result.errors.push(`Reguła ${ruleData.ruleCode || ruleData.ruleName}: brak sourceRuleRef`);
          continue;
        }

        inputsToSave.push(
          ruleInputRepository.create({
            ruleId,
            inputType: inputData.inputType,
            sourceItemId,
            sourceRuleId,
            onlyIfSelected: inputData.onlyIfSelected !== false,
            inputMultiplier: Number(inputData.inputMultiplier ?? 1),
            sortOrder: inputData.sortOrder ?? 0
          })
        );
      }

      if (inputsToSave.length > 0) {
        await ruleInputRepository.save(inputsToSave);
      }

      const conditionsToSave = (ruleData.conditions ?? []).map((conditionData) =>
        ruleConditionRepository.create({
          ruleId,
          conditionOrder: conditionData.conditionOrder ?? 0,
          comparisonOperator: this.toComparisonOperator(
            conditionData.comparisonOperator,
            result.errors,
            ruleData
          ),
          compareValue: Number(conditionData.compareValue ?? 0),
          compareValueMax: conditionData.compareValueMax !== null ? Number(conditionData.compareValueMax) : null,
          resultValue: Number(conditionData.resultValue ?? 0),
          description: conditionData.description ?? null
        })
      );

      if (conditionsToSave.length > 0) {
        await ruleConditionRepository.save(conditionsToSave);
      }
    }

    result.templatesImported += 1;
    return result;
  }

  private static getItemStableKey(catalogNumber?: string | null, materialName?: string | null): string {
    const stableKey = (catalogNumber?.trim() || materialName?.trim() || '').toLowerCase();
    if (!stableKey) {
      throw new Error('Brak stabilnego klucza pozycji BOM (catalogNumber/materialName)');
    }
    return stableKey;
  }

  private static getRuleStableKey(ruleCode?: string | null, ruleName?: string | null): string {
    const stableKey = (ruleCode?.trim() || ruleName?.trim() || '').toLowerCase();
    if (!stableKey) {
      throw new Error('Brak stabilnego klucza reguły (ruleCode/ruleName)');
    }
    return stableKey;
  }

  private static resolveItemRef(
    ref: BomImportExportRef | null,
    itemIdByStableKey: Map<string, number>
  ): number | null {
    if (!ref) return null;
    const key = this.getItemStableKey(ref.catalogNumber, ref.materialName);
    return itemIdByStableKey.get(key) ?? null;
  }

  private static resolveRuleRef(
    ref: BomImportExportRef | null,
    ruleIdByStableKey: Map<string, number>
  ): number | null {
    if (!ref) return null;
    const key = this.getRuleStableKey(ref.ruleCode, ref.ruleName);
    return ruleIdByStableKey.get(key) ?? null;
  }

  private static toAggregationType(
    value: string,
    errors: string[],
    ruleData: BomTemplateRuleJson
  ): AggregationType {
    if ((Object.values(AggregationType) as string[]).includes(value)) {
      return value as AggregationType;
    }
    errors.push(
      `Reguła ${ruleData.ruleCode || ruleData.ruleName}: nieznany aggregationType (${value}), ustawiono SUM`
    );
    return AggregationType.SUM;
  }

  private static toMathOperation(
    value: string,
    errors: string[],
    ruleData: BomTemplateRuleJson
  ): MathOperation {
    if ((Object.values(MathOperation) as string[]).includes(value)) {
      return value as MathOperation;
    }
    errors.push(
      `Reguła ${ruleData.ruleCode || ruleData.ruleName}: nieznany mathOperation (${value}), ustawiono NONE`
    );
    return MathOperation.NONE;
  }

  private static toComparisonOperator(
    value: string,
    errors: string[],
    ruleData: BomTemplateRuleJson
  ): ComparisonOperator {
    if ((Object.values(ComparisonOperator) as string[]).includes(value)) {
      return value as ComparisonOperator;
    }
    errors.push(
      `Reguła ${ruleData.ruleCode || ruleData.ruleName}: nieznany comparisonOperator (${value}), ustawiono ==`
    );
    return ComparisonOperator.EQ;
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
