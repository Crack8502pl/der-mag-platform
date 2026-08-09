// src/components/contracts/wizard/steps/TaskConfigurationStep.tsx
// Step 8: Task Configuration – sidebar with task list + workspace with BOM per task

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { WizardData, TaskConfiguration, ResolvedMaterial } from '../types/wizard.types';
import { generateAllTasks } from '../utils/taskGenerator';
import { resolveTaskVariant } from '../utils/taskGenerator';
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

  const configParamsWithCameraCount =
    cameraCount > 0 ? { ...configParams, cameraCount } : configParams;

  return {
    subsystemType: task.subsystemType,
    taskType: task.taskType,
    taskVariant: task.taskVariant ?? null,
    configParams: configParamsWithCameraCount,
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
  // Manual camera count override per LCS task key (fallback when children have no config yet)
  const [lcsManualCameraCount, setLcsManualCameraCount] = useState<Record<string, number>>({});

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

  /**
   * Resolve total camera count for an LCS task by recursively traversing its
   * subtree in taskRelationships.
   */
  const resolveLcsCameraCount = useCallback(
    (lcsTask: TaskEntry, manualOverride?: number): number => {
      if (lcsTask.taskType !== 'LCS') return 0;

      const allRels = wizardDataRef.current.taskRelationships ?? {};
      const allConfigs = taskConfigsRef.current;

      const cameraCountFromMaterials = (taskKey: string): number => {
        const cfg = allConfigs[taskKey];
        if (!cfg) return 0;

        const cp = cfg.configParams;
        if (cp) {
          const fromParams = Math.max(
            readNumericConfigParam(cp, 'cameraCount'),
            readNumericConfigParam(cp, 'camera.total'),
            readNumericConfigParam(cp, 'camera.total.ip')
          );
          if (fromParams > 0) return fromParams;
        }

        return cfg.materials
          .filter((m) => m.isSelected && /kamera/i.test(m.groupName || ''))
          .reduce((sum, m) => sum + (m.quantity || 0), 0);
      };

      const collectCameras = (parentWizardId: string): number => {
        const rel = allRels[parentWizardId];
        if (!rel) return 0;

        let total = 0;
        for (const childKey of rel.childTaskKeys) {
          const childEntry = taskEntries.find((t) => t.key === childKey);
          if (!childEntry) continue;

          if (childEntry.taskType === 'NASTAWNIA') {
            if (childEntry.taskWizardId) {
              total += collectCameras(childEntry.taskWizardId);
            }
          } else {
            total += cameraCountFromMaterials(childKey);
          }
        }
        return total;
      };

      const lcsWizardId = lcsTask.taskWizardId ?? lcsTask.key;
      const fromHierarchy = collectCameras(lcsWizardId);
      if (fromHierarchy > 0) return fromHierarchy;

      return manualOverride ?? lcsManualCameraCount[lcsTask.key] ?? 0;
    },
    [taskEntries, lcsManualCameraCount]
  );

  const loadTemplate = useCallback(
    async (task: TaskEntry, manualCameraCount?: number) => {
      setLoadingTemplate(true);
      setTemplateError('');
      try {
        // Read the latest configs via ref to avoid stale closure
        const currentConfigs = taskConfigsRef.current;
        const configParams: Record<string, unknown> = {
          ...task.subsystemParams,
          ...(currentConfigs[task.key]?.configParams || {})
        };

        // For LCS tasks: inject cameraCount summed from all PRZEJAZD/SKP descendants
        if (task.taskType === 'LCS') {
          const lcsCameraCount = resolveLcsCameraCount(task, manualCameraCount);
          if (lcsCameraCount > 0) {
            configParams['cameraCount'] = lcsCameraCount;
            configParams['lcsConfig.iloscKamer'] = lcsCameraCount;
            configParams['camera.total'] = lcsCameraCount;
            configParams['camera.total.ip'] = lcsCameraCount;
            const existingLcsConfig =
              configParams['lcsConfig'] && typeof configParams['lcsConfig'] === 'object'
                ? (configParams['lcsConfig'] as Record<string, unknown>)
                : {};
            configParams['lcsConfig'] = { ...existingLcsConfig, iloscKamer: lcsCameraCount };
          }
        }

        const currentWizardData = wizardDataRef.current;
        const wizardRels = currentWizardData.taskRelationships
          ? Object.values(currentWizardData.taskRelationships)
          : [];

        // Use taskWizardId as the primary key (matches relationship parentWizardId /
        // childTaskKeys); fall back to task.key for tasks without a wizardId.
        const taskKey = task.taskWizardId ?? task.key;
        const taskNumber =
          task.taskNumber && task.taskNumber !== task.key ? task.taskNumber : undefined;

        if (wizardRels.length > 0 || taskNumber) {
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
          bomTemplateId: resolved.templateId ?? undefined,
          bomTemplateVersion: resolved.templateVersion ?? undefined,
          materials,
          templateMissing: resolved.templateMissing,
          recorderRecommendation: resolved.recorderRecommendation,
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
    [onUpdate, resolveLcsCameraCount]
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

  // ── Auto-reload LCS when its PRZEJAZD/SKP descendants camera sum changes ─────
  const lcsCameraSnapshotRef = useRef<Record<string, number>>({});

  const currentLcsCameraSnapshot = useMemo(() => {
    const snapshot: Record<string, number> = {};
    const allRels = wizardData.taskRelationships ?? {};

    const leafCameras = (taskKey: string): number => {
      const cfg = taskConfigs[taskKey];
      if (!cfg) return 0;
      const cp = cfg.configParams;
      if (cp) {
        const v = Math.max(
          readNumericConfigParam(cp, 'cameraCount'),
          readNumericConfigParam(cp, 'camera.total'),
          readNumericConfigParam(cp, 'camera.total.ip')
        );
        if (v > 0) return v;
      }
      return cfg.materials
        .filter((m) => m.isSelected && /kamera/i.test(m.groupName || ''))
        .reduce((sum, m) => sum + (m.quantity || 0), 0);
    };

    const collect = (parentWizardId: string): number => {
      const rel = allRels[parentWizardId];
      if (!rel) return 0;
      let total = 0;
      for (const childKey of rel.childTaskKeys) {
        const childEntry = taskEntries.find((t) => t.key === childKey);
        if (!childEntry) continue;
        if (childEntry.taskType === 'NASTAWNIA' && childEntry.taskWizardId) {
          total += collect(childEntry.taskWizardId);
        } else {
          total += leafCameras(childKey);
        }
      }
      return total;
    };

    for (const entry of taskEntries) {
      if (entry.taskType !== 'LCS') continue;
      const lcsWizardId = entry.taskWizardId ?? entry.key;
      snapshot[entry.key] = collect(lcsWizardId);
    }
    return snapshot;
  }, [taskConfigs, taskEntries, wizardData.taskRelationships]);

  useEffect(() => {
    const prev = lcsCameraSnapshotRef.current;
    const toReload: TaskEntry[] = [];
    for (const [lcsKey, newTotal] of Object.entries(currentLcsCameraSnapshot)) {
      if (newTotal > 0 && prev[lcsKey] !== newTotal) {
        const task = taskEntries.find((t) => t.key === lcsKey);
        if (task) toReload.push(task);
      }
    }
    lcsCameraSnapshotRef.current = currentLcsCameraSnapshot;
    if (toReload.length === 0) return;
    for (const lcsTask of toReload) {
      loadTemplate(lcsTask);
    }
  }, [currentLcsCameraSnapshot, taskEntries, loadTemplate]);

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

    const LEAF_TASK_TYPES = ['PRZEJAZD_KAT_A', 'PRZEJAZD_KAT_B', 'PRZEJAZD_KAT_C',
                             'PRZEJAZD_KAT_E', 'PRZEJAZD_KAT_F', 'SKP'];
    let extraConfigParams: Record<string, unknown> = {};
    if (LEAF_TASK_TYPES.includes(config.taskType)) {
      const cameraMaterials = config.materials.filter(
        (m) => m.isSelected && /kamera/i.test(m.groupName || '')
      );
      const cameraTotal = cameraMaterials.reduce((sum, m) => sum + (m.quantity || 0), 0);
      if (cameraTotal > 0) {
        extraConfigParams = {
          cameraCount: cameraTotal,
          'camera.total': cameraTotal,
          'camera.total.ip': cameraTotal,
        };
      }
    }

    onUpdate({
      taskConfigurations: {
        ...taskConfigs,
        [taskKey]: {
          ...config,
          configParams: { ...(config.configParams ?? {}), ...extraConfigParams },
          isConfigured: true,
          lastModified: new Date(),
        },
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

              {/* LCS camera count info panel */}
              {activeTask.taskType === 'LCS' && (
                <div style={{
                  marginBottom: '16px', padding: '14px 16px',
                  background: 'rgba(255,107,53,0.07)',
                  border: '1px solid rgba(255,107,53,0.3)',
                  borderRadius: '8px', display: 'flex', alignItems: 'center',
                  gap: '12px', flexWrap: 'wrap' as const
                }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', flex: '1 1 200px' }}>
                    {'📹 '}
                    <strong>Kamery w poddrzewie LCS</strong>{' — '}
                    {resolveLcsCameraCount(activeTask) > 0
                      ? <span style={{ color: 'var(--success-color)' }}>
                          {'auto: '}{resolveLcsCameraCount(activeTask)}
                          {' (suma kamer z Przejazdów i SKP)'}
                        </span>
                      : <span style={{ color: 'var(--warning-color)' }}>
                          {'brak skonfigurowanych przejazdów — wpisz ręcznie lub skonfiguruj Przejazdy/SKP najpierw'}
                        </span>
                    }
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number" min={0}
                      style={{
                        width: '80px', padding: '5px 8px',
                        border: '1px solid var(--border-color)', borderRadius: '4px',
                        background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '13px'
                      }}
                      value={lcsManualCameraCount[activeTaskKey] ?? resolveLcsCameraCount(activeTask)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setLcsManualCameraCount(prev => ({ ...prev, [activeTaskKey]: val }));
                      }}
                    />
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => loadTemplate(activeTask, lcsManualCameraCount[activeTaskKey])}
                    >
                      🔄 Zastosuj
                    </button>
                  </div>
                </div>
              )}

              {activeConfig.recorderRecommendation && (
                <div style={{ marginBottom: '16px', padding: '12px 16px',
                  background: 'rgba(72,187,120,0.08)', border: '1px solid rgba(72,187,120,0.3)',
                  borderRadius: '8px' }}>
                  <strong style={{ color: 'var(--success-color)' }}>🖥️ Dobrany rejestrator:</strong>{' '}
                  {activeConfig.recorderRecommendation.recorder.modelName}{' '}
                  ({activeConfig.recorderRecommendation.recorder.manufacturer}) —{' '}
                  {activeConfig.recorderRecommendation.recorder.minCameras}
                  {'–'}{activeConfig.recorderRecommendation.recorder.maxCameras}{' kamer'}
                </div>
              )}

              {activeConfig.templateMissing ? (
                <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                  ⚠️ Brak szablonu BOM dla zadania {activeTask.subsystemType} / {activeTask.taskType}.
                  Utwórz go w <strong>Administracja → BOM Builder</strong>.
                </div>
              ) : activeConfig.materials.length === 0 ? (
                <div style={{ marginBottom: '16px', padding: '16px',
                  background: 'rgba(237,137,54,0.1)', border: '1px solid rgba(237,137,54,0.4)',
                  borderRadius: '8px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--warning-color)' }}>
                    ⚠️ Szablon BOM nie zawiera pozycji materiałowych
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Szablon <strong>v{activeConfig.bomTemplateVersion}</strong> dla{' '}
                    <strong>{activeTask.subsystemType} / {activeTask.taskType}</strong> jest pusty.
                    Dodaj pozycje w <strong>Administracja → BOM Builder → Pozycje BOM</strong>.
                  </p>
                </div>
              ) : (
                Object.entries(groupedMaterials(activeConfig.materials)).map(([group, items]) => (
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
                ))
              )}

              <div className="bom-apply-section">
                <button
                  className="btn btn-success"
                  disabled={activeConfig.templateMissing || activeConfig.materials.length === 0}
                  style={
                    (activeConfig.templateMissing || activeConfig.materials.length === 0)
                      ? { opacity: 0.4, cursor: 'not-allowed' }
                      : undefined
                  }
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
