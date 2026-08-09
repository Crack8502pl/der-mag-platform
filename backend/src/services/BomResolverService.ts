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
import { DiskSpecification } from '../entities/DiskSpecification';

const DEFAULT_GROUP_NAME = 'Inne';
const DEFAULT_RECORDING_DAYS = 14;

export interface CameraBreakdown {
  total: number;
  ogolna: number;
  lpr: number;
  skp: number;
}

export interface BomResolveRequest {
  /** Subsystem type, e.g. 'CCTV', 'SMOKIP_A' */
  subsystemType: SubsystemType;
  /** Task type, e.g. 'LCS', 'NASTAWNIA' */
  taskType?: string;
  /** Optional task variant used to pick the correct template */
  taskVariant?: string | null;
  /** Number of cameras — used only when subsystemType is CCTV */
  cameraCount?: number;
  /** Number of recording days — used for storage calculation */
  recordingDays?: number;
  /** Frontend alias for recordingDays */
  retentionDays?: number;
  /** Video bitrate in Mbps per channel (default 4.0) */
  bitrateMbps?: number;
  /** Arbitrary configuration parameters forwarded to the template resolver */
  configParams?: Record<string, unknown>;
  /** Whether NASTAWNIA task is standalone (without LCS parent) */
  isStandaloneNastawnia?: boolean;
  /** Optional recorder selected by user */
  selectedRecorderId?: number | null;
  /** Optional camera type breakdown propagated from the Wizard */
  cameraBreakdown?: CameraBreakdown;
}

export interface ResolvedBomItem {
  templateItemId: number;
  materialName: string;
  catalogNumber?: string | null;
  unit: string;
  quantity: number;
  resolvedQuantity: number;
  defaultQuantity: number;
  quantitySource: string;
  configParamName?: string | null;
  groupName?: string | null;
  requiresIp: boolean;
  isRequired: boolean;
  sortOrder: number;
  notes?: string | null;
  warehouseStockId?: number | null;
}

export interface RecorderRecommendation {
  recorder: RecorderSpecification;
  isRecommended: boolean;
  alternatives: RecorderSpecification[];
}

export interface DiskRecommendation {
  diskSpecification: DiskSpecification | null;
  quantity: number;
  totalCapacityTb: number;
  requiredTb: number;
  isAdequate: boolean;
}

export interface BomResolveResult {
  subsystemType: SubsystemType;
  taskVariant: string | null;
  templateId: number | null;
  templateName: string | null;
  templateVersion?: number | null;
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
  needsRecorder: boolean;
  cameraCount: number;
  recorderRecommendation: RecorderRecommendation | null;
  diskRecommendation: DiskRecommendation | null;
  retentionDays: number;
  isConfigured: boolean;
  resolvedAt: string;
  warnings: string[];
  cameraBreakdown?: CameraBreakdown;
}

// Subsystem types that involve a recorder + disk storage selection
const RECORDER_SUBSYSTEMS = new Set<SubsystemType>([
  SubsystemType.CCTV,
  SubsystemType.SMOKIP_A,
  SubsystemType.SMOKIP_B
]);

