// src/services/BomResolverService.ts
// Orchestration layer that combines BomSubsystemTemplateService,
// RecorderSelectionService and DiskConfigurationService into a single
// unified BOM resolution flow used by the Wizard task-config step.

import { BomSubsystemTemplateService } from './BomSubsystemTemplateService';
import { RecorderSelectionService } from './RecorderSelectionService';
import { DiskConfigurationService, DiskSelection } from './DiskConfigurationService';
import { SubsystemType } from '../entities/BomSubsystemTemplate';
import { RecorderSpecification } from '../entities/RecorderSpecification';
import { BomTemplateDependencyRuleService } from './BomTemplateDependencyRuleService';
import { DependencyRuleEngine } from './DependencyRuleEngine';
import { BomSubsystemTemplateItem, QuantitySource } from '../entities/BomSubsystemTemplateItem';

export interface BomResolveRequest {
  /** Subsystem type, e.g. 'CCTV', 'SMOKIP_A' */
  subsystemType: SubsystemType;
  /** Optional task variant used to pick the correct template */
  taskVariant?: string | null;
  /** Number of cameras — used only when subsystemType is CCTV */
  cameraCount?: number;
  /** Number of recording days — used for storage calculation */
  recordingDays?: number;
  /** Video bitrate in Mbps per channel (default 4.0) */
  bitrateMbps?: number;
  /** Arbitrary configuration parameters forwarded to the template resolver */
  configParams?: Record<string, unknown>;
}

export interface ResolvedBomItem {
  templateItemId: number;
  materialName: string;
  catalogNumber?: string | null;
  unit: string;
  quantity: number;
  groupName?: string | null;
  requiresIp: boolean;
  isRequired: boolean;
  sortOrder: number;
  notes?: string | null;
  warehouseStockId?: number | null;
}

export interface BomResolveResult {
  subsystemType: SubsystemType;
  taskVariant: string | null;
  templateId: number | null;
  templateName: string | null;
  /** Selected recorder — only populated for CCTV subsystems */
  recorder: RecorderSpecification | null;
  /** Required storage in TB — only populated for CCTV subsystems */
  requiredStorageTb: number | null;
  /** Selected disk configuration — only populated for CCTV subsystems */
  diskSelections: DiskSelection[];
  /** Resolved BOM line items */
  items: ResolvedBomItem[];
  /** True when no matching template was found */
  templateMissing: boolean;
}

// Subsystem types that involve a recorder + disk storage selection
const RECORDER_SUBSYSTEMS = new Set<SubsystemType>([SubsystemType.CCTV]);

