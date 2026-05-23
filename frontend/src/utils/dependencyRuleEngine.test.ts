// src/utils/dependencyRuleEngine.test.ts
import { DependencyRuleEngine } from './dependencyRuleEngine';
import type {
  BomTemplateDependencyRule,
  BomTemplateDependencyRuleInput,
  BomTemplateDependencyRuleCondition,
} from '../services/bomTemplateDependencyRule.service';

// ─── Helper factory functions ───────────────────────────────────────────────

function createMockRule(overrides: Partial<BomTemplateDependencyRule> = {}): BomTemplateDependencyRule {
  return {
    id: 1,
    templateId: 1,
    ruleName: 'Test Rule',
    ruleCode: null,
    description: null,
    evaluationOrder: 1,
    aggregationType: 'SUM',
    mathOperation: 'NONE',
    mathOperand: null,
    targetItemId: 100,
    isActive: true,
    targetWarehouseCategory: null,
    selectionCriteria: null,
    storageDaysParam: null,
    inputs: [],
    conditions: [],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  };
}

function createInput(
  overrides: Partial<BomTemplateDependencyRuleInput> = {},
): BomTemplateDependencyRuleInput {
  return {
    inputType: 'ITEM',
    sourceItemId: 1,
    sourceRuleId: null,
    onlyIfSelected: false,
    inputMultiplier: 1,
    sortOrder: 0,
    ...overrides,
  };
}

