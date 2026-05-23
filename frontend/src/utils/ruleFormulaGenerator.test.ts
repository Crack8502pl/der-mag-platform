import type { BomSubsystemTemplateItem } from '../services/bomSubsystemTemplate.service';
import type {
  BomTemplateDependencyRule,
  BomTemplateDependencyRuleCondition,
  BomTemplateDependencyRuleInput,
} from '../services/bomTemplateDependencyRule.service';
import {
  calculateStoragePreviewTable,
  detectCircularReference,
  formatInputDescription,
  formatItemFullLabel,
  formatItemShortLabel,
  generateHumanReadableFormula,
  interpretCondition,
} from './ruleFormulaGenerator';

function createItem(overrides: Partial<BomSubsystemTemplateItem> = {}): BomSubsystemTemplateItem {
  return {
    id: 1,
    templateId: 1,
    warehouseStockId: 1,
    materialName: 'Kamera IP',
    catalogNumber: undefined,
    unit: 'szt',
    defaultQuantity: 2,
    quantitySource: 'FIXED',
    configParamName: undefined,
    dependsOnItemId: undefined,
    dependencyFormula: undefined,
    requiresIp: false,
    requiresSerialNumber: false,
    isRequired: true,
    groupName: undefined,
    sortOrder: 0,
    notes: undefined,
    warehouseStock: undefined,
    ...overrides,
  };
}

function createInput(overrides: Partial<BomTemplateDependencyRuleInput> = {}): BomTemplateDependencyRuleInput {
  return {
    id: 1,
    ruleId: 1,
    inputType: 'ITEM',
    sourceItemId: 1,
    sourceRuleId: null,
    onlyIfSelected: false,
    inputMultiplier: 1,
    sortOrder: 0,
    sourceItem: undefined,
    sourceRule: undefined,
    ...overrides,
  };
}

function createCondition(overrides: Partial<BomTemplateDependencyRuleCondition> = {}): BomTemplateDependencyRuleCondition {
  return {
    id: 1,
    ruleId: 1,
    conditionOrder: 0,
    comparisonOperator: '>',
    compareValue: 5,
    compareValueMax: null,
    resultValue: 2,
    description: null,
    ...overrides,
  };
}

function createRule(overrides: Partial<BomTemplateDependencyRule> = {}): BomTemplateDependencyRule {
  return {
    id: 1,
    templateId: 1,
    ruleName: 'Reguła A',
    ruleCode: null,
    description: null,
    evaluationOrder: 1,
    aggregationType: 'SUM',
    mathOperation: 'NONE',
    mathOperand: null,
    targetItemId: 1,
    isActive: true,
    targetWarehouseCategory: null,
    selectionCriteria: null,
    storageDaysParam: null,
    storageBitrateMbps: 4,
    inputs: [],
    conditions: [],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  };
}

