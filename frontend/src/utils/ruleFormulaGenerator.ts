// src/utils/ruleFormulaGenerator.ts
// Utility functions and constants for generating human-readable BOM dependency rule formulas

import type { BomSubsystemTemplateItem } from '../services/bomSubsystemTemplate.service';
import type {
  BomTemplateDependencyRule,
  BomTemplateDependencyRuleInput,
  BomTemplateDependencyRuleCondition
} from '../services/bomTemplateDependencyRule.service';

// ========== EXPORTED CONSTANTS ==========

export const AGGREGATION_DESCRIPTIONS: Record<string, { icon: string; label: string; desc: string }> = {
  SUM:             { icon: '➕', label: 'Suma',                desc: 'Suma wartości wszystkich wejść' },
  COUNT:           { icon: '🔢', label: 'Liczba',              desc: 'Liczba wejść z wartością > 0' },
  MIN:             { icon: '⬇️', label: 'Minimum',             desc: 'Najmniejsza wartość z wejść' },
  MAX:             { icon: '⬆️', label: 'Maksimum',            desc: 'Największa wartość z wejść' },
  PRODUCT:         { icon: '✖️', label: 'Iloczyn',             desc: 'Iloczyn wszystkich wejść' },
  FIRST:           { icon: '1️⃣', label: 'Pierwsza wartość',   desc: 'Pierwsza wartość z wejść (pozostałe ignorowane)' },
  SELECT_RECORDER: { icon: '🖥️', label: 'Dobór rejestratora',  desc: 'Automatyczny dobór rejestratora wg ilości kamer – obsługiwane przez BomResolverService w Wizardzie' },
  SELECT_DISKS:    { icon: '💾', label: 'Dobór dysków',        desc: 'Automatyczny dobór dysków wg pojemności – obsługiwane przez BomResolverService w Wizardzie' },
};

export const MATH_DESCRIPTIONS: Record<string, { icon: string; label: string; desc: string; example: string }> = {
  NONE:              { icon: '🚫',  label: 'Brak',                       desc: 'Wynik agregacji bez żadnej zmiany',          example: 'wynik = agregacja' },
  ADD:               { icon: '➕',  label: 'Dodawanie',                   desc: 'Dodaj stałą wartość do wyniku agregacji',   example: 'wynik = agregacja + N' },
  SUBTRACT:          { icon: '➖',  label: 'Odejmowanie',                 desc: 'Odejmij stałą wartość od wyniku agregacji', example: 'wynik = agregacja − N' },
  MULTIPLY:          { icon: '✖️',  label: 'Mnożenie',                    desc: 'Pomnóż wynik agregacji przez stałą wartość',example: 'wynik = agregacja × N' },
  FLOOR_DIV:         { icon: '⬇️÷', label: 'Dzielenie (zaokr. w dół)',   desc: 'Podziel i zaokrąglij w dół (podłoga)',      example: 'wynik = ⌊agregacja ÷ N⌋' },
  CEIL_DIV:          { icon: '⬆️÷', label: 'Dzielenie (zaokr. w górę)',  desc: 'Podziel i zaokrąglij w górę (sufit)',       example: 'wynik = ⌈agregacja ÷ N⌉' },
  ROUND_DIV:         { icon: '≈÷',  label: 'Dzielenie (zaokr. std.)',    desc: 'Podziel i zaokrąglij standardowo',          example: 'wynik = round(agregacja ÷ N)' },
  MODULO:            { icon: '🔄',  label: 'Modulo',                     desc: 'Reszta z dzielenia przez stałą wartość',    example: 'wynik = agregacja mod N' },
  CALCULATE_STORAGE: { icon: '💾',  label: 'Oblicz pojemność dysków',    desc: 'Oblicza wymaganą pojemność: kamery × bitrate × dni', example: 'wynik = ⌈kamery × Mbps × dni × 86400 ÷ (8 × 10¹²)⌉' },
};

export const COMPARISON_LABELS: Record<string, string> = {
  '>': 'większy niż', '<': 'mniejszy niż', '>=': 'większy lub równy',
  '<=': 'mniejszy lub równy', '==': 'równy', '!=': 'różny od', 'BETWEEN': 'w zakresie',
};

export const QUANTITY_SOURCE_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  FIXED:       { icon: '📌', label: 'Stała',          color: '#3b82f6' },
  FROM_CONFIG: { icon: '⚙️', label: 'Z konfiguracji', color: '#8b5cf6' },
  PER_UNIT:    { icon: '🔄', label: 'Per jednostka',  color: '#10b981' },
  DEPENDENT:   { icon: '🔗', label: 'Zależna',        color: '#f59e0b' },
};

// ========== INTERFACES ==========

export interface StoragePreviewRow {
  cameras: number;
  days7: number;
  days14: number;
  days30: number;
  days60: number;
}

// ========== EXPORTED FUNCTIONS ==========

/**
 * Format item short label - just the material name
 */
export function formatItemShortLabel(item: BomSubsystemTemplateItem): string {
  return item.materialName;
}