export class BomResolverService {
  /**
   * Determines whether a given task/subsystem combination requires a recorder.
   * SMOKIP_B: PRZEJAZD_KAT_B/C/E/F → yes
   * SMOKIP_A: LCS → yes; NASTAWNIA → only if standalone (no LCS parent)
   * CCTV: always yes (when cameraCount > 0)
   */
  static needsRecorder(
    subsystemType: SubsystemType,
    taskType: string,
    isStandaloneNastawnia: boolean = false
  ): boolean {
    if (subsystemType === SubsystemType.SMOKIP_B) {
      return ['PRZEJAZD_KAT_B', 'PRZEJAZD_KAT_C', 'PRZEJAZD_KAT_E', 'PRZEJAZD_KAT_F'].includes(taskType);
    }
    if (subsystemType === SubsystemType.SMOKIP_A) {
      if (taskType === 'LCS') return true;
      if (taskType === 'NASTAWNIA') return isStandaloneNastawnia;
      return false;
    }
    return subsystemType === SubsystemType.CCTV;
  }

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
      taskType = '',
      taskVariant = null,
      cameraCount: requestedCameraCount = 0,
      recordingDays: requestRecordingDays,
      bitrateMbps = 4.0,
      configParams: callerConfigParams = {},
      isStandaloneNastawnia = false,
      cameraBreakdown: requestedCameraBreakdown
    } = request;
    let cameraBreakdown = BomResolverService.normalizeCameraBreakdown(
      requestedCameraBreakdown,
      requestedCameraCount
    );
    const fallbackCameraCount = BomResolverService.getFallbackCameraCount(callerConfigParams);
    const cameraCount =
      requestedCameraCount > 0
        ? requestedCameraCount
        : (cameraBreakdown.total > 0 ? cameraBreakdown.total : fallbackCameraCount);

    cameraBreakdown = BomResolverService.mergeCameraBreakdownFromConfig(
      cameraBreakdown,
      callerConfigParams,
      cameraCount
    );
    const totalIpCameras = BomResolverService.resolveTotalIpCameras(cameraBreakdown, callerConfigParams);
    const recordingDays = requestRecordingDays ?? request.retentionDays ?? DEFAULT_RECORDING_DAYS;
    const needsRecorder = BomResolverService.needsRecorder(subsystemType, taskType, isStandaloneNastawnia);
    console.log('[BomResolverService.resolve] recorder selection gate', {
      subsystemType,
      taskType,
      needsRecorder,
      cameraCount
    });

    // ── 1. Fetch template ────────────────────────────────────────────────────
    const template = await BomSubsystemTemplateService.getTemplate(subsystemType, taskVariant);

    const baseResult: BomResolveResult = {
      subsystemType,
      taskVariant,
      templateId: template?.id ?? null,
      templateName: template?.templateName ?? null,
      templateVersion: template?.version ?? null,
      recorder: null,
      requiredStorageTb: null,
      diskSelections: [],
      items: [],
      templateMissing: template === null,
      needsRecorder,
      cameraCount,
      recorderRecommendation: null,
      diskRecommendation: null,
      retentionDays: recordingDays,
      isConfigured: false,
      resolvedAt: new Date().toISOString(),
      warnings: [],
      cameraBreakdown
    };

    if (!template) {
      return baseResult;
    }

    // ── 2. Recorder + disk selection (CCTV and similar) ─────────────────────
    let recorder: RecorderSpecification | null = null;
    let requiredStorageTb: number | null = null;
    let diskSelections: DiskSelection[] = [];

    if (RECORDER_SUBSYSTEMS.has(subsystemType) && needsRecorder && cameraCount > 0) {
      if (request.selectedRecorderId != null) {
        recorder = await RecorderSelectionService.getRecorder(request.selectedRecorderId);
      }

      if (!recorder) {
        recorder = await RecorderSelectionService.selectRecorder(cameraCount);
      }

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
    const existingLcsConfig =
      callerConfigParams.lcsConfig && typeof callerConfigParams.lcsConfig === 'object'
        ? (callerConfigParams.lcsConfig as Record<string, unknown>)
        : {};
    const existingNastawniConfig =
      callerConfigParams.nastawniConfig && typeof callerConfigParams.nastawniConfig === 'object'
        ? (callerConfigParams.nastawniConfig as Record<string, unknown>)
        : {};

    const mergedConfigParams: Record<string, unknown> = {
      ...callerConfigParams,
      cameraCount,
      recordingDays,
      bitrateMbps,
      'camera.total': cameraCount,
      'camera.total.ip': totalIpCameras,
      'camera.ip.total': totalIpCameras,
      'camera.total.ip.ogolna': cameraBreakdown.ogolna,
      'camera.total.ip.lpr': cameraBreakdown.lpr,
      'camera.total.ip.skp': cameraBreakdown.skp,
      'camera.recording.days': recordingDays,
      'camera.bitrate.mbps': bitrateMbps,
      lcsConfig: {
        ...existingLcsConfig,
        iloscKamer: cameraCount
      },
      nastawniConfig: {
        ...existingNastawniConfig,
        iloscKamer: cameraCount
      },
      ...(recorder && {
        recorderId: recorder.id,
        recorderWarehouseStockId: recorder.warehouseStockId,
        diskSlots: recorder.diskSlots
      }),
      ...(requiredStorageTb !== null && {
        requiredStorageTb,
        'camera.storage.tb': requiredStorageTb
      })
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
            const prefixed = `${item.groupName || DEFAULT_GROUP_NAME}_${item.configParamName}`;
            const val =
              mergedConfigParams[prefixed] ?? mergedConfigParams[item.configParamName];
            if (val !== undefined) {
              quantity = Number(val) || item.defaultQuantity;
            }
          }
          break;

        case QuantitySource.PER_UNIT:
          if (item.configParamName) {
            const prefixed = `${item.groupName || DEFAULT_GROUP_NAME}_${item.configParamName}`;
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
      resolvedQuantity: itemQuantities.get(item.id) ?? item.defaultQuantity,
      defaultQuantity: item.defaultQuantity,
      quantitySource: item.quantitySource,
      configParamName: item.configParamName ?? null,
      groupName: item.groupName ?? null,
      requiresIp: item.requiresIp,
      isRequired: item.isRequired,
      sortOrder: item.sortOrder,
      notes: item.notes ?? null,
      warehouseStockId: item.warehouseStockId ?? null
    }));

    const totalDiskCapacityTb = diskSelections.reduce((sum, selection) => sum + selection.totalTb, 0);
    const primaryDisk = diskSelections.length > 0
      ? await DiskConfigurationService.getDisk(diskSelections[0].diskId)
      : null;

    return {
      ...baseResult,
      recorder,
      requiredStorageTb,
      diskSelections,
      items: resolvedItems,
      recorderRecommendation: recorder ? { recorder, isRecommended: true, alternatives: [] } : null,
      diskRecommendation: diskSelections.length > 0 ? {
        diskSpecification: primaryDisk,
        quantity: diskSelections[0].quantity,
        totalCapacityTb: totalDiskCapacityTb,
        requiredTb: requiredStorageTb ?? 0,
        isAdequate: totalDiskCapacityTb >= (requiredStorageTb ?? 0)
      } : null,
      cameraBreakdown
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
      case '/': return operand !== 0 ? base / operand : (() => { console.warn(`BomResolverService: division by zero in formula "${formula}", returning base value`); return base; })();
      case '+': return base + operand;
      case '-': return base - operand;
      default:  return base;
    }
  }

  private static normalizeCameraBreakdown(
    cameraBreakdown: CameraBreakdown | undefined,
    fallbackTotal: number
  ): CameraBreakdown {
    const ogolna = BomResolverService.toPositiveInt(cameraBreakdown?.ogolna);
    const lpr = BomResolverService.toPositiveInt(cameraBreakdown?.lpr);
    const skp = BomResolverService.toPositiveInt(cameraBreakdown?.skp);
    const sum = BomResolverService.sumCameraTypes({ ogolna, lpr, skp });
    const total = sum > 0
      ? sum
      : Math.max(
          BomResolverService.toPositiveInt(cameraBreakdown?.total),
          BomResolverService.toPositiveInt(fallbackTotal)
        );

    return { total, ogolna, lpr, skp };
  }

  private static toPositiveInt(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
  }

  private static sumCameraTypes(cameraBreakdown: Pick<CameraBreakdown, 'ogolna' | 'lpr' | 'skp'>): number {
    return cameraBreakdown.ogolna + cameraBreakdown.lpr + cameraBreakdown.skp;
  }

  private static getFallbackCameraCount(configParams: Record<string, unknown>): number {
    return Math.max(
      BomResolverService.readNumericConfigParam(configParams, 'cameraCount'),
      BomResolverService.readNumericConfigParam(configParams, 'camera.total'),
      BomResolverService.readNumericConfigParam(configParams, 'camera.total.ip'),
      BomResolverService.readNumericConfigParam(configParams, 'camera.ip.total'),
      BomResolverService.readNumericConfigParam(configParams, 'lcsConfig.iloscKamer'),
      BomResolverService.readNumericConfigParam(configParams, 'nastawniConfig.iloscKamer')
    );
  }

  private static mergeCameraBreakdownFromConfig(
    cameraBreakdown: CameraBreakdown,
    configParams: Record<string, unknown>,
    fallbackTotal: number
  ): CameraBreakdown {
    const ogolna =
      cameraBreakdown.ogolna > 0
        ? cameraBreakdown.ogolna
        : BomResolverService.readNumericConfigParam(configParams, 'camera.total.ip.ogolna');
    const lpr =
      cameraBreakdown.lpr > 0
        ? cameraBreakdown.lpr
        : BomResolverService.readNumericConfigParam(configParams, 'camera.total.ip.lpr');
    const skp =
      cameraBreakdown.skp > 0
        ? cameraBreakdown.skp
        : BomResolverService.readNumericConfigParam(configParams, 'camera.total.ip.skp');
    const sum = ogolna + lpr + skp;
    const total = sum > 0 ? sum : Math.max(cameraBreakdown.total, fallbackTotal);

    return { total, ogolna, lpr, skp };
  }

  private static resolveTotalIpCameras(
    cameraBreakdown: CameraBreakdown,
    configParams: Record<string, unknown>
  ): number {
    const breakdownTotal = BomResolverService.sumCameraTypes(cameraBreakdown);
    if (breakdownTotal > 0) {
      return breakdownTotal;
    }

    return Math.max(
      BomResolverService.readNumericConfigParam(configParams, 'camera.total.ip'),
      BomResolverService.readNumericConfigParam(configParams, 'camera.ip.total')
    );
  }

  private static readNumericConfigParam(configParams: Record<string, unknown>, paramPath: string): number {
    const direct = configParams[paramPath];
    if (direct !== undefined) {
      return BomResolverService.toPositiveInt(direct);
    }

    const keys = paramPath.split('.');
    let current: unknown = configParams;
    for (const key of keys) {
      if (current && typeof current === 'object') {
        current = (current as Record<string, unknown>)[key];
      } else {
        current = undefined;
        break;
      }
    }

    return BomResolverService.toPositiveInt(current);
  }
}
