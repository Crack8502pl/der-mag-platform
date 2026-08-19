/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/components/tasks/TaskConfigWizard/TaskConfigWizard.tsx
// Multi-step wizard for task BOM + recorder configuration

import React, { useState, useEffect } from 'react';
import bomSubsystemTemplateService from '../../../services/bomSubsystemTemplate.service';
import bomGroupService from '../../../services/bomGroup.service';
import taskService from '../../../services/task.service';
import bomResolverService from '../../../services/bomResolver.service';
import taskRelationshipService from '../../../services/taskRelationship.service';
import type { BomSubsystemTemplate, BomSubsystemTemplateItem } from '../../../services/bomSubsystemTemplate.service';
import type { BomGroup } from '../../../services/bomGroup.service';
import type { BomResolveResult } from '../../../services/bomResolver.service';
import type { Task, TaskMetadata } from '../../../types/task.types';
import type { CameraBreakdown, CameraRow } from '../../../types/cameraBreakdown';
import { extractCameraBreakdown, extractCameraCount } from '../../../utils/cameraCountUtils';
import {
  mergeLcsConfigToMetadata,
  mergeNastawniConfigToMetadata,
  readLcsConfig,
  readNastawniConfig,
} from '../../../utils/metadataMerge';
import { WizardStepCameras } from './WizardStepCameras';
import { WizardStepParams } from './WizardStepParams';
import { WizardStepBom } from './WizardStepBom';
import { WizardStepRecorder } from './WizardStepRecorder';
import { WizardStepSummary } from './WizardStepSummary';
import './TaskConfigWizard.css';

// ── Types ────────────────────────────────────────────────────

export interface ConfigField {
  paramName: string;
  label: string;
  type: 'number' | 'select' | 'model_picker';
  options?: Array<{ value: string; label: string }>;
  defaultValue?: any;
  materialItems?: BomSubsystemTemplateItem[];
  limitParamName?: string;
}

export interface ConfigGroup {
  groupName: string;
  fields: ConfigField[];
}

// ── Wizard steps ─────────────────────────────────────────────

const WizardStep = {
  PARAMS: 0,
  CAMERAS: 1,
  BOM: 2,
  RECORDER: 3,
  SUMMARY: 4,
} as const;
type WizardStep = (typeof WizardStep)[keyof typeof WizardStep];

const DEFAULT_CAMERA_ROWS: CameraRow[] = [
  { type: 'Ogólna', quantity: 0, quantityPerPole: 2 },
  { type: 'LPR', quantity: 0, quantityPerPole: 1 },
  { type: 'SKP', quantity: 0, quantityPerPole: 1 },
];

const createDefaultCameraRows = (): CameraRow[] => DEFAULT_CAMERA_ROWS.map(row => ({ ...row }));

const CAMERA_VALUE_PATTERNS = {
  Ogólna: [
    'ilosckamerogolnych', 'kamerogolnych',
    'kameraogolna', 'ilosckameraogolna', 'kamerogolna',
  ],
  LPR: [
    'ilosckamerlpr', 'kamerlpr',
    'iloscklpr',
  ],
  SKP: [
    'ilosckamerskp', 'kamerskp', 'iloscskp',
    'ilosckamerasskp',
  ],
} as const;

interface TaskConfigWizardProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
}

interface WizardTaskMetadata extends TaskMetadata {
  subsystemType?: string;
  taskVariant?: string | null;
  isStandaloneNastawnia?: boolean;
  lcsConfig?: {
    iloscKamer?: unknown;
    iloscStanowisk?: unknown;
    obserwowanePrzejazdy?: unknown[];
    serwerObrazu?: {
      maxKamer?: unknown;
    };
  };
  nastawniConfig?: {
    iloscKamer?: unknown;
    obserwowanePrzejazdy?: unknown[];
    stacjaOperatorska?: {
      przypisaneKamery?: unknown[];
    };
  };
}

