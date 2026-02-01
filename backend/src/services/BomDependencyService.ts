// src/services/BomDependencyService.ts
// Service for BOM Dependency Rules

import { AppDataSource } from '../config/database';
import { BomDependencyRule, DependencyCondition, DependencyAction } from '../entities/BomDependencyRule';

interface GetRulesParams {
  category?: string;
  systemType?: string;
  active?: boolean;
}

interface CreateRuleDto {
  name: string;
  description?: string;
  conditions: DependencyCondition[];
  conditionOperator: 'AND' | 'OR';
  actions: DependencyAction[];
  category?: string;
  systemType?: string;
  priority?: number;
  active?: boolean;
}

interface Material {
  category: string;
  quantity: number;
  ports?: number;
  [key: string]: any;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export class BomDependencyService {
  static async getRules(params: GetRulesParams) {
    const { category, systemType, active } = params;
    const repository = AppDataSource.getRepository(BomDependencyRule);

    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (systemType) {
      where.systemType = systemType;
    }

    if (active !== undefined) {
      where.active = active;
    }

    return repository.find({
      where,
      order: { priority: 'ASC', name: 'ASC' },
    });
  }

  static async getRule(id: number) {
    const repository = AppDataSource.getRepository(BomDependencyRule);
    return repository.findOne({ where: { id } });
  }

  static async createRule(data: CreateRuleDto) {
    const repository = AppDataSource.getRepository(BomDependencyRule);
    const rule = repository.create({
      ...data,
      priority: data.priority || 10,
      active: data.active !== undefined ? data.active : true,
    });

    return repository.save(rule);
  }

  static async updateRule(id: number, data: Partial<CreateRuleDto>) {
    const repository = AppDataSource.getRepository(BomDependencyRule);
    const rule = await repository.findOne({ where: { id } });

    if (!rule) {
      return null;
    }

    Object.assign(rule, data);
    return repository.save(rule);
  }

  static async deleteRule(id: number) {
    const repository = AppDataSource.getRepository(BomDependencyRule);
    const rule = await repository.findOne({ where: { id } });

    if (!rule) {
      throw new Error('Reguła nie znaleziona');
    }

    // Soft delete
    rule.active = false;
    await repository.save(rule);
  }

  static async validateBom(
    materials: Material[],
    category?: string,
    systemType?: string
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // Get applicable rules
    const rules = await this.getRules({
      category: category || undefined,
      systemType: systemType || undefined,
      active: true,
    });

    // Also get global rules (no category/systemType)
    const globalRules = await AppDataSource.getRepository(BomDependencyRule).find({
      where: { active: true, category: null as any, systemType: null as any },
      order: { priority: 'ASC' },
    });

    const allRules = [...rules, ...globalRules].sort((a, b) => a.priority - b.priority);

    // Build material context for evaluation
    const context: Record<string, any> = {};
    materials.forEach(m => {
      const key = m.category.toLowerCase();
      context[key] = m.quantity;
      context[`${key}_exists`] = m.quantity > 0;
      if (m.ports) {
        context[`${key}_ports`] = m.ports;
      }
    });

    // Evaluate each rule
    for (const rule of allRules) {
      const conditionsMet = this.evaluateConditions(rule, materials, context);

      if (conditionsMet) {
        // Execute actions
        for (const action of rule.actions) {
          const actionResult = this.executeAction(action, materials, context);
          
          if (!actionResult.success) {
            if (action.field === 'required') {
              result.errors.push(actionResult.message);
              result.valid = false;
            } else if (action.field === 'suggested') {
              result.suggestions.push(actionResult.message);
            } else {
              result.warnings.push(actionResult.message);
            }
          }
        }
      }
    }

    return result;
  }

  private static evaluateConditions(
    rule: BomDependencyRule,
    materials: Material[],
    context: Record<string, any>
  ): boolean {
    const results = rule.conditions.map(condition => {
      const material = materials.find(m => m.category === condition.materialCategory);
      
      if (condition.field === 'exists') {
        return condition.operator === 'exists' ? !!material && material.quantity > 0 : !material || material.quantity === 0;
      }

      if (condition.field === 'quantity' && material) {
        const value = material.quantity;
        switch (condition.operator) {
          case '>': return value > (condition.value as number);
          case '>=': return value >= (condition.value as number);
          case '=': return value === (condition.value as number);
          case '<': return value < (condition.value as number);
          case '<=': return value <= (condition.value as number);
          default: return false;
        }
      }

      return false;
    });

    return rule.conditionOperator === 'AND' 
      ? results.every(r => r) 
      : results.some(r => r);
  }

  private static executeAction(
    action: DependencyAction,
    materials: Material[],
    context: Record<string, any>
  ): { success: boolean; message: string } {
    const targetMaterial = materials.find(m => m.category === action.targetMaterialCategory);

    // Evaluate formula
    const result = this.evaluateFormula(action.formula, context);

    switch (action.field) {
      case 'required':
        if (!targetMaterial || targetMaterial.quantity === 0) {
          return {
            success: false,
            message: action.message || `${action.targetMaterialCategory} jest wymagany`,
          };
        }
        break;

      case 'minQuantity':
        if (!targetMaterial || targetMaterial.quantity < result) {
          return {
            success: false,
            message: action.message?.replace('{result}', String(result)) || 
                    `${action.targetMaterialCategory} wymaga minimum ${result} sztuk`,
          };
        }
        break;

      case 'minPorts':
        if (!targetMaterial || (targetMaterial.ports || 0) < result) {
          return {
            success: false,
            message: action.message?.replace('{result}', String(result)) || 
                    `${action.targetMaterialCategory} wymaga minimum ${result} portów`,
          };
        }
        break;

      case 'suggested':
        if (!targetMaterial || targetMaterial.quantity === 0) {
          return {
            success: false,
            message: action.message || `Zalecane: ${action.targetMaterialCategory}`,
          };
        }
        break;
    }

    return { success: true, message: '' };
  }

  private static evaluateFormula(formula: string, context: Record<string, any>): number {
    try {
      // Simple formula evaluation - replace variables with values
      let evalFormula = formula;
      
      // Replace variable names with values
      Object.keys(context).forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        evalFormula = evalFormula.replace(regex, String(context[key]));
      });

      // Safe evaluation (only allow numbers and basic math operators)
      if (!/^[\d\s+\-*/().Math]+$/.test(evalFormula)) {
        console.warn('Invalid formula:', formula);
        return 0;
      }

      // eslint-disable-next-line no-eval
      return eval(evalFormula);
    } catch (error) {
      console.error('Error evaluating formula:', formula, error);
      return 0;
    }
  }
}
