// src/services/BomTemplateDependencyRuleService.ts
// CRUD operations for BOM template dependency rules

import { AppDataSource } from '../config/database';
import { BomTemplateDependencyRule } from '../entities/BomTemplateDependencyRule';
import { BomTemplateDependencyRuleInput } from '../entities/BomTemplateDependencyRuleInput';
import { BomTemplateDependencyRuleCondition } from '../entities/BomTemplateDependencyRuleCondition';

export class BomTemplateDependencyRuleService {
  /**
   * Get all rules for a template with relations
   */
  static async getRulesForTemplate(templateId: number): Promise<BomTemplateDependencyRule[]> {
    const ruleRepo = AppDataSource.getRepository(BomTemplateDependencyRule);

    const rules = await ruleRepo.find({
      where: { templateId },
      relations: ['inputs', 'inputs.sourceItem', 'inputs.sourceRule', 'conditions', 'targetItem'],
      order: {
        evaluationOrder: 'ASC',
        inputs: {
          sortOrder: 'ASC'
        },
        conditions: {
          conditionOrder: 'ASC'
        }
      }
    });

    return rules;
  }

  /**
   * Get a single rule by ID with all relations
   */
  static async getRule(id: number): Promise<BomTemplateDependencyRule | null> {
    const ruleRepo = AppDataSource.getRepository(BomTemplateDependencyRule);

    const rule = await ruleRepo.findOne({
      where: { id },
      relations: ['inputs', 'inputs.sourceItem', 'inputs.sourceRule', 'conditions', 'targetItem', 'template']
    });

    return rule;
  }

  /**
   * Create a new rule with inputs and conditions in a single transaction
   */
  static async createRule(data: {
    templateId: number;
    ruleName: string;
    ruleCode?: string;
    description?: string;
    evaluationOrder?: number;
    aggregationType: string;
    mathOperation: string;
    mathOperand?: number;
    targetItemId: number;
    isActive?: boolean;
    targetWarehouseCategory?: string;
    selectionCriteria?: Record<string, unknown>;
    storageDaysParam?: string;
    storageBitrateMbps?: number;
    inputs?: Array<{
      inputType: string;
      sourceItemId?: number;
      sourceRuleId?: number;
      onlyIfSelected?: boolean;
      inputMultiplier?: number;
      sortOrder?: number;
    }>;
    conditions?: Array<{
      conditionOrder: number;
      comparisonOperator: string;
      compareValue: number;
      compareValueMax?: number;
      resultValue: number;
      description?: string;
    }>;
  }): Promise<BomTemplateDependencyRule> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ruleRepo = queryRunner.manager.getRepository(BomTemplateDependencyRule);
      const inputRepo = queryRunner.manager.getRepository(BomTemplateDependencyRuleInput);
      const conditionRepo = queryRunner.manager.getRepository(BomTemplateDependencyRuleCondition);

      // Create rule
      const rule = ruleRepo.create({
        templateId: data.templateId,
        ruleName: data.ruleName,
        ruleCode: data.ruleCode || null,
        description: data.description || null,
        evaluationOrder: data.evaluationOrder ?? 0,
        aggregationType: data.aggregationType as any,
        mathOperation: data.mathOperation as any,
        mathOperand: data.mathOperand || null,
        targetItemId: data.targetItemId,
        isActive: data.isActive ?? true,
        targetWarehouseCategory: data.targetWarehouseCategory || null,
        selectionCriteria: data.selectionCriteria || null,
        storageDaysParam: data.storageDaysParam || null,
        storageBitrateMbps: data.storageBitrateMbps ?? 4.0
      });

      const savedRule = await ruleRepo.save(rule);

      // Create inputs
      if (data.inputs && data.inputs.length > 0) {
        const inputs = data.inputs.map(input =>
          inputRepo.create({
            ruleId: savedRule.id,
            inputType: input.inputType as any,
            sourceItemId: input.sourceItemId || null,
            sourceRuleId: input.sourceRuleId || null,
            onlyIfSelected: input.onlyIfSelected ?? true,
            inputMultiplier: input.inputMultiplier ?? 1,
            sortOrder: input.sortOrder ?? 0
          })
        );
        await inputRepo.save(inputs);
      }

      // Create conditions
      if (data.conditions && data.conditions.length > 0) {
        const conditions = data.conditions.map(condition =>
          conditionRepo.create({
            ruleId: savedRule.id,
            conditionOrder: condition.conditionOrder,
            comparisonOperator: condition.comparisonOperator as any,
            compareValue: condition.compareValue,
            compareValueMax: condition.compareValueMax || null,
            resultValue: condition.resultValue,
            description: condition.description || null
          })
        );
        await conditionRepo.save(conditions);
      }