/**
 * Format item full label with icon, sort order, name, group, quantity, and config param
 * Example: 📌 [0] Nazwa materiału (Grupa) — 2 szt [configParam]
 */
export function formatItemFullLabel(item: BomSubsystemTemplateItem): string {
  const sourceInfo = QUANTITY_SOURCE_LABELS[item.quantitySource] || { icon: '❓', label: 'Unknown' };
  const catalogPart = item.catalogNumber ? ` [${item.catalogNumber}]` : '';
  const quantityPart = item.quantitySource === 'FROM_CONFIG' && item.configParamName
    ? ` — ${item.defaultQuantity} ${item.unit} [${item.configParamName}]`
    : ` — ${item.defaultQuantity} ${item.unit}`;
  const groupPart = item.groupName ? ` (${item.groupName})` : '';

  return `${sourceInfo.icon} [${item.sortOrder}] ${item.materialName}${groupPart}${quantityPart}${catalogPart}`;
}

/**
 * Format input description in Polish
 */
export function formatInputDescription(
  input: BomTemplateDependencyRuleInput,
  templateItems: BomSubsystemTemplateItem[],
  existingRules: BomTemplateDependencyRule[]
): string {
  if (input.inputType === 'ITEM' && input.sourceItemId) {
    const item = templateItems.find(i => i.id === input.sourceItemId);
    if (item) {
      const multiplierPart = input.inputMultiplier !== 1 ? ` × ${input.inputMultiplier}` : '';
      const onlyIfPart = input.onlyIfSelected ? ' (tylko jeśli wybrany)' : '';
      return `"${item.materialName}"${multiplierPart}${onlyIfPart}`;
    }
  } else if (input.inputType === 'RULE_RESULT' && input.sourceRuleId) {
    const rule = existingRules.find(r => r.id === input.sourceRuleId);
    if (rule) {
      const multiplierPart = input.inputMultiplier !== 1 ? ` × ${input.inputMultiplier}` : '';
      return `wynik reguły "${rule.ruleName}"${multiplierPart}`;
    }
  }
  return 'nieznane wejście';
}

/**
 * Generate human-readable formula for a rule
 * Example: ⌈suma("Kamera IP Dome") ÷ 8⌉ (z 2 warunkami progowymi) → ilość pozycji "Dysk HDD 4TB"
 */
export function generateHumanReadableFormula(
  rule: {
    aggregationType: string;
    mathOperation: string;
    mathOperand?: number | '';
    inputs: BomTemplateDependencyRuleInput[];
    conditions: BomTemplateDependencyRuleCondition[];
    targetItemId: number | '';
    storageDaysParam?: string;
    storageBitrateMbps?: number | '';
  },
  templateItems: BomSubsystemTemplateItem[],
  existingRules: BomTemplateDependencyRule[]
): string {
  // Special case: SELECT_RECORDER
  if (rule.aggregationType === 'SELECT_RECORDER') {
    const targetItem = templateItems.find(i => i.id === rule.targetItemId);
    const targetName = targetItem ? `"${targetItem.materialName}"` : 'pozycji docelowej';
    return `🖥️ Automatyczny dobór rejestratora → wybór ${targetName}`;
  }

  // Special case: SELECT_DISKS
  if (rule.aggregationType === 'SELECT_DISKS') {
    const targetItem = templateItems.find(i => i.id === rule.targetItemId);
    const targetName = targetItem ? `"${targetItem.materialName}"` : 'pozycji docelowej';
    return `💾 Automatyczny dobór dysków → wybór ${targetName}`;
  }

  // Build aggregation part
  const aggDesc = AGGREGATION_DESCRIPTIONS[rule.aggregationType];
  const aggLabel = aggDesc ? aggDesc.label.toLowerCase() : rule.aggregationType.toLowerCase();

  const inputsDesc = rule.inputs.length > 0
    ? rule.inputs.map(inp => formatInputDescription(inp, templateItems, existingRules)).join(', ')
    : 'wejść';

  let formula = `${aggLabel}(${inputsDesc})`;

  // Add math operation
  if (rule.mathOperation && rule.mathOperation !== 'NONE') {
    if (rule.mathOperation === 'CALCULATE_STORAGE') {
      const bitrateStr = rule.storageBitrateMbps ? `${rule.storageBitrateMbps} Mbps` : '4 Mbps';
      const daysParam = rule.storageDaysParam || 'recordingDays';
      formula = `💾 oblicz pojemność (kamery × ${bitrateStr} × [${daysParam}] dni)`;
    } else {
      const operand = rule.mathOperand || 'N';

      switch (rule.mathOperation) {
        case 'FLOOR_DIV':
          formula = `⌊${formula} ÷ ${operand}⌋`;
          break;
        case 'CEIL_DIV':
          formula = `⌈${formula} ÷ ${operand}⌉`;
          break;
        case 'ROUND_DIV':
          formula = `round(${formula} ÷ ${operand})`;
          break;
        case 'ADD':
          formula = `${formula} + ${operand}`;
          break;
        case 'SUBTRACT':
          formula = `${formula} − ${operand}`;
          break;
        case 'MULTIPLY':
          formula = `${formula} × ${operand}`;
          break;
        case 'MODULO':
          formula = `${formula} mod ${operand}`;
          break;
      }
    }
  }

  // Add conditions note
  const conditionsCount = rule.conditions.length;
  const conditionsWord = conditionsCount === 1 ? 'warunkiem progowym' : 'warunkami progowymi';
  const conditionsNote = conditionsCount > 0
    ? ` (z ${conditionsCount} ${conditionsWord})`
    : '';

  // Add target
  const targetItem = templateItems.find(i => i.id === rule.targetItemId);
  const targetPart = targetItem ? ` → ilość pozycji "${targetItem.materialName}"` : ' → ilość pozycji docelowej';

  return `${formula}${conditionsNote}${targetPart}`;
}