// ── Component ────────────────────────────────────────────────

export const TaskConfigWizard: React.FC<TaskConfigWizardProps> = ({ task, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.PARAMS);
  const [configValues, setConfigValues] = useState<Record<string, any>>({});
  const [selectedModels, setSelectedModels] = useState<Record<string, { checked: boolean; quantity: number }>>({});
  const [cameraRows, setCameraRows] = useState<CameraRow[]>(createDefaultCameraRows());
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [selectedRecorderId, setSelectedRecorderId] = useState<number | null>(null);
  const [cameraCount, setCameraCount] = useState<number>(0);
  const [resolvedBom, setResolvedBom] = useState<BomResolveResult | null>(null);
  const [template, setTemplate] = useState<BomSubsystemTemplate | null>(null);
  const [configGroups, setConfigGroups] = useState<ConfigGroup[]>([]);
  const [bomGroups, setBomGroups] = useState<BomGroup[]>([]);
  const [isStandaloneNastawnia, setIsStandaloneNastawnia] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [userEditedRows, setUserEditedRows] = useState(false);

  useEffect(() => {
    initWizard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getNormalizedMetadata = (): WizardTaskMetadata & Record<string, unknown> => {
    const baseMetadata = (task.metadata || {}) as WizardTaskMetadata & Record<string, unknown>;
    const existingLcsConfig = readLcsConfig(baseMetadata);
    const existingNastawniConfig = readNastawniConfig(baseMetadata);
    return {
      ...baseMetadata,
      ...(existingLcsConfig ? { lcsConfig: existingLcsConfig } : {}),
      ...(existingNastawniConfig ? { nastawniConfig: existingNastawniConfig } : {}),
    };
  };

  const buildCameraBreakdownFromRows = (rows: CameraRow[]): CameraBreakdown => ({
    total: rows.reduce((sum, row) => sum + Math.max(0, row.quantity || 0), 0),
    ogolna: rows.find(row => row.type === 'Ogólna')?.quantity ?? 0,
    lpr: rows.find(row => row.type === 'LPR')?.quantity ?? 0,
    skp: rows.find(row => row.type === 'SKP')?.quantity ?? 0,
  });

  const buildRowsFromBreakdown = (breakdown: Partial<CameraBreakdown>): CameraRow[] => [
    {
      ...DEFAULT_CAMERA_ROWS[0],
      quantity: Number(breakdown.ogolna) || 0,
    },
    {
      ...DEFAULT_CAMERA_ROWS[1],
      quantity: Number(breakdown.lpr) || 0,
    },
    {
      ...DEFAULT_CAMERA_ROWS[2],
      quantity: Number(breakdown.skp) || 0,
    },
  ];

  const syncCameraRowsToConfigValues = (
    sourceConfigValues: Record<string, any>,
    rows: CameraRow[]
  ): Record<string, any> => {
    const nextConfigValues = { ...sourceConfigValues };
    const rowValues = {
      ogolna: rows.find(row => row.type === 'Ogólna')?.quantity ?? 0,
      lpr: rows.find(row => row.type === 'LPR')?.quantity ?? 0,
      skp: rows.find(row => row.type === 'SKP')?.quantity ?? 0,
    };

    Object.keys(nextConfigValues).forEach(key => {
      const lower = key.toLowerCase();
      if (CAMERA_VALUE_PATTERNS.Ogólna.some(pattern => lower.includes(pattern))) {
        nextConfigValues[key] = rowValues.ogolna;
      } else if (CAMERA_VALUE_PATTERNS.LPR.some(pattern => lower.includes(pattern))) {
        nextConfigValues[key] = rowValues.lpr;
      } else if (CAMERA_VALUE_PATTERNS.SKP.some(pattern => lower.includes(pattern))) {
        nextConfigValues[key] = rowValues.skp;
      }
    });

    return nextConfigValues;
  };

  /**
   * Fix 4: Pobiera aktualny podział kamer z zadań-dzieci przez API.
   * Używane do korygowania przestarzałej wartości lcsConfig.iloscKamer w bazie.
   * Zwraca null gdy brak dzieci lub błąd — wtedy używany jest fallback z metadata.
   */
  const fetchChildrenCameraBreakdown = async (
    subsystemId: number,
    parentTaskNumber: string
  ): Promise<CameraBreakdown | null> => {
    try {
      const relationships = await taskRelationshipService.getBySubsystem(subsystemId);

      const myRelationship = relationships.find(rel => rel.parentTaskNumber === parentTaskNumber);

      if (!myRelationship || !myRelationship.children?.length) {
        return null;
      }

      const childNumbers = myRelationship.children
        .map(c => c.childTaskNumber)
        .filter(Boolean);
      if (childNumbers.length === 0) return null;

      const childTasks = await Promise.allSettled(
        childNumbers.map(num => taskService.getById(num))
      );

      let totalOgolna = 0;
      let totalLpr = 0;
      let totalSkp = 0;

      for (const result of childTasks) {
        if (result.status !== 'fulfilled') continue;
        const childTask = result.value;
        const cp = (childTask.metadata?.configParams || {}) as Record<string, unknown>;

        const toNum = (v: unknown): number => {
          const n = Number(v);
          return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
        };

        const childOgolna = toNum(cp['camera.total.ip.ogolna']);
        const childLpr = toNum(cp['camera.total.ip.lpr']);
        const childSkp = toNum(cp['camera.total.ip.skp']);

        if (childOgolna === 0 && childLpr === 0 && childSkp === 0) {
          // Fallback gdy breakdown nie jest zapisany — użyj cameraCount całości
          const childTotal = toNum(cp['cameraCount']) || toNum(cp['camera.total']);
          totalOgolna += childTotal;
        } else {
          totalOgolna += childOgolna;
          totalLpr += childLpr;
          totalSkp += childSkp;
        }
      }

      const total = totalOgolna + totalLpr + totalSkp;
      if (total === 0) return null;

      return { total, ogolna: totalOgolna, lpr: totalLpr, skp: totalSkp };
    } catch (err) {
      console.warn('[TaskConfigWizard] fetchChildrenCameraBreakdown failed, using metadata fallback', err);
      return null;
    }
  };

  const initWizard = async () => {
    try {
      setLoading(true);
      setError('');

      // Load existing config from task metadata
      const normalizedMetadata = getNormalizedMetadata();
      const existingConfig = normalizedMetadata.configParams || {};
      setConfigValues(existingConfig);
      setCameraCount(
        extractCameraCount({
          taskTypeCode: task.taskType?.code || '',
          subsystemType: String(normalizedMetadata.subsystemType || task.taskType?.code || ''),
          configValues: existingConfig as Record<string, unknown>,
          metadata: normalizedMetadata,
          isStandaloneNastawnia: Boolean(
            normalizedMetadata.isStandaloneNastawnia ?? task.metadata?.isStandaloneNastawnia
          ),
        })
      );
      const initialCameraCount = extractCameraCount({
        taskTypeCode: task.taskType?.code || '',
        subsystemType: String(normalizedMetadata.subsystemType || task.taskType?.code || ''),
        configValues: existingConfig as Record<string, unknown>,
        metadata: normalizedMetadata,
        isStandaloneNastawnia: Boolean(
          normalizedMetadata.isStandaloneNastawnia ?? task.metadata?.isStandaloneNastawnia
        ),
      });

      if (existingConfig.retentionDays) {
        setRetentionDays(Number(existingConfig.retentionDays) || 30);
      }

      if (existingConfig.selectedRecorderId) {
        setSelectedRecorderId(Number(existingConfig.selectedRecorderId) || null);
      }

      // Initialize selectedModels from saved config with backward compat migration
      if (existingConfig.selectedModels && typeof existingConfig.selectedModels === 'object') {
        const migrated: Record<string, { checked: boolean; quantity: number }> = {};
        for (const [key, val] of Object.entries(existingConfig.selectedModels)) {
          if (typeof val === 'boolean') {
            migrated[key] = { checked: val, quantity: 1 };
          } else if (typeof val === 'object' && val !== null && 'checked' in val && 'quantity' in val) {
            migrated[key] = val as { checked: boolean; quantity: number };
          } else {
            migrated[key] = { checked: !!val, quantity: 1 };
          }
        }
        setSelectedModels(migrated);
      }

      // Fix 4: Dla zadań-rodziców (LCS, NASTAWNIA) pobierz aktualny cameraCount z dzieci przez API.
      // Korekta przestarzałej wartości lcsConfig.iloscKamer zapisanej w bazie.
      const taskTypeCode = task.taskType?.code || '';
      const isParentTask = taskTypeCode === 'LCS' || taskTypeCode === 'NASTAWNIA';
      let childrenBreakdown: CameraBreakdown | null = null;

      if (isParentTask && task.subsystemId && task.taskNumber) {
        childrenBreakdown = await fetchChildrenCameraBreakdown(task.subsystemId, task.taskNumber);
        if (childrenBreakdown) {
          setCameraCount(childrenBreakdown.total);
          console.info(
            `[TaskConfigWizard] cameraCount from children = ${childrenBreakdown.total}` +
            ` (was: ${initialCameraCount} from metadata)`
          );
        }
      } else if (isParentTask && task.taskNumber) {
        // TODO(Fix 5 / legacy tasks): add relationship fallback by taskNumber when API supports it.
        // Current taskRelationshipService exposes only getBySubsystem(subsystemId),
        // so for tasks without subsystemId we intentionally keep metadata fallback.
      }

      // Fix 4: jeśli mamy świeże dane z dzieci, użyj ich zamiast zapisanych cameraRows
      if (childrenBreakdown && childrenBreakdown.total > 0) {
        setCameraRows(buildRowsFromBreakdown(childrenBreakdown));
      } else if (Array.isArray(existingConfig.cameraRows)) {
        setCameraRows(existingConfig.cameraRows as CameraRow[]);
      } else if (existingConfig.cameraBreakdown && typeof existingConfig.cameraBreakdown === 'object') {
        setCameraRows(buildRowsFromBreakdown(existingConfig.cameraBreakdown as CameraBreakdown));
      } else {
        const configBreakdown = extractCameraBreakdown({
          taskTypeCode: task.taskType?.code || '',
          subsystemType: String(normalizedMetadata.subsystemType || task.taskType?.code || ''),
          configValues: existingConfig as Record<string, unknown>,
          metadata: normalizedMetadata,
          isStandaloneNastawnia: Boolean(
            normalizedMetadata.isStandaloneNastawnia ?? task.metadata?.isStandaloneNastawnia
          ),
        });

        if (configBreakdown.ogolna > 0 || configBreakdown.lpr > 0 || configBreakdown.skp > 0) {
          setCameraRows(buildRowsFromBreakdown(configBreakdown));
        } else if (initialCameraCount > 0) {
          // Fallback #605: wszystkie kamery do wiersza Ogólna + warning
          setCameraRows([
            { type: 'Ogólna', quantity: initialCameraCount, quantityPerPole: 2 },
            { type: 'LPR', quantity: 0, quantityPerPole: 1 },
            { type: 'SKP', quantity: 0, quantityPerPole: 1 },
          ]);
          console.warn(`[TaskConfigWizard] cameraRows z fallback cameraCount=${initialCameraCount} — wszystkie do 'Ogólna'`);
        }
      }

      // Load BOM groups
      const groups = await bomGroupService.getAll();
      setBomGroups(groups);

      // Load template
      const subsystemType = normalizedMetadata.subsystemType || task.taskType?.code || '';
      const taskVariant = normalizedMetadata.taskVariant || null;

      if (!subsystemType) {
        setError('Brak informacji o typie podsystemu w zadaniu');
        setLoading(false);
        return;
      }

      // Determine isStandaloneNastawnia for SMOKIP_A NASTAWNIA tasks.
      // A NASTAWNIA is "standalone" (needs its own recorder) when it is NOT a child
      // of any LCS task.  Priority: explicit metadata flag → live relationship query.
      if (subsystemType === 'SMOKIP_A' && taskTypeCode === 'NASTAWNIA') {
        const metadataFlag = normalizedMetadata.isStandaloneNastawnia;
        if (typeof metadataFlag === 'boolean') {
          setIsStandaloneNastawnia(metadataFlag);
        } else if (task.subsystemId) {
          try {
            const relationships = await taskRelationshipService.getBySubsystem(task.subsystemId);
            // Is this task's number found as a child of an LCS parent?
            const isChild = relationships.some(
              rel =>
                rel.parentType === 'LCS' &&
                rel.children.some(c => c.childTaskNumber === task.taskNumber)
            );
            setIsStandaloneNastawnia(!isChild);
          } catch {
            // If the query fails, assume standalone (safer — gives recorder when uncertain)
            setIsStandaloneNastawnia(true);
          }
        } else {
          // No subsystemId available — treat as standalone
          setIsStandaloneNastawnia(true);
        }
      }

      const tmpl = await bomSubsystemTemplateService.getTemplateFor(subsystemType, taskVariant);
      if (tmpl) {
        setTemplate(tmpl);
        const cGroups = analyzeTemplate(tmpl, groups);
        setConfigGroups(cGroups);

        // Initialize default model states for model_picker fields
        setSelectedModels(prev => {
          const defaults: Record<string, { checked: boolean; quantity: number }> = {};
          cGroups.forEach(group => {
            group.fields.forEach(field => {
              if (field.type === 'model_picker' && field.materialItems) {
                field.materialItems.forEach((matItem, matIdx) => {
                  const modelKey = `${field.paramName}_${matItem.id || matIdx}`;
                  if (!(modelKey in prev)) {
                    defaults[modelKey] = { checked: false, quantity: matItem.defaultQuantity || 1 };
                  }
                });
              }
            });
          });
          return { ...defaults, ...prev };
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Błąd ładowania konfiguracji');
    } finally {
      setLoading(false);
    }
  };

  // ── analyzeTemplate (identical logic to SMOKConfigModal) ────

  const analyzeTemplate = (tmpl: BomSubsystemTemplate, _loadedGroups: BomGroup[]): ConfigGroup[] => {
    const groupsMap = new Map<string, ConfigField[]>();

    for (const item of tmpl.items) {
      const groupName = item.groupName || 'Inne';
      if (!groupsMap.has(groupName)) groupsMap.set(groupName, []);
      const fields = groupsMap.get(groupName)!;

      if ((item.quantitySource === 'FROM_CONFIG' || item.quantitySource === 'PER_UNIT') && item.configParamName) {
        const uniqueParamName = `${groupName}_${item.configParamName}`;
        if (!fields.find(f => f.paramName === uniqueParamName)) {
          fields.push({
            paramName: uniqueParamName,
            label: getFieldLabel(item.configParamName),
            type: 'number',
            defaultValue: item.defaultQuantity,
          });
        }
      }
    }

    groupsMap.forEach((fields, groupName) => {
      if (groupName.toLowerCase().includes('kamera') || groupName.toLowerCase().includes('lpr')) {
        const groupItems = tmpl.items.filter(i => (i.groupName || 'Inne') === groupName);
        if (groupItems.length > 0) {
          const numberField = fields.find(f => f.type === 'number');
          fields.push({
            paramName: `${groupName}_selectedModels`,
            label: 'Wybierz modele',
            type: 'model_picker',
            materialItems: groupItems,
            limitParamName: numberField?.paramName,
          });
        }
      }
    });

    const result: ConfigGroup[] = [];
    groupsMap.forEach((fields, groupName) => result.push({ groupName, fields }));
    return result;
  };

  const getFieldLabel = (paramName: string): string => {
    const labels: Record<string, string> = {
      iloscKamerOgolnych: 'Ilość Kamer Ogólnych',
      iloscKamerLPR: 'Ilość Kamer LPR',
      iloscSlupow: 'Ilość Słupów',
    };
    return labels[paramName] || paramName;
  };

  const getCameraCount = (): number => {
    const metadata = getNormalizedMetadata();
    return extractCameraCount({
      taskTypeCode: task.taskType?.code || '',
      subsystemType: String(metadata.subsystemType || task.taskType?.code || ''),
      configValues,
      metadata,
      isStandaloneNastawnia,
    });
  };

  // ── handleResolve ────────────────────────────────────────────

  const handleResolve = async (): Promise<boolean> => {
    setResolving(true);
    setError('');
    try {
      const metadata = getNormalizedMetadata();
      const subsystemType = metadata.subsystemType || task.taskType?.code || '';
      const taskType = task.taskType?.code || subsystemType;
      const taskVariant = metadata.taskVariant || null;
      let breakdown = buildCameraBreakdownFromRows(cameraRows);
      let effectiveRows = cameraRows;

      // FALLBACK #604: gdy cameraRows puste (async setState), pobierz z configValues
      if (breakdown.total === 0) {
        const fallbackBreakdown = extractCameraBreakdown({
          taskTypeCode: task.taskType?.code || '',
          subsystemType: String(metadata.subsystemType || task.taskType?.code || ''),
          configValues,
          metadata,
          isStandaloneNastawnia,
        });

        if (fallbackBreakdown.total > 0) {
          breakdown = fallbackBreakdown;
          effectiveRows = buildRowsFromBreakdown(fallbackBreakdown);
          setCameraRows(effectiveRows); // sync stanu
          setUserEditedRows(true);
        }
      }

      const count = breakdown.total;
      const syncedConfigValues = syncCameraRowsToConfigValues(configValues, effectiveRows);
      setConfigValues(syncedConfigValues);
      setCameraCount(count);

      const result = await bomResolverService.resolve({
        subsystemType,
        taskType,
        taskVariant,
        configParams: { ...syncedConfigValues, selectedModels, cameraRows: effectiveRows, cameraBreakdown: breakdown },
        isStandaloneNastawnia,
        selectedRecorderId: selectedRecorderId || null,
        retentionDays,
        cameraCount: count,
        cameraBreakdown: breakdown,
      });

      setResolvedBom(result);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Błąd rozwiązywania BOM');
      return false;
    } finally {
      setResolving(false);
    }
  };

  // ── handleSave ────────────────────────────────────────────────

  const handleSave = async () => {
    if (!resolvedBom) return;
    setSaving(true);
    setError('');
    try {
      const syncedConfigValues = syncCameraRowsToConfigValues(configValues, cameraRows);
      const cameraBreakdown = buildCameraBreakdownFromRows(cameraRows);
      const newConfigParams = {
        ...(task.metadata?.configParams || {}),
        ...syncedConfigValues,
        cameraCount: cameraBreakdown.total,
        selectedModels,
        retentionDays,
        selectedRecorderId: selectedRecorderId || null,
        cameraRows,
        cameraBreakdown,
        appliedBomTemplateId: resolvedBom.templateId || null,
        wizardResolvedAt: resolvedBom.resolvedAt || new Date().toISOString(),
      };

      const existingMetadata = getNormalizedMetadata();
      let metadataToSave: Record<string, unknown> = {
        ...existingMetadata,
        configParams: newConfigParams,
      };

      if (task.taskType?.code === 'LCS') {
        metadataToSave = mergeLcsConfigToMetadata(metadataToSave, { iloscKamer: cameraCount });
      }

      if (task.taskType?.code === 'NASTAWNIA' && isStandaloneNastawnia) {
        metadataToSave = mergeNastawniConfigToMetadata(metadataToSave, { iloscKamer: cameraCount });
      }

      await taskService.update(task.taskNumber, {
        metadata: metadataToSave,
        status: 'configured',
      });

      if (resolvedBom.templateId && template?.id) {
        const prevApplied = task.metadata?.configParams?.appliedBomTemplateId;
        if (prevApplied !== resolvedBom.templateId) {
          await bomSubsystemTemplateService.applyToTask(
            resolvedBom.templateId,
            task.id,
            { ...syncedConfigValues, selectedModels, cameraRows, cameraBreakdown }
          );
        }
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Błąd zapisywania konfiguracji');
    } finally {
      setSaving(false);
    }
  };

  // ── Navigation ───────────────────────────────────────────────

  const handleNext = async () => {
    if (currentStep === WizardStep.PARAMS) {
      if (buildCameraBreakdownFromRows(cameraRows).total === 0) {
        const metadata = getNormalizedMetadata();
        const liveBreakdown = extractCameraBreakdown({
          taskTypeCode: task.taskType?.code || '',
          subsystemType: String(metadata.subsystemType || task.taskType?.code || ''),
          configValues,
          metadata,
          isStandaloneNastawnia,
        });
        if (liveBreakdown.ogolna > 0 || liveBreakdown.lpr > 0 || liveBreakdown.skp > 0) {
          setCameraRows(buildRowsFromBreakdown(liveBreakdown));
        } else {
          const liveCount = getCameraCount();
          if (liveCount > 0) {
            setCameraRows([
              { type: 'Ogólna', quantity: liveCount, quantityPerPole: 2 },
              { type: 'LPR', quantity: 0, quantityPerPole: 1 },
              { type: 'SKP', quantity: 0, quantityPerPole: 1 },
            ]);
          }
        }
      }
      setCurrentStep(WizardStep.CAMERAS);
    } else if (currentStep === WizardStep.CAMERAS) {
      const ok = await handleResolve();
      if (ok) setCurrentStep(WizardStep.BOM);
    } else if (currentStep === WizardStep.BOM) {
      if (resolvedBom?.templateMissing) {
        setError('Nie można kontynuować — brak szablonu BOM.');
        return;
      }
      if (resolvedBom?.needsRecorder) {
        setCurrentStep(WizardStep.RECORDER);
      } else {
        setCurrentStep(WizardStep.SUMMARY);
      }
    } else if (currentStep === WizardStep.RECORDER) {
      setCurrentStep(WizardStep.SUMMARY);
    }
  };

  const handleBack = () => {
    if (currentStep === WizardStep.CAMERAS) {
      setCurrentStep(WizardStep.PARAMS);
    } else if (currentStep === WizardStep.BOM) {
      setCurrentStep(WizardStep.CAMERAS);
    } else if (currentStep === WizardStep.RECORDER) {
      setCurrentStep(WizardStep.BOM);
    } else if (currentStep === WizardStep.SUMMARY) {
      setCurrentStep(resolvedBom?.needsRecorder ? WizardStep.RECORDER : WizardStep.BOM);
    }
  };

  // Re-resolve after recorder/retention change
  const handleReResolve = async () => {
    await handleResolve();
  };

  // ── Steps bar data ────────────────────────────────────────────

  const steps = [
    { step: WizardStep.PARAMS, label: 'Parametry' },
    { step: WizardStep.CAMERAS, label: 'Kamery' },
    { step: WizardStep.BOM, label: 'BOM' },
    ...(resolvedBom?.needsRecorder ? [{ step: WizardStep.RECORDER, label: 'Rejestrator' }] : []),
    { step: WizardStep.SUMMARY, label: 'Podsumowanie' },
  ];

  const getStepState = (step: WizardStep) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'active';
    return 'disabled';
  };

  const getNextButtonLabel = (): string => {
    if (resolving) return '⏳ Obliczam BOM...';
    if (currentStep === WizardStep.CAMERAS) return 'Oblicz BOM →';
    return 'Dalej →';
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="wizard-overlay" onClick={onClose}>
      <div className="wizard-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="wizard-header">
          <h2>🧙 Wizard konfiguracji zadania</h2>
          <button className="wizard-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Steps bar */}
        <div className="wizard-steps-bar">
          {steps.map((s, idx) => {
            const state = getStepState(s.step);
            return (
              <React.Fragment key={s.step}>
                {idx > 0 && (
                  <div className={`wizard-step-connector${state === 'completed' || idx <= steps.findIndex(x => x.step === currentStep) ? ' completed' : ''}`} />
                )}
                <div className={`wizard-step-item ${state}`}>
                  <div className="wizard-step-number">
                    {state === 'completed' ? '✓' : s.step + 1}
                  </div>
                  <span className="wizard-step-label">{s.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Body */}
        <div className="wizard-body">
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
              Ładowanie konfiguracji...
            </div>
          )}

          {!loading && error && currentStep === WizardStep.PARAMS && (
            <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>
          )}

          {!loading && currentStep === WizardStep.PARAMS && (
            <WizardStepParams
              configGroups={configGroups}
              configValues={configValues}
              selectedModels={selectedModels}
              bomGroups={bomGroups}
              onConfigChange={(paramName, value) =>
                setConfigValues(prev => ({ ...prev, [paramName]: value }))
              }
              onSelectedModelsChange={setSelectedModels}
            />
          )}

          {!loading && currentStep === WizardStep.CAMERAS && (
            <>
              {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}
              <WizardStepCameras
                cameraRows={cameraRows}
                retentionDays={retentionDays}
                userEditedRows={userEditedRows}
                onCameraRowsChange={rows => { setCameraRows(rows); setUserEditedRows(true); }}
                onRetentionDaysChange={setRetentionDays}
              />
            </>
          )}

          {!loading && currentStep === WizardStep.BOM && resolvedBom && (
            <>
              {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}
              <WizardStepBom resolvedBom={resolvedBom} bomGroups={bomGroups} />
            </>
          )}

          {!loading && currentStep === WizardStep.RECORDER && resolvedBom && (
            <>
              {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}
              <WizardStepRecorder
                resolvedBom={resolvedBom}
                selectedRecorderId={selectedRecorderId}
                retentionDays={retentionDays}
                onRecorderChange={setSelectedRecorderId}
                onRetentionDaysChange={setRetentionDays}
                onReResolve={handleReResolve}
              />
            </>
          )}

          {!loading && currentStep === WizardStep.SUMMARY && resolvedBom && (
            <>
              {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}
              <WizardStepSummary
                task={task}
                resolvedBom={resolvedBom}
                configValues={configValues}
                selectedModels={selectedModels}
                retentionDays={retentionDays}
                selectedRecorderId={selectedRecorderId}
              />
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="wizard-footer">
            <div>
              {currentStep > WizardStep.PARAMS && (
                <button
                  className="btn btn-secondary"
                  onClick={handleBack}
                  disabled={resolving || saving}
                >
                  ← Wstecz
                </button>
              )}
            </div>
            <div className="wizard-footer-right">
              <button className="btn btn-secondary" onClick={onClose} disabled={resolving || saving}>
                Anuluj
              </button>
              {currentStep < WizardStep.SUMMARY && (
                <button
                  className="btn btn-primary"
                  onClick={handleNext}
                  disabled={resolving || saving || (currentStep === WizardStep.BOM && !!resolvedBom?.templateMissing)}
                >
                  {getNextButtonLabel()}
                </button>
              )}
              {currentStep === WizardStep.SUMMARY && (
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? '⏳ Zapisywanie...' : '✅ Zatwierdź'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskConfigWizard;
