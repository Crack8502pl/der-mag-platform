// src/utils/dependencyRuleEngine.ts
// Frontend version of the dependency rule engine for BOM templates
// Mirrors backend logic for client-side preview

import type {
  BomTemplateDependencyRule,
  BomTemplateDependencyRuleInput,
  BomTemplateDependencyRuleCondition
} from '../services/bomTemplateDependencyRule.service';

type AggregationType = 'SUM' | 'COUNT' | 'MIN' | 'MAX' | 'PRODUCT' | 'FIRST';
type MathOperation = 'NONE' | 'FLOOR_DIV' | 'MODULO' | 'ADD' | 'SUBTRACT' | 'MULTIPLY' | 'CEIL_DIV' | 'ROUND_DIV';
type ComparisonOperator = '>' | '<' | '>=' | '<=' | '==' | '!=' | 'BETWEEN';

export class DependencyRuleEngine {
  /**
   * Evaluate dependency rules and compute quantities for target items
   */
  static evaluate(
    rules: BomTemplateDependencyRule[],
    itemQuantities: Map<number, number>,
    selectedModels?: Record<string, { checked: boolean; quantity?: number }>
  ): Map<number, number> {
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

        // Step 2: Aggregate inputs
        const aggregatedValue = this.aggregateValues(
          inputValues,
          rule.aggregationType
        );

        // Step 3: Apply math operation
        const mathResult = this.applyMathOperation(
          aggregatedValue,
          rule.mathOperation,
          rule.mathOperand
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

      if (input.inputType === 'ITEM' && input.sourceItemId) {
        // Get value from item quantity
        value = itemQuantities.get(input.sourceItemId) || 0;

        // Check if we should skip this input based on only_if_selected
        if (input.onlyIfSelected && selectedModels) {
          // Simple check - in real implementation might need more sophisticated matching
          const isSelected = this.isItemSelected(input.sourceItemId, selectedModels);
          if (!isSelected) {
            continue; // Skip this input
          }
        }
      } else if (input.inputType === 'RULE_RESULT' && input.sourceRuleId) {
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
   * Check if an item is selected (simplified)
   */
  private static isItemSelected(
    itemId: number,
    selectedModels: Record<string, { checked: boolean; quantity?: number }>
  ): boolean {
    // For now, consider all items selected unless explicitly unchecked
    return Object.values(selectedModels).some(model => model.checked);
  }

  /**
   * Aggregate input values based on aggregation type
   */
  private static aggregateValues(
    values: number[],
    aggregationType: AggregationType
  ): number {
    if (values.length === 0) {
      return 0;
    }

    switch (aggregationType) {
      case 'SUM':
        return values.reduce((sum, val) => sum + val, 0);

      case 'COUNT':
        return values.length;

      case 'MIN':
        return Math.min(...values);

      case 'MAX':
        return Math.max(...values);

      case 'PRODUCT':
        return values.reduce((product, val) => product * val, 1);

      case 'FIRST':
        return values[0];

      default:
        return 0;
    }
  }

  /**
   * Apply math operation to aggregated value
   */
  private static applyMathOperation(
    value: number,
    operation: MathOperation,
    operand: number | null | undefined
  ): number {
    if (operation === 'NONE') {
      return value;
    }

    if (operand === null || operand === undefined) {
      console.warn(`Math operation ${operation} requires operand but none provided`);
      return value;
    }

    switch (operation) {
      case 'FLOOR_DIV':
        return operand !== 0 ? Math.floor(value / operand) : 0;

      case 'CEIL_DIV':
        return operand !== 0 ? Math.ceil(value / operand) : 0;

      case 'ROUND_DIV':
        return operand !== 0 ? Math.round(value / operand) : 0;

      case 'MODULO':
        return operand !== 0 ? value % operand : 0;

      case 'ADD':
        return value + operand;

      case 'SUBTRACT':
        return value - operand;

      case 'MULTIPLY':
        return value * operand;

      default:
        return value;
    }
  }

  /**
   * Evaluate conditions to determine final result
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

    // If no condition matches, return 0
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
      case '>':
        return value > condition.compareValue;

      case '<':
        return value < condition.compareValue;

      case '>=':
        return value >= condition.compareValue;

      case '<=':
        return value <= condition.compareValue;

      case '==':
        return value === condition.compareValue;

      case '!=':
        return value !== condition.compareValue;

      case 'BETWEEN':
        if (condition.compareValueMax === null || condition.compareValueMax === undefined) {
          return false;
        }
        return value >= condition.compareValue && value <= condition.compareValueMax;

      default:
        return false;
    }
  }
}

export default DependencyRuleEngine;
