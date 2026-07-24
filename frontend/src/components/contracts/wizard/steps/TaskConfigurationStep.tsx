// src/components/contracts/wizard/steps/TaskConfigurationStep.tsx
// Step 8: Task Configuration – sidebar with task list + workspace with BOM per task

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WizardData, TaskConfiguration, ResolvedMaterial } from '../types/wizard.types';
import { generateAllTasks } from '../utils/taskGenerator';
import { resolveTaskVariant } from '../utils/taskGenerator';
import bomSubsystemTemplateService from '../../../../services/bomSubsystemTemplate.service';
import bomResolverService from '../../../../services/bomResolver.service';
import { wizardHierarchyService } from '../../../../services/wizardHierarchy.service';
import './TaskConfigurationStep.css';

interface Props {
  wizardData: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
}

interface TaskEntry {
  key: string;           // e.g. "SMOKIP_A-0"
  taskWizardId?: string;
  taskNumber?: string;
  taskName: string;
  taskType: string;
  subsystemType: string;
  subsystemParams: Record<string, unknown>;
  taskVariant?: string | null;
}

function readNumericConfigParam(
  configParams: Record<string, unknown>,
  paramPath: string
): number {
  const direct = configParams[paramPath];
  if (typeof direct === 'number' && Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  const keys = paramPath.split('.');
  let current: unknown = configParams;
  for (const key of keys) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[key];
    } else {
      return 0;
    }
  }

  return typeof current === 'number' && Number.isFinite(current) && current > 0 ? current : 0;
}

function createBomResolverRequest(
  task: TaskEntry,
  configParams: Record<string, unknown>
) {
  const cameraCount = Math.max(
    readNumericConfigParam(configParams, 'cameraCount'),
    readNumericConfigParam(configParams, 'camera.total'),
    readNumericConfigParam(configParams, 'camera.total.ip'),
    readNumericConfigParam(configParams, 'camera.ip.total'),
    readNumericConfigParam(configParams, 'lcsConfig.iloscKamer'),
    readNumericConfigParam(configParams, 'nastawniConfig.iloscKamer')
  );

  const cameraBreakdown = {
    total: cameraCount,
    ogolna: readNumericConfigParam(configParams, 'camera.total.ip.ogolna'),
    lpr: readNumericConfigParam(configParams, 'camera.total.ip.lpr'),
    skp: readNumericConfigParam(configParams, 'camera.total.ip.skp')
  };

  const hasCameraBreakdown = cameraBreakdown.total > 0 || cameraBreakdown.ogolna > 0 || cameraBreakdown.lpr > 0 || cameraBreakdown.skp > 0;

  return {
    subsystemType: task.subsystemType,
    taskType: task.taskType,
    taskVariant: task.taskVariant ?? null,
    configParams,
    ...(cameraCount > 0 && { cameraCount }),
    ...(hasCameraBreakdown && { cameraBreakdown })
  }
}

