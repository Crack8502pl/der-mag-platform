// src/services/DependencyRuleEngine.ts
// Advanced dependency rules evaluation engine for BOM templates

import { BomTemplateDependencyRule, AggregationType, MathOperation } from '../entities/BomTemplateDependencyRule';
import { BomTemplateDependencyRuleInput, InputType } from '../entities/BomTemplateDependencyRuleInput';
import { BomTemplateDependencyRuleCondition, ComparisonOperator } from '../entities/BomTemplateDependencyRuleCondition';

export class DependencyRuleEngine {
  /**
   * Evaluate dependency rules and compute quantities for target items.
   * This method is async to support rules that require database lookups
   * (SELECT_RECORDER, SELECT_DISKS).
   *
   * @param rules Array of rules to evaluate (should be loaded with inputs and conditions relations)
   * @param itemQuantities Map of item ID to current quantity
   * @param selectedModels Optional map of model selections (for camera models, etc.)
   * @param configParams Optional configuration parameters (e.g. recordingDays)
   * @returns Updated map of item quantities including rule results
   */
  static async evaluate(
    rules: BomTemplateDependencyRule[],
    itemQuantities: Map<number, number>,
    selectedModels?: Record<string, { checked: boolean; quantity?: number }>,
    configParams?: Record<string, unknown>
  ): Promise<Map<number, number>> {
    // Sort rules by evaluation_order ASC
    const sortedRules = [...rules]
      .filter(rule => rule.isActive)
      .sort((a, b) => a.evaluationOrder - b.evaluationOrder);

    // Map to store rule results for chaining
    const ruleResults = new Map<number, number>();

    // Process each rule
    for (const rule of sortedRules) {
      try {
        // Step 1: Collect input values
        const inputValues = this.collectInputValues(
          rule,
          itemQuantities,
          ruleResults,
          selectedModels
        );

        // Step 2: Aggregate inputs (may be async for DB-backed aggregations)
        const aggregatedValue = await this.aggregateValues(
          inputValues,
          rule.aggregationType,
          rule
        );

        // Step 3: Apply math operation
        const mathResult = this.applyMathOperation(
          aggregatedValue,
          rule.mathOperation,
          rule.mathOperand,
          rule,
          configParams
        );

        // Step 4: Evaluate conditions (if any) or use math result directly
        const finalResult = rule.conditions && rule.conditions.length > 0
          ? this.evaluateConditions(mathResult, rule.conditions)
          : mathResult;

        // Step 5: Store result
        ruleResults.set(rule.id, finalResult);
        itemQuantities.set(rule.targetItemId, finalResult);
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id} (${rule.ruleName}):`, error);
        // On error, set target item quantity to 0
        itemQuantities.set(rule.targetItemId, 0);
      }
    }

    return itemQuantities;
  }

  /**
   * Collect input values from items or previous rule results
   */
  private static collectInputValues(
    rule: BomTemplateDependencyRule,
    itemQuantities: Map<number, number>,
    ruleResults: Map<number, number>,
    selectedModels?: Record<string, { checked: boolean; quantity?: number }>
  ): number[] {
    if (!rule.inputs || rule.inputs.length === 0) {
      return [];
    }

    const values: number[] = [];

    // Sort inputs by sort_order
    const sortedInputs = [...rule.inputs].sort((a, b) => a.sortOrder - b.sortOrder);

    for (const input of sortedInputs) {
      let value = 0;

      if (input.inputType === InputType.ITEM && input.sourceItemId) {
        // Get value from item quantity
        value = itemQuantities.get(input.sourceItemId) || 0;

        // Check if we should skip this input based on only_if_selected
        if (input.onlyIfSelected && selectedModels) {
          // Check if the item is selected (need to find the model key)
          // This is a simplified check - in real implementation, might need more sophisticated matching
          const isSelected = this.isItemSelected(input.sourceItemId, selectedModels);
          if (!isSelected) {
            continue; // Skip this input
          }
        }
      } else if (input.inputType === InputType.RULE_RESULT && input.sourceRuleId) {
        // Get value from previous rule result
        value = ruleResults.get(input.sourceRuleId) || 0;
      }

      // Apply input multiplier
      value *= input.inputMultiplier;
      values.push(value);
    }

    return values;
  }

  /**
   * Check if an item is selected (simplified - can be enhanced)
   */
  private static isItemSelected(
    itemId: number,
    selectedModels: Record<string, { checked: boolean; quantity?: number }>
  ): boolean {
    // For now, we consider all items selected unless explicitly unchecked
    // In a real implementation, you'd need to map itemId to model key
    // For simplicity, if any model is checked, we consider items selected
    return Object.values(selectedModels).some(model => model.checked);
  }

  /**
   * Aggregate input values based on aggregation type.
   * DB-backed aggregation types (SELECT_RECORDER, SELECT_DISKS) are resolved here.
   */
  private static async aggregateValues(
    values: number[],
    aggregationType: AggregationType,
    rule: BomTemplateDependencyRule
  ): Promise<number> {
    switch (aggregationType) {
      case AggregationType.SUM:
        return values.length === 0 ? 0 : values.reduce((sum, val) => sum + val, 0);

      case AggregationType.COUNT:
        return values.length;

      case AggregationType.MIN:
        return values.length === 0 ? 0 : Math.min(...values);

      case AggregationType.MAX:
        return values.length === 0 ? 0 : Math.max(...values);

      case AggregationType.PRODUCT:
        return values.length === 0 ? 0 : values.reduce((product, val) => product * val, 1);

      case AggregationType.FIRST:
        return values.length === 0 ? 0 : values[0];

      case AggregationType.SELECT_RECORDER: {
        // First input value is the camera count
        const cameraCount = values.length > 0 ? Math.round(values[0]) : 0;
        if (cameraCount <= 0) return 0;

        const { RecorderSelectionService } = await import('./RecorderSelectionService');
        const recorder = await RecorderSelectionService.selectRecorder(cameraCount);
        // Returns 1 if a recorder was found (quantity = 1 unit), 0 otherwise
        return recorder ? 1 : 0;
      }

      case AggregationType.SELECT_DISKS: {
        // values[0] = required storage in TB, values[1] = recorder warehouse_stock_id
        const requiredTb = values.length > 0 ? values[0] : 0;
        const recorderStockId = values.length > 1 ? Math.round(values[1]) : 0;

        if (requiredTb <= 0) return 0;

        // Look up recorder specification via warehouseStockId to get disk slots
        const { RecorderSelectionService } = await import('./RecorderSelectionService');
        const { DiskConfigurationService } = await import('./DiskConfigurationService');
        const { AppDataSource } = await import('../config/database');
        const { RecorderSpecification } = await import('../entities/RecorderSpecification');

        let diskSlots = 1;
        let recorderSpecId = 0;

        if (recorderStockId > 0) {
          const recorderSpec = await AppDataSource.getRepository(RecorderSpecification).findOne({
            where: { warehouseStockId: recorderStockId, isActive: true }
          });
          if (recorderSpec) {
            diskSlots = recorderSpec.diskSlots;
            recorderSpecId = recorderSpec.id;
          }
        }

        const diskSelections = await DiskConfigurationService.selectOptimalDisks(
          requiredTb,
          recorderSpecId,
          diskSlots
        );

        // Return total number of disks (sum of all quantities)
        return diskSelections.reduce((sum, s) => sum + s.quantity, 0);
      }

      default:
        return 0;
    }
  }

  /**
   * Apply math operation to aggregated value.
   * CALCULATE_STORAGE uses rule metadata and configParams for the formula.
   */
  private static applyMathOperation(
    value: number,
    operation: MathOperation,
    operand: number | null,
    rule?: BomTemplateDependencyRule,
    configParams?: Record<string, unknown>
  ): number {
    if (operation === MathOperation.NONE) {
      return value;
    }

    if (operation === MathOperation.CALCULATE_STORAGE) {
      // Formula: (cameras × bitrate_mbps) × (days × 0.0108)
      const bitrate = rule?.storageBitrateMbps != null ? Number(rule.storageBitrateMbps) : 4.0;
      const daysParam = rule?.storageDaysParam || 'recordingDays';
      const defaultDays = 14;
      const rawDays = configParams ? configParams[daysParam] : undefined;
      const coercedDays = rawDays !== undefined ? Number(rawDays) : defaultDays;
      const days = Number.isFinite(coercedDays) && !Number.isNaN(coercedDays) ? coercedDays : defaultDays;
      return value * bitrate * days * 0.0108;
    }

    if (operand === null || operand === undefined) {
      console.warn(`Math operation ${operation} requires operand but none provided`);
      return value;
    }

    switch (operation) {
      case MathOperation.FLOOR_DIV:
        return operand !== 0 ? Math.floor(value / operand) : 0;

      case MathOperation.CEIL_DIV:
        return operand !== 0 ? Math.ceil(value / operand) : 0;

      case MathOperation.ROUND_DIV:
        return operand !== 0 ? Math.round(value / operand) : 0;

      case MathOperation.MODULO:
        return operand !== 0 ? value % operand : 0;

      case MathOperation.ADD:
        return value + operand;

      case MathOperation.SUBTRACT:
        return value - operand;

      case MathOperation.MULTIPLY:
        return value * operand;

      default:
        return value;
    }
  }

  /**
   * Evaluate conditions to determine final result
   * Conditions are checked in order, first matching condition wins
   */
  private static evaluateConditions(
    value: number,
    conditions: BomTemplateDependencyRuleCondition[]
  ): number {
    if (conditions.length === 0) {
      return value;
    }

    // Sort conditions by condition_order
    const sortedConditions = [...conditions].sort((a, b) => a.conditionOrder - b.conditionOrder);

    for (const condition of sortedConditions) {
      if (this.checkCondition(value, condition)) {
        return condition.resultValue;
      }
    }

    // If no condition matches, return 0 (or could return the value itself)
    return 0;
  }

  /**
   * Check if value matches a condition
   */
  private static checkCondition(
    value: number,
    condition: BomTemplateDependencyRuleCondition
  ): boolean {
    switch (condition.comparisonOperator) {
      case ComparisonOperator.GT:
        return value > condition.compareValue;

      case ComparisonOperator.LT:
        return value < condition.compareValue;

      case ComparisonOperator.GTE:
        return value >= condition.compareValue;

      case ComparisonOperator.LTE:
        return value <= condition.compareValue;

      case ComparisonOperator.EQ:
        return value === condition.compareValue;

      case ComparisonOperator.NEQ:
        return value !== condition.compareValue;

      case ComparisonOperator.BETWEEN:
        if (condition.compareValueMax === null || condition.compareValueMax === undefined) {
          return false;
        }
        return value >= condition.compareValue && value <= condition.compareValueMax;

      default:
        return false;
    }
  }
}
