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
import type { Task } from '../../../types/task.types';
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
  BOM: 1,
  RECORDER: 2,
  SUMMARY: 3,
} as const;
type WizardStep = (typeof WizardStep)[keyof typeof WizardStep];

interface TaskConfigWizardProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
}

// ── Component ────────────────────────────────────────────────

export const TaskConfigWizard: React.FC<TaskConfigWizardProps> = ({ task, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.PARAMS);
  const [configValues, setConfigValues] = useState<Record<string, any>>({});
  const [selectedModels, setSelectedModels] = useState<Record<string, { checked: boolean; quantity: number }>>({});
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [selectedRecorderId, setSelectedRecorderId] = useState<number | null>(null);
  const [resolvedBom, setResolvedBom] = useState<BomResolveResult | null>(null);
  const [template, setTemplate] = useState<BomSubsystemTemplate | null>(null);
  const [configGroups, setConfigGroups] = useState<ConfigGroup[]>([]);
  const [bomGroups, setBomGroups] = useState<BomGroup[]>([]);
  const [isStandaloneNastawnia, setIsStandaloneNastawnia] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    initWizard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initWizard = async () => {
    try {
      setLoading(true);
      setError('');

      // Load existing config from task metadata
      const existingConfig = task.metadata?.configParams || {};
      setConfigValues(existingConfig);

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

      // Load BOM groups
      const groups = await bomGroupService.getAll();
      setBomGroups(groups);

      // Load template
      const subsystemType = task.metadata?.subsystemType || task.taskType?.code || '';
      const taskVariant = task.metadata?.taskVariant || null;

      if (!subsystemType) {
        setError('Brak informacji o typie podsystemu w zadaniu');
        setLoading(false);
        return;
      }

      // Determine isStandaloneNastawnia for SMOKIP_A NASTAWNIA tasks.
      // A NASTAWNIA is "standalone" (needs its own recorder) when it is NOT a child
      // of any LCS task.  Priority: explicit metadata flag → live relationship query.
      const taskTypeCode = task.taskType?.code || '';
      if (subsystemType === 'SMOKIP_A' && taskTypeCode === 'NASTAWNIA') {
        const metadataFlag = task.metadata?.isStandaloneNastawnia;
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

  const extractCameraCountFromTask = (): number => {
    const taskTypeCode = task.taskType?.code || '';
    const meta = task.metadata || {};

    if (taskTypeCode === 'LCS' && meta.subsystemType === 'SMOKIP_B') {
      return (meta.lcsConfig as any)?.serwerObrazu?.maxKamer || 0;
    }

    if (taskTypeCode === 'LCS') {
      const lcsCfg = meta.lcsConfig as any;
      if (lcsCfg?.iloscKamer) return Number(lcsCfg.iloscKamer);
      if (Array.isArray(lcsCfg?.obserwowanePrzejazdy)) {
        return lcsCfg.obserwowanePrzejazdy.length * 2;
      }
      return 0;
    }

    if (taskTypeCode === 'NASTAWNIA' && isStandaloneNastawnia) {
      const cfg = meta.nastawniConfig as any;
      return cfg?.iloscKamer
        || cfg?.obserwowanePrzejazdy?.length
        || 0;
    }

    if (taskTypeCode === 'NASTAWNIA' && !isStandaloneNastawnia) {
      const cfg = meta.nastawniConfig as any;
      return cfg?.stacjaOperatorska?.przypisaneKamery?.length
        || cfg?.iloscKamer
        || 0;
    }

    return 0;
  };

  // ── handleResolve ────────────────────────────────────────────

  const handleResolve = async (): Promise<boolean> => {
    setResolving(true);
    setError('');
    try {
      const subsystemType = task.metadata?.subsystemType || task.taskType?.code || '';
      const taskType = task.taskType?.code || subsystemType;
      const taskVariant = task.metadata?.taskVariant || null;
      const cameraCount = extractCameraCountFromTask();

      const result = await bomResolverService.resolve({
        subsystemType,
        taskType,
        taskVariant,
        configParams: { ...configValues, selectedModels },
        isStandaloneNastawnia,
        selectedRecorderId: selectedRecorderId || null,
        retentionDays,
        cameraCount,
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
      const newConfigParams = {
        ...(task.metadata?.configParams || {}),
        ...configValues,
        selectedModels,
        retentionDays,
        selectedRecorderId: selectedRecorderId || null,
        appliedBomTemplateId: resolvedBom.templateId || null,
        wizardResolvedAt: resolvedBom.resolvedAt || new Date().toISOString(),
      };

      await taskService.update(task.taskNumber, {
        metadata: { ...task.metadata, configParams: newConfigParams },
        status: 'configured',
      });

      if (resolvedBom.templateId && template?.id) {
        const prevApplied = task.metadata?.configParams?.appliedBomTemplateId;
        if (prevApplied !== resolvedBom.templateId) {
          await bomSubsystemTemplateService.applyToTask(
            resolvedBom.templateId,
            task.id,
            { ...configValues, selectedModels }
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
      const ok = await handleResolve();
      if (ok) setCurrentStep(WizardStep.BOM);
    } else if (currentStep === WizardStep.BOM) {
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
    if (currentStep === WizardStep.BOM) {
      setCurrentStep(WizardStep.PARAMS);
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
    { step: WizardStep.BOM, label: 'BOM' },
    ...(resolvedBom?.needsRecorder ? [{ step: WizardStep.RECORDER, label: 'Rejestrator' }] : []),
    { step: WizardStep.SUMMARY, label: 'Podsumowanie' },
  ];

  const getStepState = (step: WizardStep) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'active';
    return 'disabled';
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
              retentionDays={retentionDays}
              bomGroups={bomGroups}
              onConfigChange={(paramName, value) =>
                setConfigValues(prev => ({ ...prev, [paramName]: value }))
              }
              onSelectedModelsChange={setSelectedModels}
              onRetentionDaysChange={setRetentionDays}
            />
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
                  disabled={resolving || saving}
                >
                  {resolving ? '⏳ Obliczam BOM...' : currentStep === WizardStep.PARAMS ? 'Oblicz BOM →' : 'Dalej →'}
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