export class BomResolverService {
  /**
   * Resolve a full BOM for the given subsystem configuration.
   *
   * Steps:
   * 1. Fetch the active template for subsystemType + taskVariant.
   * 2. For recorder-based subsystems (CCTV): select recorder and optimal disks.
   * 3. Build a configParams map that merges caller-supplied params with
   *    the calculated recorder/storage values.
   * 4. Resolve item quantities via QuantitySource rules and DependencyRuleEngine.
   * 5. Return the assembled result.
   */
  static async resolve(request: BomResolveRequest): Promise<BomResolveResult> {
    const {
      subsystemType,
      taskVariant = null,
      cameraCount = 0,
      recordingDays = 14,
      bitrateMbps = 4.0,
      configParams: callerConfigParams = {}
    } = request;

    // ── 1. Fetch template ────────────────────────────────────────────────────
    const template = await BomSubsystemTemplateService.getTemplate(subsystemType, taskVariant);

    const baseResult: BomResolveResult = {
      subsystemType,
      taskVariant,
      templateId: template?.id ?? null,
      templateName: template?.templateName ?? null,
      recorder: null,
      requiredStorageTb: null,
      diskSelections: [],
      items: [],
      templateMissing: template === null
    };

    if (!template) {
      return baseResult;
    }

    // ── 2. Recorder + disk selection (CCTV and similar) ─────────────────────
    let recorder: RecorderSpecification | null = null;
    let requiredStorageTb: number | null = null;
    let diskSelections: DiskSelection[] = [];

    if (RECORDER_SUBSYSTEMS.has(subsystemType) && cameraCount > 0) {
      recorder = await RecorderSelectionService.selectRecorder(cameraCount);

      requiredStorageTb = DiskConfigurationService.calculateRequiredStorage(
        cameraCount,
        recordingDays,
        bitrateMbps
      );

      if (recorder && requiredStorageTb > 0) {
        diskSelections = await DiskConfigurationService.selectOptimalDisks(
          requiredStorageTb,
          recorder.id,
          recorder.diskSlots
        );
      }
    }

    // ── 3. Build merged configParams ─────────────────────────────────────────
    const mergedConfigParams: Record<string, unknown> = {
      ...callerConfigParams,
      cameraCount,
      recordingDays,
      bitrateMbps,
      ...(recorder && {
        recorderId: recorder.id,
        recorderWarehouseStockId: recorder.warehouseStockId,
        diskSlots: recorder.diskSlots
      }),
      ...(requiredStorageTb !== null && { requiredStorageTb })
    };

    // ── 4. Resolve item quantities ───────────────────────────────────────────
    const itemQuantities = new Map<number, number>();

    // Sort items so that DEPENDENT items are processed last
    const sortedItems = [...template.items].sort((a: BomSubsystemTemplateItem, b: BomSubsystemTemplateItem) => {
      if (
        a.quantitySource === QuantitySource.DEPENDENT &&
        b.quantitySource !== QuantitySource.DEPENDENT
      ) {
        return 1;
      }
      if (
        a.quantitySource !== QuantitySource.DEPENDENT &&
        b.quantitySource === QuantitySource.DEPENDENT
      ) {
        return -1;
      }
      return a.sortOrder - b.sortOrder;
    });

    for (const item of sortedItems) {
      let quantity = item.defaultQuantity;

      switch (item.quantitySource) {
        case QuantitySource.FROM_CONFIG:
          if (item.configParamName) {
            const prefixed = `${item.groupName || 'Inne'}_${item.configParamName}`;
            const val =
              mergedConfigParams[prefixed] ?? mergedConfigParams[item.configParamName];
            if (val !== undefined) {
              quantity = Number(val) || item.defaultQuantity;
            }
          }
          break;

        case QuantitySource.PER_UNIT:
          if (item.configParamName) {
            const prefixed = `${item.groupName || 'Inne'}_${item.configParamName}`;
            const val =
              mergedConfigParams[prefixed] ?? mergedConfigParams[item.configParamName];
            if (val !== undefined) {
              quantity = item.defaultQuantity * Number(val);
            }
          }
          break;

        case QuantitySource.DEPENDENT:
          if (item.dependsOnItemId && itemQuantities.has(item.dependsOnItemId)) {
            const base = itemQuantities.get(item.dependsOnItemId)!;
            quantity = BomResolverService.evalFormula(
              base,
              item.dependencyFormula || '* 1'
            );
          }
          break;

        case QuantitySource.FIXED:
        default:
          quantity = item.defaultQuantity;
          break;
      }

      itemQuantities.set(item.id, quantity);
    }

    // Apply dependency rules if any
    const depRules = await BomTemplateDependencyRuleService.getRulesForTemplate(template.id);
    if (depRules.length > 0) {
      await DependencyRuleEngine.evaluate(
        depRules,
        itemQuantities,
        callerConfigParams.selectedModels as Record<string, { checked: boolean; quantity?: number }> | undefined,
        mergedConfigParams
      );
    }

    // ── 5. Build result items ────────────────────────────────────────────────
    const resolvedItems: ResolvedBomItem[] = sortedItems.map((item: BomSubsystemTemplateItem) => ({
      templateItemId: item.id,
      materialName: item.materialName,
      catalogNumber: item.catalogNumber ?? null,
      unit: item.unit,
      quantity: itemQuantities.get(item.id) ?? item.defaultQuantity,
      groupName: item.groupName ?? null,
      requiresIp: item.requiresIp,
      isRequired: item.isRequired,
      sortOrder: item.sortOrder,
      notes: item.notes ?? null,
      warehouseStockId: item.warehouseStockId ?? null
    }));

    return {
      ...baseResult,
      recorder,
      requiredStorageTb,
      diskSelections,
      items: resolvedItems
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Evaluate a simple dependency formula against a base quantity.
   * Supported formats: "* N", "/ N", "+ N", "- N".
   */
  private static evalFormula(base: number, formula: string): number {
    const parts = formula.trim().split(/\s+/);
    if (parts.length < 2) return base;
    const op = parts[0];
    const operand = parseFloat(parts[1]);
    if (isNaN(operand)) return base;
    switch (op) {
      case '*': return base * operand;
      case '/': return operand !== 0 ? base / operand : base;
      case '+': return base + operand;
      case '-': return base - operand;
      default:  return base;
    }
  }
}