export const TaskConfigurationStep: React.FC<Props> = ({ wizardData, onUpdate }) => {
  const allGeneratedTasks = generateAllTasks(wizardData.subsystems, wizardData.liniaKolejowa);

  // Build flat list of task entries from wizard subsystems
  const taskEntries: TaskEntry[] = [];
  wizardData.subsystems.forEach((sub, subIdx) => {
    const subTasks = (sub.taskDetails || []);
    const generatedForSub = generateAllTasks([sub], wizardData.liniaKolejowa);
    generatedForSub.forEach((gen, taskIdx) => {
      const detail = subTasks[taskIdx];
      const globalIdx = allGeneratedTasks.findIndex(
        (t) => t.name === gen.name && t.type === gen.type && t.subsystemType === gen.subsystemType
      );
      const key = `${sub.type}-${globalIdx >= 0 ? globalIdx : `${subIdx}-${taskIdx}`}`;
      taskEntries.push({
        key,
        taskWizardId: detail?.taskWizardId,
        taskNumber: detail?.taskNumber,
        taskName: gen.name,
        taskType: gen.type,
        subsystemType: sub.type,
        subsystemParams:
          sub.params && typeof sub.params === 'object' && !Array.isArray(sub.params)
            ? (sub.params as Record<string, unknown>)
            : {},
        taskVariant: detail ? resolveTaskVariant(detail.taskType, detail) : null,
      });
    });
  });

  const [activeTaskKey, setActiveTaskKey] = useState<string>(taskEntries[0]?.key || '');
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState('');

  const taskConfigs: Record<string, TaskConfiguration> = wizardData.taskConfigurations || {};
  const customOrdersEnabled = !!wizardData.customOrdersEnabled;

  // Use a ref to always read the latest taskConfigs inside async callbacks without
  // adding it as a dependency of loadTemplate (which would cause infinite re-renders).
  const taskConfigsRef = useRef(taskConfigs);
  taskConfigsRef.current = taskConfigs;

  // Ref for wizardData – keeps loadTemplate stable while still reading latest state.
  const wizardDataRef = useRef(wizardData);
  wizardDataRef.current = wizardData;

  const activeTask = taskEntries.find((t) => t.key === activeTaskKey);
  const activeConfig = activeTaskKey ? taskConfigs[activeTaskKey] : undefined;

  const loadTemplate = useCallback(
    async (task: TaskEntry) => {
      setLoadingTemplate(true);
      setTemplateError('');
      try {
        const template = await bomSubsystemTemplateService.getTemplateFor(
          task.subsystemType,
          task.taskVariant ?? null
        );
        if (!template) {
          setTemplateError('Brak szablonu BOM dla tego zadania.');
          return;
        }

        // Read the latest configs via ref to avoid stale closure
        const currentConfigs = taskConfigsRef.current;
        const configParams: Record<string, unknown> = {
          ...task.subsystemParams,
          ...(currentConfigs[task.key]?.configParams || {})
        };

        // Inject hierarchy.* variables when the template uses them.
        const usesHierarchy = template.items.some(
          (item) =>
            item.configParamName?.startsWith('hierarchy.') ||
            item.dependencyFormula?.includes('hierarchy.')
        );

        if (usesHierarchy) {
          const currentWizardData = wizardDataRef.current;
          const wizardRels = currentWizardData.taskRelationships
            ? Object.values(currentWizardData.taskRelationships)
            : [];

          // Use taskWizardId as the primary key (matches relationship parentWizardId /
          // childTaskKeys); fall back to task.key for tasks without a wizardId.
          const taskKey = task.taskWizardId ?? task.key;
          const taskNumber =
            task.taskNumber && task.taskNumber !== task.key ? task.taskNumber : undefined;

          const hierarchyCtx = await wizardHierarchyService.resolveHierarchy({
            taskKey,
            taskNumber,
            wizardRelationships: wizardRels,
          });

          if (hierarchyCtx) {
            configParams['hierarchy.depth'] = hierarchyCtx.depth;
            configParams['hierarchy.parent'] = hierarchyCtx.parentKey ?? '';
            configParams['hierarchy.children'] = hierarchyCtx.childrenCount;
            configParams['hierarchy.path'] = hierarchyCtx.path;
            configParams['hierarchy.isChildOfLcs'] = hierarchyCtx.isChildOfLcs;
          }
        }

        const resolved = await bomResolverService.resolve(createBomResolverRequest(task, configParams));
        const materials: ResolvedMaterial[] = resolved.items.map((item) => ({
          id: item.templateItemId,
          materialName: item.materialName,
          catalogNumber: item.catalogNumber ?? undefined,
          quantity: item.resolvedQuantity,
          unit: item.unit,
          quantitySource: item.quantitySource,
          groupName: item.groupName || 'Inne',
          requiresIp: item.requiresIp,
          isSelected: item.isRequired || item.resolvedQuantity > 0,
        }));

        const updatedConfig: TaskConfiguration = {
          taskId: task.key,
          taskNumber: task.taskNumber || task.key,
          taskName: task.taskName,
          taskType: task.taskType,
          subsystemType: task.subsystemType,
          taskVariant: task.taskVariant,
          bomTemplateId: resolved.templateId ?? template.id,
          bomTemplateVersion: resolved.templateVersion ?? template.version,
          materials,
          configParams,
          isConfigured: false,
        };

        onUpdate({
          taskConfigurations: { ...currentConfigs, [task.key]: updatedConfig },
        });
      } catch {
        setTemplateError('Nie udało się załadować szablonu BOM.');
      } finally {
        setLoadingTemplate(false);
      }
    },
    [onUpdate]
  );

  // Auto-load template when switching to a task that has no config yet.
  // We intentionally only react to activeTaskKey changes; taskConfigs is read
  // via taskConfigsRef to avoid stale closures without triggering re-runs.
  useEffect(() => {
    const current = taskConfigsRef.current;
    if (activeTask && !current[activeTask.key]) {
      loadTemplate(activeTask);
    }
  }, [activeTaskKey, activeTask, loadTemplate]);

  const updateMaterial = (taskKey: string, materialId: number, patch: Partial<ResolvedMaterial>) => {
    const config = taskConfigs[taskKey];
    if (!config) return;
    const materials = config.materials.map((m) => (m.id === materialId ? { ...m, ...patch } : m));
    onUpdate({
      taskConfigurations: {
        ...taskConfigs,
        [taskKey]: { ...config, materials },
      },
    });
  };

  const applyBOM = (taskKey: string) => {
    const config = taskConfigs[taskKey];
    if (!config) return;
    onUpdate({
      taskConfigurations: {
        ...taskConfigs,
        [taskKey]: { ...config, isConfigured: true, lastModified: new Date() },
      },
    });
  };

  // Group materials by groupName
  const groupedMaterials = (materials: ResolvedMaterial[]) => {
    const groups: Record<string, ResolvedMaterial[]> = {};
    materials.forEach((m) => {
      const g = m.groupName || 'Inne';
      if (!groups[g]) groups[g] = [];
      groups[g].push(m);
    });
    return groups;
  };

  return (
    <div className="wizard-step-content task-config-step">
      <div className="task-config-layout">
        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
        <div className="task-config-sidebar">
          <div className="task-config-sidebar-header">
            <div className="task-config-sidebar-title">📋 Lista Zadań</div>

            {/* Custom orders toggle */}
            <div className="custom-orders-toggle">
              <label htmlFor="customOrders" className="custom-orders-label">
                <strong>Zamówienia Niestandardowe</strong>
              </label>
              <input
                type="checkbox"
                id="customOrders"
                checked={customOrdersEnabled}
                onChange={(e) =>
                  onUpdate({ customOrdersEnabled: e.target.checked })
                }
              />
            </div>
          </div>

          {taskEntries.length === 0 ? (
            <p className="task-config-empty-hint">Brak zadań w wizardzie.</p>
          ) : (
            <ul className="task-config-task-list">
              {taskEntries.map((task) => {
                const cfg = taskConfigs[task.key];
                const isActive = task.key === activeTaskKey;
                const isConfigured = cfg?.isConfigured;
                return (
                  <li
                    key={task.key}
                    className={`task-config-task-item${isActive ? ' active' : ''}${isConfigured ? ' configured' : ''}`}
                    onClick={() => setActiveTaskKey(task.key)}
                  >
                    <span className="task-config-status-icon">
                      {isConfigured ? '✅' : '⏳'}
                    </span>
                    <span className="task-config-task-label">
                      {task.taskNumber || task.key}
                    </span>
                    <span className="task-config-task-name">{task.taskName}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── RIGHT WORKSPACE ──────────────────────────────────────────── */}
        <div className="task-config-workspace">
          {!activeTask ? (
            <div className="task-config-placeholder">
              <p>Wybierz zadanie z listy po lewej, aby skonfigurować BOM.</p>
            </div>
          ) : loadingTemplate ? (
            <div className="task-config-placeholder">
              <p>⏳ Ładowanie szablonu BOM…</p>
            </div>
          ) : templateError ? (
            <div className="task-config-placeholder">
              <p className="task-config-error">{templateError}</p>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => loadTemplate(activeTask)}
              >
                🔄 Spróbuj ponownie
              </button>
            </div>
          ) : !activeConfig ? (
            <div className="task-config-placeholder">
              <p>Brak szablonu BOM dla zadania <strong>{activeTask.taskName}</strong>.</p>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => loadTemplate(activeTask)}
              >
                🔄 Załaduj szablon
              </button>
            </div>
          ) : (
            <>
              <div className="task-config-workspace-header">
                <h4>
                  📦 BOM {activeTask.subsystemType} – {activeTask.taskName}
                  {activeConfig.bomTemplateVersion && (
                    <span className="bom-version"> v{activeConfig.bomTemplateVersion}</span>
                  )}
                </h4>
                {activeConfig.isConfigured && (
                  <span className="bom-configured-badge">✅ Skonfigurowane</span>
                )}
              </div>

              {Object.entries(groupedMaterials(activeConfig.materials)).map(([group, items]) => (
                <div key={group} className="bom-group">
                  <div className="bom-group-title">
                    {group} ({items.length})
                  </div>
                  <table className="bom-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Materiał</th>
                        <th>Ilość</th>
                        <th>J.</th>
                        <th>Źródło</th>
                        <th>IP</th>
                        <th>✓</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((material, mIdx) => (
                        <tr
                          key={material.id}
                          className={material.isSelected ? 'bom-row-selected' : 'bom-row-deselected'}
                        >
                          <td className="bom-cell-num">{mIdx + 1}</td>
                          <td>
                            <div className="bom-material-name">{material.materialName}</div>
                            {material.catalogNumber && (
                              <div className="bom-catalog-num">{material.catalogNumber}</div>
                            )}
                          </td>
                          <td>
                            <input
                              type="number"
                              className="bom-qty-input"
                              value={material.quantity}
                              min={0}
                              onChange={(e) =>
                                updateMaterial(activeTaskKey, material.id, {
                                  quantity: parseFloat(e.target.value) || 0,
                                })
                              }
                            />
                          </td>
                          <td className="bom-cell-unit">{material.unit}</td>
                          <td>
                            <span className={`bom-source-badge bom-source-${material.quantitySource.toLowerCase()}`}>
                              {material.quantitySource}
                            </span>
                          </td>
                          <td>{material.requiresIp ? '🌐' : '—'}</td>
                          <td>
                            <input
                              type="checkbox"
                              checked={material.isSelected}
                              onChange={(e) =>
                                updateMaterial(activeTaskKey, material.id, {
                                  isSelected: e.target.checked,
                                })
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              <div className="bom-apply-section">
                <button
                  className="btn btn-success"
                  onClick={() => applyBOM(activeTaskKey)}
                >
                  ✅ Zastosuj BOM do zadania
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => loadTemplate(activeTask)}
                  style={{ marginLeft: '8px' }}
                >
                  🔄 Przeładuj szablon
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
