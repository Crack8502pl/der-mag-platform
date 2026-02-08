// tests/unit/services/DependencyRuleEngine.test.ts
// Unit tests for BOM Template Dependency Rule Engine

import { DependencyRuleEngine } from '../../../src/services/DependencyRuleEngine';
import {
  BomTemplateDependencyRule,
  AggregationType,
  MathOperation
} from '../../../src/entities/BomTemplateDependencyRule';
import { InputType } from '../../../src/entities/BomTemplateDependencyRuleInput';
import { ComparisonOperator } from '../../../src/entities/BomTemplateDependencyRuleCondition';

describe('DependencyRuleEngine', () => {
  describe('SUM aggregation', () => {
    it('should sum multiple item quantities', () => {
      const rule: any = {
        id: 1,
        evaluationOrder: 0,
        isActive: true,
        aggregationType: AggregationType.SUM,
        mathOperation: MathOperation.NONE,
        mathOperand: null,
        targetItemId: 100,
        inputs: [
          { inputType: InputType.ITEM, sourceItemId: 1, inputMultiplier: 1, sortOrder: 0, onlyIfSelected: false },
          { inputType: InputType.ITEM, sourceItemId: 2, inputMultiplier: 1, sortOrder: 1, onlyIfSelected: false },
          { inputType: InputType.ITEM, sourceItemId: 3, inputMultiplier: 1, sortOrder: 2, onlyIfSelected: false }
        ],
        conditions: []
      };

      const itemQuantities = new Map<number, number>([
        [1, 3],
        [2, 1],
        [3, 6]
      ]);

      const result = DependencyRuleEngine.evaluate([rule], itemQuantities);

      expect(result.get(100)).toBe(10); // 3 + 1 + 6 = 10
    });
  });

  describe('FLOOR_DIV operation', () => {
    it('should divide and floor the result', () => {
      const rule: any = {
        id: 2,
        evaluationOrder: 0,
        isActive: true,
        aggregationType: AggregationType.FIRST,
        mathOperation: MathOperation.FLOOR_DIV,
        mathOperand: 4,
        targetItemId: 101,
        inputs: [
          { inputType: InputType.ITEM, sourceItemId: 1, inputMultiplier: 1, sortOrder: 0, onlyIfSelected: false }
        ],
        conditions: []
      };

      const itemQuantities = new Map<number, number>([[1, 10]]);

      const result = DependencyRuleEngine.evaluate([rule], itemQuantities);

      expect(result.get(101)).toBe(2); // Math.floor(10 / 4) = 2
    });
  });

  describe('MODULO operation', () => {
    it('should calculate modulo', () => {
      const rule: any = {
        id: 3,
        evaluationOrder: 0,
        isActive: true,
        aggregationType: AggregationType.FIRST,
        mathOperation: MathOperation.MODULO,
        mathOperand: 4,
        targetItemId: 102,
        inputs: [
          { inputType: InputType.ITEM, sourceItemId: 1, inputMultiplier: 1, sortOrder: 0, onlyIfSelected: false }
        ],
        conditions: []
      };

      const itemQuantities = new Map<number, number>([[1, 10]]);

      const result = DependencyRuleEngine.evaluate([rule], itemQuantities);

      expect(result.get(102)).toBe(2); // 10 % 4 = 2
    });
  });

  describe('ADD operation', () => {
    it('should add operand to value', () => {
      const rule: any = {
        id: 4,
        evaluationOrder: 0,
        isActive: true,
        aggregationType: AggregationType.FIRST,
        mathOperation: MathOperation.ADD,
        mathOperand: 5,
        targetItemId: 103,
        inputs: [
          { inputType: InputType.ITEM, sourceItemId: 1, inputMultiplier: 1, sortOrder: 0, onlyIfSelected: false }
        ],
        conditions: []
      };

      const itemQuantities = new Map<number, number>([[1, 10]]);

      const result = DependencyRuleEngine.evaluate([rule], itemQuantities);

      expect(result.get(103)).toBe(15); // 10 + 5 = 15
    });
  });

  describe('SUBTRACT operation', () => {
    it('should subtract operand from value', () => {
      const rule: any = {
        id: 5,
        evaluationOrder: 0,
        isActive: true,
        aggregationType: AggregationType.FIRST,
        mathOperation: MathOperation.SUBTRACT,
        mathOperand: 3,
        targetItemId: 104,
        inputs: [
          { inputType: InputType.ITEM, sourceItemId: 1, inputMultiplier: 1, sortOrder: 0, onlyIfSelected: false }
        ],
        conditions: []
      };

      const itemQuantities = new Map<number, number>([[1, 10]]);

      const result = DependencyRuleEngine.evaluate([rule], itemQuantities);

      expect(result.get(104)).toBe(7); // 10 - 3 = 7
    });
  });

  describe('MULTIPLY operation', () => {
    it('should multiply value by operand', () => {
      const rule: any = {
        id: 6,
        evaluationOrder: 0,
        isActive: true,
        aggregationType: AggregationType.FIRST,
        mathOperation: MathOperation.MULTIPLY,
        mathOperand: 3,
        targetItemId: 105,
        inputs: [
          { inputType: InputType.ITEM, sourceItemId: 1, inputMultiplier: 1, sortOrder: 0, onlyIfSelected: false }
        ],
        conditions: []
      };

      const itemQuantities = new Map<number, number>([[1, 10]]);

      const result = DependencyRuleEngine.evaluate([rule], itemQuantities);

      expect(result.get(105)).toBe(30); // 10 * 3 = 30
    });
  });

  describe('CEIL_DIV operation', () => {
    it('should divide and ceil the result', () => {
      const rule: any = {
        id: 7,
        evaluationOrder: 0,
        isActive: true,
        aggregationType: AggregationType.FIRST,
        mathOperation: MathOperation.CEIL_DIV,
        mathOperand: 4,
        targetItemId: 106,
        inputs: [
          { inputType: InputType.ITEM, sourceItemId: 1, inputMultiplier: 1, sortOrder: 0, onlyIfSelected: false }
        ],
        conditions: []
      };

      const itemQuantities = new Map<number, number>([[1, 10]]);

      const result = DependencyRuleEngine.evaluate([rule], itemQuantities);

      expect(result.get(106)).toBe(3); // Math.ceil(10 / 4) = 3
    });
  });

  describe('Conditional results with BETWEEN', () => {
    it('should return correct result based on BETWEEN condition', () => {
      const rule: any = {
        id: 8,
        evaluationOrder: 0,
        isActive: true,
        aggregationType: AggregationType.SUM,
        mathOperation: MathOperation.NONE,
        mathOperand: null,
        targetItemId: 107,
        inputs: [
          { inputType: InputType.ITEM, sourceItemId: 1, inputMultiplier: 1, sortOrder: 0, onlyIfSelected: false },
          { inputType: InputType.ITEM, sourceItemId: 2, inputMultiplier: 1, sortOrder: 1, onlyIfSelected: false }
        ],
        conditions: [
          {
            conditionOrder: 0,
            comparisonOperator: ComparisonOperator.BETWEEN,
            compareValue: 1,
            compareValueMax: 5,
            resultValue: 1
          },
          {
            conditionOrder: 1,
            comparisonOperator: ComparisonOperator.BETWEEN,
            compareValue: 6,
            compareValueMax: 10,
            resultValue: 3
          },
          {
            conditionOrder: 2,
            comparisonOperator: ComparisonOperator.GT,
            compareValue: 10,
            compareValueMax: null,
            resultValue: 5
          }
        ]
      };

      // Test case 1: sum = 4 (1-5 range) -> result should be 1
      const itemQuantities1 = new Map<number, number>([
        [1, 3],
        [2, 1]
      ]);
      const result1 = DependencyRuleEngine.evaluate([rule], itemQuantities1);
      expect(result1.get(107)).toBe(1);

      // Test case 2: sum = 10 (6-10 range) -> result should be 3
      const itemQuantities2 = new Map<number, number>([
        [1, 6],
        [2, 4]
      ]);
      const result2 = DependencyRuleEngine.evaluate([rule], itemQuantities2);
      expect(result2.get(107)).toBe(3);

      // Test case 3: sum = 15 (>10) -> result should be 5
      const itemQuantities3 = new Map<number, number>([
        [1, 10],
        [2, 5]
      ]);
      const result3 = DependencyRuleEngine.evaluate([rule], itemQuantities3);
      expect(result3.get(107)).toBe(5);
    });
  });

  describe('Rule chaining', () => {
    it('should use result from previous rule as input', () => {
      const rule1: any = {
        id: 9,
        evaluationOrder: 0,
        isActive: true,
        aggregationType: AggregationType.FIRST,
        mathOperation: MathOperation.FLOOR_DIV,
        mathOperand: 4,
        targetItemId: 108,
        inputs: [
          { inputType: InputType.ITEM, sourceItemId: 1, inputMultiplier: 1, sortOrder: 0, onlyIfSelected: false }
        ],
        conditions: []
      };

      const rule2: any = {
        id: 10,
        evaluationOrder: 1,
        isActive: true,
        aggregationType: AggregationType.FIRST,
        mathOperation: MathOperation.ADD,
        mathOperand: 1,
        targetItemId: 109,
        inputs: [
          { inputType: InputType.RULE_RESULT, sourceRuleId: 9, inputMultiplier: 1, sortOrder: 0, onlyIfSelected: false }
        ],
        conditions: []
      };

      const itemQuantities = new Map<number, number>([[1, 10]]);

      const result = DependencyRuleEngine.evaluate([rule1, rule2], itemQuantities);

      expect(result.get(108)).toBe(2); // Rule 1: floor(10/4) = 2
      expect(result.get(109)).toBe(3); // Rule 2: 2 + 1 = 3
    });
  });

  describe('Empty inputs', () => {
    it('should return 0 for empty inputs', () => {
      const rule: any = {
        id: 11,
        evaluationOrder: 0,
        isActive: true,
        aggregationType: AggregationType.SUM,
        mathOperation: MathOperation.NONE,
        mathOperand: null,
        targetItemId: 110,
        inputs: [],
        conditions: []
      };

      const itemQuantities = new Map<number, number>();

      const result = DependencyRuleEngine.evaluate([rule], itemQuantities);

      expect(result.get(110)).toBe(0);
    });
  });

  describe('No matching conditions', () => {
    it('should return 0 when no conditions match', () => {
      const rule: any = {
        id: 12,
        evaluationOrder: 0,
        isActive: true,
        aggregationType: AggregationType.FIRST,
        mathOperation: MathOperation.NONE,
        mathOperand: null,
        targetItemId: 111,
        inputs: [
          { inputType: InputType.ITEM, sourceItemId: 1, inputMultiplier: 1, sortOrder: 0, onlyIfSelected: false }
        ],
        conditions: [
          {
            conditionOrder: 0,
            comparisonOperator: ComparisonOperator.GT,
            compareValue: 100,
            compareValueMax: null,
            resultValue: 10
          }
        ]
      };

      const itemQuantities = new Map<number, number>([[1, 5]]);

      const result = DependencyRuleEngine.evaluate([rule], itemQuantities);

      expect(result.get(111)).toBe(0);
    });
  });

  describe('COUNT aggregation', () => {
    it('should count number of inputs', () => {
      const rule: any = {
        id: 13,
        evaluationOrder: 0,
        isActive: true,
        aggregationType: AggregationType.COUNT,
        mathOperation: MathOperation.NONE,
        mathOperand: null,
        targetItemId: 112,
        inputs: [
          { inputType: InputType.ITEM, sourceItemId: 1, inputMultiplier: 1, sortOrder: 0, onlyIfSelected: false },
          { inputType: InputType.ITEM, sourceItemId: 2, inputMultiplier: 1, sortOrder: 1, onlyIfSelected: false },
          { inputType: InputType.ITEM, sourceItemId: 3, inputMultiplier: 1, sortOrder: 2, onlyIfSelected: false }
        ],
        conditions: []
      };

      const itemQuantities = new Map<number, number>([
        [1, 5],
        [2, 10],
        [3, 15]
      ]);

      const result = DependencyRuleEngine.evaluate([rule], itemQuantities);

      expect(result.get(112)).toBe(3);
    });
  });

  describe('MIN aggregation', () => {
    it('should return minimum value', () => {
      const rule: any = {
        id: 14,
        evaluationOrder: 0,
        isActive: true,
        aggregationType: AggregationType.MIN,
        mathOperation: MathOperation.NONE,
        mathOperand: null,
        targetItemId: 113,
        inputs: [
          { inputType: InputType.ITEM, sourceItemId: 1, inputMultiplier: 1, sortOrder: 0, onlyIfSelected: false },
          { inputType: InputType.ITEM, sourceItemId: 2, inputMultiplier: 1, sortOrder: 1, onlyIfSelected: false },
          { inputType: InputType.ITEM, sourceItemId: 3, inputMultiplier: 1, sortOrder: 2, onlyIfSelected: false }
        ],
        conditions: []
      };

      const itemQuantities = new Map<number, number>([
        [1, 5],
        [2, 2],
        [3, 8]
      ]);

      const result = DependencyRuleEngine.evaluate([rule], itemQuantities);

      expect(result.get(113)).toBe(2);
    });
  });

  describe('MAX aggregation', () => {
    it('should return maximum value', () => {
      const rule: any = {
        id: 15,
        evaluationOrder: 0,
        isActive: true,
        aggregationType: AggregationType.MAX,
        mathOperation: MathOperation.NONE,
        mathOperand: null,
        targetItemId: 114,
        inputs: [
          { inputType: InputType.ITEM, sourceItemId: 1, inputMultiplier: 1, sortOrder: 0, onlyIfSelected: false },
          { inputType: InputType.ITEM, sourceItemId: 2, inputMultiplier: 1, sortOrder: 1, onlyIfSelected: false },
          { inputType: InputType.ITEM, sourceItemId: 3, inputMultiplier: 1, sortOrder: 2, onlyIfSelected: false }
        ],
        conditions: []
      };

      const itemQuantities = new Map<number, number>([
        [1, 5],
        [2, 2],
        [3, 8]
      ]);

      const result = DependencyRuleEngine.evaluate([rule], itemQuantities);

      expect(result.get(114)).toBe(8);
    });
  });

  describe('PRODUCT aggregation', () => {
    it('should multiply all values', () => {
      const rule: any = {
        id: 16,
        evaluationOrder: 0,
        isActive: true,
        aggregationType: AggregationType.PRODUCT,
        mathOperation: MathOperation.NONE,
        mathOperand: null,
        targetItemId: 115,
        inputs: [
          { inputType: InputType.ITEM, sourceItemId: 1, inputMultiplier: 1, sortOrder: 0, onlyIfSelected: false },
          { inputType: InputType.ITEM, sourceItemId: 2, inputMultiplier: 1, sortOrder: 1, onlyIfSelected: false }
        ],
        conditions: []
      };

      const itemQuantities = new Map<number, number>([
        [1, 3],
        [2, 4]
      ]);

      const result = DependencyRuleEngine.evaluate([rule], itemQuantities);

      expect(result.get(115)).toBe(12); // 3 * 4 = 12
    });
  });
});