function createCondition(
  overrides: Partial<BomTemplateDependencyRuleCondition> = {},
): BomTemplateDependencyRuleCondition {
  return {
    conditionOrder: 0,
    comparisonOperator: '>',
    compareValue: 0,
    compareValueMax: null,
    resultValue: 10,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('DependencyRuleEngine.evaluate', () => {
  it('pusta lista reguł → niezmieniona mapa', () => {
    const items = new Map([[1, 5]]);
    const result = DependencyRuleEngine.evaluate([], items);
    expect(result.get(1)).toBe(5);
  });

  it('nieaktywna reguła (isActive=false) → pominięta', () => {
    const rule = createMockRule({ isActive: false, targetItemId: 100 });
    const items = new Map<number, number>();
    DependencyRuleEngine.evaluate([rule], items);
    expect(items.has(100)).toBe(false);
  });

  describe('agregacje', () => {
    it('SUM: suma wartości wejściowych', () => {
      const rule = createMockRule({
        aggregationType: 'SUM',
        targetItemId: 100,
        inputs: [
          createInput({ sourceItemId: 1, inputMultiplier: 1, sortOrder: 0 }),
          createInput({ sourceItemId: 2, inputMultiplier: 1, sortOrder: 1 }),
        ],
      });
      const items = new Map([[1, 3], [2, 7]]);
      DependencyRuleEngine.evaluate([rule], items);
      expect(items.get(100)).toBe(10);
    });

    it('COUNT: liczba wejść', () => {
      const rule = createMockRule({
        aggregationType: 'COUNT',
        targetItemId: 100,
        inputs: [
          createInput({ sourceItemId: 1, sortOrder: 0 }),
          createInput({ sourceItemId: 2, sortOrder: 1 }),
          createInput({ sourceItemId: 3, sortOrder: 2 }),
        ],
      });
      const items = new Map([[1, 10], [2, 20], [3, 30]]);
      DependencyRuleEngine.evaluate([rule], items);
      expect(items.get(100)).toBe(3);
    });

    it('MIN: minimalna wartość', () => {
      const rule = createMockRule({
        aggregationType: 'MIN',
        targetItemId: 100,
        inputs: [
          createInput({ sourceItemId: 1, sortOrder: 0 }),
          createInput({ sourceItemId: 2, sortOrder: 1 }),
        ],
      });
      const items = new Map([[1, 4], [2, 9]]);
      DependencyRuleEngine.evaluate([rule], items);
      expect(items.get(100)).toBe(4);
    });

    it('MAX: maksymalna wartość', () => {
      const rule = createMockRule({
        aggregationType: 'MAX',
        targetItemId: 100,
        inputs: [
          createInput({ sourceItemId: 1, sortOrder: 0 }),
          createInput({ sourceItemId: 2, sortOrder: 1 }),
        ],
      });
      const items = new Map([[1, 4], [2, 9]]);
      DependencyRuleEngine.evaluate([rule], items);
      expect(items.get(100)).toBe(9);
    });

    it('PRODUCT: iloczyn wartości', () => {
      const rule = createMockRule({
        aggregationType: 'PRODUCT',
        targetItemId: 100,
        inputs: [
          createInput({ sourceItemId: 1, sortOrder: 0 }),
          createInput({ sourceItemId: 2, sortOrder: 1 }),
        ],
      });
      const items = new Map([[1, 3], [2, 4]]);
      DependencyRuleEngine.evaluate([rule], items);
      expect(items.get(100)).toBe(12);
    });

    it('FIRST: pierwsza wartość (według sortOrder)', () => {
      const rule = createMockRule({
        aggregationType: 'FIRST',
        targetItemId: 100,
        inputs: [
          createInput({ sourceItemId: 1, sortOrder: 0 }),
          createInput({ sourceItemId: 2, sortOrder: 1 }),
        ],
      });
      const items = new Map([[1, 7], [2, 99]]);
      DependencyRuleEngine.evaluate([rule], items);
      expect(items.get(100)).toBe(7);
    });
  });

  describe('operacje matematyczne', () => {
    it('FLOOR_DIV: dzielenie podłogą', () => {
      const rule = createMockRule({
        aggregationType: 'SUM',
        mathOperation: 'FLOOR_DIV',
        mathOperand: 3,
        targetItemId: 100,
        inputs: [createInput({ sourceItemId: 1 })],
      });
      const items = new Map([[1, 10]]);
      DependencyRuleEngine.evaluate([rule], items);
      expect(items.get(100)).toBe(3); // floor(10/3) = 3
    });

    it('CEIL_DIV: dzielenie sufitem', () => {
      const rule = createMockRule({
        aggregationType: 'SUM',
        mathOperation: 'CEIL_DIV',
        mathOperand: 3,
        targetItemId: 100,
        inputs: [createInput({ sourceItemId: 1 })],
      });
      const items = new Map([[1, 10]]);
      DependencyRuleEngine.evaluate([rule], items);
      expect(items.get(100)).toBe(4); // ceil(10/3) = 4
    });

    it('ROUND_DIV: dzielenie z zaokrągleniem', () => {
      const rule = createMockRule({
        aggregationType: 'SUM',
        mathOperation: 'ROUND_DIV',
        mathOperand: 3,
        targetItemId: 100,
        inputs: [createInput({ sourceItemId: 1 })],
      });
      const items = new Map([[1, 10]]);
      DependencyRuleEngine.evaluate([rule], items);
      expect(items.get(100)).toBe(3); // round(10/3) = 3
    });

    it('ADD: dodawanie', () => {
      const rule = createMockRule({
        aggregationType: 'SUM',
        mathOperation: 'ADD',
        mathOperand: 5,
        targetItemId: 100,
        inputs: [createInput({ sourceItemId: 1 })],
      });
      const items = new Map([[1, 10]]);
      DependencyRuleEngine.evaluate([rule], items);
      expect(items.get(100)).toBe(15);
    });

    it('SUBTRACT: odejmowanie', () => {
      const rule = createMockRule({
        aggregationType: 'SUM',
        mathOperation: 'SUBTRACT',
        mathOperand: 3,
        targetItemId: 100,
        inputs: [createInput({ sourceItemId: 1 })],
      });
      const items = new Map([[1, 10]]);
      DependencyRuleEngine.evaluate([rule], items);
      expect(items.get(100)).toBe(7);
    });

    it('MULTIPLY: mnożenie', () => {
      const rule = createMockRule({
        aggregationType: 'SUM',
        mathOperation: 'MULTIPLY',
        mathOperand: 4,
        targetItemId: 100,
        inputs: [createInput({ sourceItemId: 1 })],
      });
      const items = new Map([[1, 5]]);
      DependencyRuleEngine.evaluate([rule], items);
      expect(items.get(100)).toBe(20);
    });

    it('MODULO: reszta z dzielenia', () => {
      const rule = createMockRule({
        aggregationType: 'SUM',
        mathOperation: 'MODULO',
        mathOperand: 4,
        targetItemId: 100,
        inputs: [createInput({ sourceItemId: 1 })],
      });
      const items = new Map([[1, 10]]);
      DependencyRuleEngine.evaluate([rule], items);
      expect(items.get(100)).toBe(2); // 10 % 4 = 2
    });

    it('dzielenie przez zero → wynik 0 (nie wyjątek)', () => {
      const rule = createMockRule({
        aggregationType: 'SUM',
        mathOperation: 'FLOOR_DIV',
        mathOperand: 0,
        targetItemId: 100,
        inputs: [createInput({ sourceItemId: 1 })],
      });
      const items = new Map([[1, 10]]);
      expect(() => DependencyRuleEngine.evaluate([rule], items)).not.toThrow();
      expect(items.get(100)).toBe(0);
    });
  });

  describe('warunki (conditions)', () => {
    it('warunek > spełniony → resultValue', () => {
      const rule = createMockRule({
        aggregationType: 'SUM',
        targetItemId: 100,
        inputs: [createInput({ sourceItemId: 1 })],
        conditions: [
          createCondition({
            comparisonOperator: '>',
            compareValue: 5,
            resultValue: 42,
            conditionOrder: 0,
          }),
        ],
      });
      const items = new Map([[1, 10]]);
      DependencyRuleEngine.evaluate([rule], items);
      expect(items.get(100)).toBe(42);
    });

    it('warunek BETWEEN spełniony → resultValue', () => {
      const rule = createMockRule({
        aggregationType: 'SUM',
        targetItemId: 100,
        inputs: [createInput({ sourceItemId: 1 })],
        conditions: [
          createCondition({
            comparisonOperator: 'BETWEEN',
            compareValue: 5,
            compareValueMax: 15,
            resultValue: 99,
            conditionOrder: 0,
          }),
        ],
      });
      const items = new Map([[1, 10]]);
      DependencyRuleEngine.evaluate([rule], items);
      expect(items.get(100)).toBe(99);
    });

    it('żaden warunek nie spełniony → 0', () => {
      const rule = createMockRule({
        aggregationType: 'SUM',
        targetItemId: 100,
        inputs: [createInput({ sourceItemId: 1 })],
        conditions: [
          createCondition({
            comparisonOperator: '>',
            compareValue: 100,
            resultValue: 42,
            conditionOrder: 0,
          }),
        ],
      });
      const items = new Map([[1, 5]]);
      DependencyRuleEngine.evaluate([rule], items);
      expect(items.get(100)).toBe(0);
    });

    it('warunek < sprawdzony poprawnie', () => {
      const rule = createMockRule({
        aggregationType: 'SUM',
        targetItemId: 100,
        inputs: [createInput({ sourceItemId: 1 })],
        conditions: [
          createCondition({
            comparisonOperator: '<',
            compareValue: 10,
            resultValue: 7,
            conditionOrder: 0,
          }),
        ],
      });
      const items = new Map([[1, 5]]);
      DependencyRuleEngine.evaluate([rule], items);
      expect(items.get(100)).toBe(7);
    });
  });

  describe('inputType=RULE_RESULT — kaskadowe reguły', () => {
    it('wynik reguły 1 jako wejście reguły 2', () => {
      const rule1 = createMockRule({
        id: 1,
        evaluationOrder: 1,
        aggregationType: 'SUM',
        targetItemId: 200,
        inputs: [createInput({ sourceItemId: 1, inputMultiplier: 1 })],
      });
      const rule2 = createMockRule({
        id: 2,
        evaluationOrder: 2,
        aggregationType: 'SUM',
        targetItemId: 300,
        inputs: [
          createInput({
            inputType: 'RULE_RESULT',
            sourceItemId: null,
            sourceRuleId: 1,
            inputMultiplier: 2,
            sortOrder: 0,
          }),
        ],
      });
      const items = new Map([[1, 5]]);
      DependencyRuleEngine.evaluate([rule1, rule2], items);
      expect(items.get(200)).toBe(5);  // rule1 result
      expect(items.get(300)).toBe(10); // rule2 uses rule1 result * 2
    });
  });

  describe('inputMultiplier', () => {
    it('aplikuje mnożnik do wartości wejściowej', () => {
      const rule = createMockRule({
        aggregationType: 'SUM',
        targetItemId: 100,
        inputs: [
          createInput({ sourceItemId: 1, inputMultiplier: 3 }),
        ],
      });
      const items = new Map([[1, 4]]);
      DependencyRuleEngine.evaluate([rule], items);
      expect(items.get(100)).toBe(12); // 4 * 3
    });
  });
});