/**
 * Interpret a single condition in Polish
 */
export function interpretCondition(
  operator: string,
  compareValue: number,
  compareValueMax: number | null | undefined,
  resultValue: number
): string {
  const compLabel = COMPARISON_LABELS[operator] || operator;

  if (operator === 'BETWEEN' && compareValueMax !== null && compareValueMax !== undefined) {
    return `jeśli wynik ${compLabel} ${compareValue} i ${compareValueMax} → ustaw ilość = ${resultValue}`;
  }

  return `jeśli wynik ${compLabel} ${compareValue} → ustaw ilość = ${resultValue}`;
}

/**
 * Calculate storage preview table for different camera counts and days
 */
export function calculateStoragePreviewTable(bitrateMbps: number): StoragePreviewRow[] {
  const camerasCounts = [1, 2, 4, 8, 16];
  const daysCounts = [7, 14, 30, 60];

  return camerasCounts.map(cameras => {
    const row: StoragePreviewRow = {
      cameras,
      days7: 0,
      days14: 0,
      days30: 0,
      days60: 0
    };

    daysCounts.forEach(days => {
      // Formula: bytes = cameras × (bitrateMbps × 1_000_000 / 8) × days × 86_400
      // TB = Math.round((bytes / 1e12) * 100) / 100
      const bytesPerSecond = bitrateMbps * 1_000_000 / 8;
      const totalSeconds = days * 86_400;
      const totalBytes = cameras * bytesPerSecond * totalSeconds;
      const tb = Math.round((totalBytes / 1e12) * 100) / 100;

      if (days === 7) row.days7 = tb;
      else if (days === 14) row.days14 = tb;
      else if (days === 30) row.days30 = tb;
      else if (days === 60) row.days60 = tb;
    });

    return row;
  });
}

/**
 * Detect circular references in rule dependencies
 * Returns error message if circular reference detected, null otherwise
 */
export function detectCircularReference(
  ruleId: number | undefined,
  inputs: BomTemplateDependencyRuleInput[],
  existingRules: BomTemplateDependencyRule[]
): string | null {
  // If this is a new rule (no ID), we can't have circular reference yet
  if (!ruleId) return null;

  // Build a map of rule dependencies
  const ruleDeps = new Map<number, number[]>();

  // Add existing rules
  existingRules.forEach(rule => {
    const deps = rule.inputs
      ?.filter(inp => inp.inputType === 'RULE_RESULT' && inp.sourceRuleId)
      .map(inp => inp.sourceRuleId as number) || [];
    ruleDeps.set(rule.id, deps);
  });

  // Add current rule's dependencies
  const currentDeps = inputs
    .filter(inp => inp.inputType === 'RULE_RESULT' && inp.sourceRuleId)
    .map(inp => inp.sourceRuleId as number);
  ruleDeps.set(ruleId, currentDeps);

  // DFS to detect cycles
  const visited = new Set<number>();
  const recStack = new Set<number>();

  function hasCycle(ruleIdToCheck: number, path: string[]): string | null {
    if (recStack.has(ruleIdToCheck)) {
      // Cycle detected
      const rule = existingRules.find(r => r.id === ruleIdToCheck);
      const cyclePath = [...path, rule?.ruleName || `Rule ${ruleIdToCheck}`].join(' → ');
      return `Wykryto cykliczną referencję: ${cyclePath}`;
    }

    if (visited.has(ruleIdToCheck)) {
      return null; // Already checked this path
    }

    visited.add(ruleIdToCheck);
    recStack.add(ruleIdToCheck);

    const deps = ruleDeps.get(ruleIdToCheck) || [];
    const rule = existingRules.find(r => r.id === ruleIdToCheck);
    const currentPath = [...path, rule?.ruleName || `Rule ${ruleIdToCheck}`];

    for (const depId of deps) {
      const cycleError = hasCycle(depId, currentPath);
      if (cycleError) return cycleError;
    }

    recStack.delete(ruleIdToCheck);
    return null;
  }

  return hasCycle(ruleId, []);
}