describe('ruleFormulaGenerator', () => {
  it('formatItemShortLabel zwraca materialName', () => {
    const item = createItem({ materialName: 'Dysk 4TB' });

    const result = formatItemShortLabel(item);

    expect(result).toBe('Dysk 4TB');
  });

  it('formatItemFullLabel obsługuje FIXED bez groupName i catalogNumber', () => {
    const item = createItem({
      quantitySource: 'FIXED',
      sortOrder: 0,
      materialName: 'Kamera IP',
      defaultQuantity: 2,
      unit: 'szt',
      groupName: undefined,
      catalogNumber: undefined,
    });

    const result = formatItemFullLabel(item);

    expect(result).toBe('📌 [0] Kamera IP — 2 szt');
  });

  it('formatItemFullLabel obsługuje FROM_CONFIG z groupName i catalogNumber', () => {
    const item = createItem({
      sortOrder: 1,
      materialName: 'Dysk HDD',
      quantitySource: 'FROM_CONFIG',
      defaultQuantity: 1,
      unit: 'szt',
      configParamName: 'diskCount',
      groupName: 'Magazyn',
      catalogNumber: 'ABC-123',
    });

    const result = formatItemFullLabel(item);

    expect(result).toBe('⚙️ [1] Dysk HDD (Magazyn) — 1 szt [diskCount] [ABC-123]');
  });

  it('formatInputDescription: ITEM znaleziony i nieznaleziony', () => {
    const items = [createItem({ id: 10, materialName: 'Kamera IP' })];
    const foundInput = createInput({ inputType: 'ITEM', sourceItemId: 10, inputMultiplier: 2, onlyIfSelected: true });
    const missingInput = createInput({ inputType: 'ITEM', sourceItemId: 999 });

    const found = formatInputDescription(foundInput, items, []);
    const missing = formatInputDescription(missingInput, items, []);

    expect(found).toBe('"Kamera IP" × 2 (tylko jeśli wybrany)');
    expect(missing).toBe('nieznane wejście');
  });

  it('formatInputDescription: RULE_RESULT znaleziony i nieznaleziony + fallback', () => {
    const rules = [createRule({ id: 7, ruleName: 'Reguła 7' })];
    const foundInput = createInput({ inputType: 'RULE_RESULT', sourceRuleId: 7, sourceItemId: null, inputMultiplier: 2 });
    const missingInput = createInput({ inputType: 'RULE_RESULT', sourceRuleId: 999, sourceItemId: null });
    const fallbackInput = createInput({ inputType: 'ITEM', sourceItemId: null });

    const found = formatInputDescription(foundInput, [], rules);
    const missing = formatInputDescription(missingInput, [], rules);
    const fallback = formatInputDescription(fallbackInput, [], rules);

    expect(found).toBe('wynik reguły "Reguła 7" × 2');
    expect(missing).toBe('nieznane wejście');
    expect(fallback).toBe('nieznane wejście');
  });

  it('interpretCondition obsługuje >, <, ==, BETWEEN i nieznany operator', () => {
    expect(interpretCondition('>', 5, null, 2)).toBe('jeśli wynik większy niż 5 → ustaw ilość = 2');
    expect(interpretCondition('<', 5, null, 2)).toBe('jeśli wynik mniejszy niż 5 → ustaw ilość = 2');
    expect(interpretCondition('==', 5, null, 2)).toBe('jeśli wynik równy 5 → ustaw ilość = 2');
    expect(interpretCondition('BETWEEN', 5, 10, 2)).toBe('jeśli wynik w zakresie 5 i 10 → ustaw ilość = 2');
    expect(interpretCondition('???', 5, null, 2)).toBe('jeśli wynik ??? 5 → ustaw ilość = 2');
  });

  it('calculateStoragePreviewTable zwraca 5 wierszy i zachowuje proporcje', () => {
    const table = calculateStoragePreviewTable(4);

    expect(table).toHaveLength(5);
    expect(table[0].days7).toBeGreaterThan(0);
    expect(table[1].days7).toBeGreaterThan(table[0].days7);
    expect(table[2].days7).toBeGreaterThan(table[1].days7);
    expect(table[4].days7).toBeGreaterThan(table[3].days7);
    expect(table[0].days14).toBeGreaterThan(table[0].days7);
  });

  it('detectCircularReference: nowa reguła bez ID i brak cyklu zwraca null', () => {
    const noIdResult = detectCircularReference(undefined, [createInput({ inputType: 'RULE_RESULT', sourceRuleId: 1 })], []);

    const noCycleResult = detectCircularReference(
      3,
      [createInput({ inputType: 'RULE_RESULT', sourceRuleId: 1, sourceItemId: null })],
      [
        createRule({ id: 1, ruleName: 'A', inputs: [] }),
        createRule({ id: 2, ruleName: 'B', inputs: [createInput({ inputType: 'RULE_RESULT', sourceRuleId: 1, sourceItemId: null })] }),
        createRule({ id: 3, ruleName: 'C', inputs: [] }),
      ]
    );

    expect(noIdResult).toBeNull();
    expect(noCycleResult).toBeNull();
  });

  it('detectCircularReference wykrywa cykl i zwraca opis', () => {
    const result = detectCircularReference(
      3,
      [createInput({ inputType: 'RULE_RESULT', sourceRuleId: 1, sourceItemId: null })],
      [
        createRule({ id: 1, ruleName: 'A', inputs: [createInput({ inputType: 'RULE_RESULT', sourceRuleId: 2, sourceItemId: null })] }),
        createRule({ id: 2, ruleName: 'B', inputs: [createInput({ inputType: 'RULE_RESULT', sourceRuleId: 3, sourceItemId: null })] }),
        createRule({ id: 3, ruleName: 'C', inputs: [] }),
      ]
    );

    expect(result).toContain('Wykryto cykliczną referencję');
    expect(result).toContain('C → A → B → C');
  });

  it('generateHumanReadableFormula obsługuje SELECT_RECORDER i SELECT_DISKS', () => {
    const items = [createItem({ id: 2, materialName: 'Rejestrator' })];

    const recorder = generateHumanReadableFormula(
      {
        aggregationType: 'SELECT_RECORDER',
        mathOperation: 'NONE',
        inputs: [],
        conditions: [],
        targetItemId: 2,
      },
      items,
      []
    );

    const disks = generateHumanReadableFormula(
      {
        aggregationType: 'SELECT_DISKS',
        mathOperation: 'NONE',
        inputs: [],
        conditions: [],
        targetItemId: 2,
      },
      items,
      []
    );

    expect(recorder).toBe('🖥️ Automatyczny dobór rejestratora → wybór "Rejestrator"');
    expect(disks).toBe('💾 Automatyczny dobór dysków → wybór "Rejestrator"');
  });

  it('generateHumanReadableFormula obsługuje NONE, CEIL_DIV, ADD i warunki progowe', () => {
    const items = [
      createItem({ id: 1, materialName: 'Kamera IP' }),
      createItem({ id: 2, materialName: 'Dysk HDD' }),
    ];
    const inputs = [createInput({ inputType: 'ITEM', sourceItemId: 1 })];

    const noneFormula = generateHumanReadableFormula(
      {
        aggregationType: 'SUM',
        mathOperation: 'NONE',
        inputs,
        conditions: [],
        targetItemId: 2,
      },
      items,
      []
    );

    const ceilDivFormula = generateHumanReadableFormula(
      {
        aggregationType: 'SUM',
        mathOperation: 'CEIL_DIV',
        mathOperand: 8,
        inputs,
        conditions: [],
        targetItemId: 2,
      },
      items,
      []
    );

    const addWithConditionFormula = generateHumanReadableFormula(
      {
        aggregationType: 'SUM',
        mathOperation: 'ADD',
        mathOperand: 2,
        inputs,
        conditions: [createCondition()],
        targetItemId: 2,
      },
      items,
      []
    );

    expect(noneFormula).toBe('suma("Kamera IP") → ilość pozycji "Dysk HDD"');
    expect(ceilDivFormula).toBe('⌈suma("Kamera IP") ÷ 8⌉ → ilość pozycji "Dysk HDD"');
    expect(addWithConditionFormula).toBe('suma("Kamera IP") + 2 (z 1 warunkiem progowym) → ilość pozycji "Dysk HDD"');
  });
});