      await queryRunner.commitTransaction();

      // Reload rule with relations
      return await this.getRule(savedRule.id) as BomTemplateDependencyRule;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update a rule (delete old inputs/conditions, create new ones)
   */
  static async updateRule(
    id: number,
    data: {
      ruleName?: string;
      ruleCode?: string;
      description?: string;
      evaluationOrder?: number;
      aggregationType?: string;
      mathOperation?: string;
      mathOperand?: number;
      targetItemId?: number;
      isActive?: boolean;
      targetWarehouseCategory?: string;
      selectionCriteria?: Record<string, unknown>;
      storageDaysParam?: string;
      storageBitrateMbps?: number;
      inputs?: Array<{
        inputType: string;
        sourceItemId?: number;
        sourceRuleId?: number;
        onlyIfSelected?: boolean;
        inputMultiplier?: number;
        sortOrder?: number;
      }>;
      conditions?: Array<{
        conditionOrder: number;
        comparisonOperator: string;
        compareValue: number;
        compareValueMax?: number;
        resultValue: number;
        description?: string;
      }>;
    }
  ): Promise<BomTemplateDependencyRule> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ruleRepo = queryRunner.manager.getRepository(BomTemplateDependencyRule);
      const inputRepo = queryRunner.manager.getRepository(BomTemplateDependencyRuleInput);
      const conditionRepo = queryRunner.manager.getRepository(BomTemplateDependencyRuleCondition);

      // Find existing rule
      const rule = await ruleRepo.findOne({ where: { id } });
      if (!rule) {
        throw new Error(`Rule with id ${id} not found`);
      }

      // Update basic fields
      if (data.ruleName !== undefined) rule.ruleName = data.ruleName;
      if (data.ruleCode !== undefined) rule.ruleCode = data.ruleCode || null;
      if (data.description !== undefined) rule.description = data.description || null;
      if (data.evaluationOrder !== undefined) rule.evaluationOrder = data.evaluationOrder;
      if (data.aggregationType !== undefined) rule.aggregationType = data.aggregationType as any;
      if (data.mathOperation !== undefined) rule.mathOperation = data.mathOperation as any;
      if (data.mathOperand !== undefined) rule.mathOperand = data.mathOperand || null;
      if (data.targetItemId !== undefined) rule.targetItemId = data.targetItemId;
      if (data.isActive !== undefined) rule.isActive = data.isActive;
      if (data.targetWarehouseCategory !== undefined) rule.targetWarehouseCategory = data.targetWarehouseCategory || null;
      if (data.selectionCriteria !== undefined) rule.selectionCriteria = data.selectionCriteria || null;
      if (data.storageDaysParam !== undefined) rule.storageDaysParam = data.storageDaysParam || null;
      if (data.storageBitrateMbps !== undefined) rule.storageBitrateMbps = data.storageBitrateMbps ?? 4.0;

      await ruleRepo.save(rule);

      // Update inputs (delete all and recreate)
      if (data.inputs !== undefined) {
        await inputRepo.delete({ ruleId: id });

        if (data.inputs.length > 0) {
          const inputs = data.inputs.map(input =>
            inputRepo.create({
              ruleId: id,
              inputType: input.inputType as any,
              sourceItemId: input.sourceItemId || null,
              sourceRuleId: input.sourceRuleId || null,
              onlyIfSelected: input.onlyIfSelected ?? true,
              inputMultiplier: input.inputMultiplier ?? 1,
              sortOrder: input.sortOrder ?? 0
            })
          );
          await inputRepo.save(inputs);
        }
      }

      // Update conditions (delete all and recreate)
      if (data.conditions !== undefined) {
        await conditionRepo.delete({ ruleId: id });

        if (data.conditions.length > 0) {
          const conditions = data.conditions.map(condition =>
            conditionRepo.create({
              ruleId: id,
              conditionOrder: condition.conditionOrder,
              comparisonOperator: condition.comparisonOperator as any,
              compareValue: condition.compareValue,
              compareValueMax: condition.compareValueMax || null,
              resultValue: condition.resultValue,
              description: condition.description || null
            })
          );
          await conditionRepo.save(conditions);
        }
      }

      await queryRunner.commitTransaction();

      // Reload rule with relations
      return await this.getRule(id) as BomTemplateDependencyRule;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Delete a rule (cascade deletes inputs and conditions)
   */
  static async deleteRule(id: number): Promise<void> {
    const ruleRepo = AppDataSource.getRepository(BomTemplateDependencyRule);
    await ruleRepo.delete(id);
  }
}
