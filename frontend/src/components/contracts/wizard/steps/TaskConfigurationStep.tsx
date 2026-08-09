// src/components/contracts/wizard/steps/TaskConfigurationStep.tsx
// Step 8: Task Configuration – sidebar with task list + workspace with BOM per task

import React, { useState, useEffect, useRef, useCallback } from 'react';
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

interface CameraBreakdown {
  total: number;
  ogolna: number;
  lpr: number;
  skp: number;
}

interface BomResolverRequestOptions {
  cameraCount?: number;
  cameraBreakdown?: CameraBreakdown;
  isStandaloneNastawnia?: boolean;
}

const CAMERA_REGEX = /kamera/i;
const CAMERA_LPR_REGEX = /lpr/i;
const CAMERA_SKP_REGEX = /skp/i;
const CAMERA_OGOLNA_REGEX = /ogoln/i;

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
  configParams: Record<string, unknown>,
  options: BomResolverRequestOptions = {}
) {
  const explicitBreakdown = options.cameraBreakdown;
  const explicitCameraCount = Math.max(0, options.cameraCount ?? explicitBreakdown?.total ?? 0);
  const cameraCount = Math.max(
    explicitCameraCount,
    readNumericConfigParam(configParams, 'cameraCount'),
    readNumericConfigParam(configParams, 'camera.total'),
    readNumericConfigParam(configParams, 'camera.total.ip'),
    readNumericConfigParam(configParams, 'camera.ip.total'),
    readNumericConfigParam(configParams, 'lcsConfig.iloscKamer'),
    readNumericConfigParam(configParams, 'nastawniConfig.iloscKamer')
  );

  const cameraBreakdown = {
    total: Math.max(cameraCount, explicitBreakdown?.total ?? 0),
    ogolna: Math.max(readNumericConfigParam(configParams, 'camera.total.ip.ogolna'), explicitBreakdown?.ogolna ?? 0),
    lpr: Math.max(readNumericConfigParam(configParams, 'camera.total.ip.lpr'), explicitBreakdown?.lpr ?? 0),
    skp: Math.max(readNumericConfigParam(configParams, 'camera.total.ip.skp'), explicitBreakdown?.skp ?? 0)
  };

  const hasCameraBreakdown = cameraBreakdown.total > 0 || cameraBreakdown.ogolna > 0 || cameraBreakdown.lpr > 0 || cameraBreakdown.skp > 0;

  const configParamsWithCameraCount =
    cameraCount > 0 ? { ...configParams, cameraCount } : configParams;

  return {
    subsystemType: task.subsystemType,
    taskType: task.taskType,
    taskVariant: task.taskVariant ?? null,
    isStandaloneNastawnia: options.isStandaloneNastawnia,
    configParams: configParamsWithCameraCount,
    ...(cameraCount > 0 && { cameraCount }),
    ...(hasCameraBreakdown && { cameraBreakdown })
  }
}

function materialToCameraBreakdown(material: ResolvedMaterial): CameraBreakdown {
  if (!material.isSelected) {
    return { total: 0, ogolna: 0, lpr: 0, skp: 0 };
  }

  const label = `${material.groupName || ''} ${material.materialName || ''}`.toLowerCase();
  const normalizedLabel = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[łŁ]/g, 'l');
  if (!CAMERA_REGEX.test(normalizedLabel)) {
    return { total: 0, ogolna: 0, lpr: 0, skp: 0 };
  }

  const quantity = Number.isFinite(material.quantity) && material.quantity > 0 ? material.quantity : 0;
  if (quantity <= 0) {
    return { total: 0, ogolna: 0, lpr: 0, skp: 0 };
  }

  if (CAMERA_LPR_REGEX.test(normalizedLabel)) {
    return { total: quantity, ogolna: 0, lpr: quantity, skp: 0 };
  }
  if (CAMERA_SKP_REGEX.test(normalizedLabel)) {
    return { total: quantity, ogolna: 0, lpr: 0, skp: quantity };
  }
  if (CAMERA_OGOLNA_REGEX.test(normalizedLabel)) {
    return { total: quantity, ogolna: quantity, lpr: 0, skp: 0 };
  }

  return { total: quantity, ogolna: 0, lpr: 0, skp: 0 };
}

function sumCameraBreakdown(parts: CameraBreakdown[]): CameraBreakdown {
  return parts.reduce(
    (acc, part) => ({
      total: acc.total + part.total,
      ogolna: acc.ogolna + part.ogolna,
      lpr: acc.lpr + part.lpr,
      skp: acc.skp + part.skp
    }),
    { total: 0, ogolna: 0, lpr: 0, skp: 0 }
  );
}

function resolveCameraBreakdownFromConfig(config?: TaskConfiguration): CameraBreakdown {
  if (!config) {
    return { total: 0, ogolna: 0, lpr: 0, skp: 0 };
  }

  const fromConfig = {
    total: readNumericConfigParam(config.configParams || {}, 'cameraCount'),
    ogolna: readNumericConfigParam(config.configParams || {}, 'camera.total.ip.ogolna'),
    lpr: readNumericConfigParam(config.configParams || {}, 'camera.total.ip.lpr'),
    skp: readNumericConfigParam(config.configParams || {}, 'camera.total.ip.skp')
  };
  const configTotal = fromConfig.total > 0 ? fromConfig.total : fromConfig.ogolna + fromConfig.lpr + fromConfig.skp;
  if (configTotal > 0) {
    return { ...fromConfig, total: configTotal };
  }

  return sumCameraBreakdown(config.materials.map(materialToCameraBreakdown));
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
  const taskEntriesRef = useRef(taskEntries);
  taskEntriesRef.current = taskEntries;

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
        const currentConfigs = (wizardDataRef.current.taskConfigurations || {}) as Record<string, TaskConfiguration>;
        const configParams: Record<string, unknown> = {
          ...task.subsystemParams,
          ...(currentConfigs[task.key]?.configParams || {})
        };

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

        const relationships = wizardDataRef.current.taskRelationships || {};
        const taskLookup = new Map<string, TaskEntry>();
        for (const entry of taskEntriesRef.current) {
          taskLookup.set(entry.key, entry);
          if (entry.taskWizardId) {
            taskLookup.set(entry.taskWizardId, entry);
          }
        }

        const collectCameraBreakdownFromHierarchy = (parentTask: TaskEntry): CameraBreakdown => {
          // Collect all candidate IDs for this task
          const candidateIds = [
            parentTask.taskWizardId,
            parentTask.key,
            parentTask.taskNumber,
          ].filter((id): id is string => !!id);

          // Find the relationship entry by direct key lookup first
          let rootRel: { childTaskKeys: string[]; parentType?: string } | undefined;
          let rootId: string | undefined;
          for (const id of candidateIds) {
            if (relationships[id]?.childTaskKeys?.length) {
              rootRel = relationships[id];
              rootId = id;
              break;
            }
          }

          // If not found by direct key, search all relationship entries for one
          // whose children are known tasks and whose parentType matches this task
          if (!rootRel) {
            for (const [relKey, rel] of Object.entries(relationships)) {
              if (!rel?.childTaskKeys?.length) continue;
              const hasKnownChild = rel.childTaskKeys.some(ck => taskLookup.has(ck));
              if (hasKnownChild && rel.parentType === parentTask.taskType) {
                rootRel = rel;
                rootId = relKey;
                break;
              }
            }
          }

          if (!rootRel?.childTaskKeys?.length) {
            return { total: 0, ogolna: 0, lpr: 0, skp: 0 };
          }

          const visited = new Set<string>();

          const traverse = (relId: string): CameraBreakdown => {
            if (visited.has(relId)) {
              return { total: 0, ogolna: 0, lpr: 0, skp: 0 };
            }
            visited.add(relId);

            const rel = relationships[relId];
            if (!rel?.childTaskKeys?.length) {
              return { total: 0, ogolna: 0, lpr: 0, skp: 0 };
            }

            const parts: CameraBreakdown[] = [];
            for (const childKey of rel.childTaskKeys) {
              const childTask = taskLookup.get(childKey);
              if (!childTask) continue;

              // Find the relationship entry for this child using all candidate IDs
              const childCandidates = [
                childTask.taskWizardId,
                childTask.key,
                childTask.taskNumber,
              ].filter((id): id is string => !!id);
              const childRelId = childCandidates.find(
                id => relationships[id]?.childTaskKeys?.length
              );

              const nested = childRelId
                ? traverse(childRelId)
                : { total: 0, ogolna: 0, lpr: 0, skp: 0 };
              if (nested.total > 0) {
                parts.push(nested);
              } else {
                parts.push(resolveCameraBreakdownFromConfig(currentConfigs[childTask.key]));
              }
            }

            return sumCameraBreakdown(parts);
          };

          return traverse(rootId!);
        };

        const isHierarchyParentTask = task.taskType === 'LCS' || task.taskType === 'NASTAWNIA';
        let resolvedCameraBreakdown = isHierarchyParentTask
          ? collectCameraBreakdownFromHierarchy(task)
          : resolveCameraBreakdownFromConfig(currentConfigs[task.key]);

        if (isHierarchyParentTask && resolvedCameraBreakdown.total === 0) {
          const allRels = wizardDataRef.current.taskRelationships || {};
          const allTaskIds = [task.taskWizardId, task.key, task.taskNumber].filter(
            Boolean
          ) as string[];
          let taskRel: { childTaskKeys: string[] } | undefined;
          for (const tid of allTaskIds) {
            if (allRels[tid]?.childTaskKeys?.length) {
              taskRel = allRels[tid];
              break;
            }
          }
          // If still not found, scan all relationship entries
          if (!taskRel) {
            for (const [, rel] of Object.entries(allRels)) {
              if (!rel?.childTaskKeys?.length) continue;
              const hasKnownChild = rel.childTaskKeys.some(ck => taskLookup.has(ck));
              if (hasKnownChild && rel.parentType === task.taskType) {
                taskRel = rel;
                break;
              }
            }
          }
          if (taskRel?.childTaskKeys?.length) {
            const childBreakdowns: CameraBreakdown[] = [];
            for (const childKey of taskRel.childTaskKeys) {
              const childTask = taskLookup.get(childKey);
              if (childTask) {
                childBreakdowns.push(
                  resolveCameraBreakdownFromConfig(currentConfigs[childTask.key])
                );
              }
            }
            resolvedCameraBreakdown = sumCameraBreakdown(childBreakdowns);
          }
          if (resolvedCameraBreakdown.total === 0) {
            resolvedCameraBreakdown = resolveCameraBreakdownFromConfig(currentConfigs[task.key]);
          }
        }

        if (resolvedCameraBreakdown.total > 0) {
          configParams.cameraCount = resolvedCameraBreakdown.total;
          configParams['camera.total'] = resolvedCameraBreakdown.total;
          configParams['camera.total.ip'] = resolvedCameraBreakdown.total;
          configParams['camera.ip.total'] = resolvedCameraBreakdown.total;
          configParams['camera.total.ip.ogolna'] = resolvedCameraBreakdown.ogolna;
          configParams['camera.total.ip.lpr'] = resolvedCameraBreakdown.lpr;
          configParams['camera.total.ip.skp'] = resolvedCameraBreakdown.skp;
        }

        const taskIdentity = new Set<string>([task.key, task.taskWizardId].filter(Boolean) as string[]);
        const isStandaloneNastawnia =
          task.taskType === 'NASTAWNIA'
            ? !Object.values(relationships).some(
                (rel) =>
                  rel.parentType === 'LCS' &&
                  rel.childTaskKeys.some((childKey) => taskIdentity.has(childKey))
              )
            : undefined;

        const resolved = await bomResolverService.resolve(
          createBomResolverRequest(task, configParams, {
            cameraCount: resolvedCameraBreakdown.total,
            cameraBreakdown: resolvedCameraBreakdown,
            isStandaloneNastawnia
          })
        );
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
    [onUpdate]
  );

  useEffect(() => {
    const currentConfigs = (wizardDataRef.current.taskConfigurations || {}) as Record<string, TaskConfiguration>;
    if (activeTask && !currentConfigs[activeTask.key]) {
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
    const cameraBreakdown = resolveCameraBreakdownFromConfig(config);
    const extraConfigParams: Record<string, unknown> = {
      cameraCount: cameraBreakdown.total,
      'camera.total': cameraBreakdown.total,
      'camera.total.ip': cameraBreakdown.total,
      'camera.ip.total': cameraBreakdown.total,
      'camera.total.ip.ogolna': cameraBreakdown.ogolna,
      'camera.total.ip.lpr': cameraBreakdown.lpr,
      'camera.total.ip.skp': cameraBreakdown.skp,
    };
    onUpdate({
      taskConfigurations: {
        ...taskConfigs,
        [taskKey]: {
          ...config,
          isConfigured: true,
          lastModified: new Date(),
          configParams: {
            ...(config.configParams || {}),
            ...extraConfigParams
          }
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

              {activeConfig.recorderRecommendation && (
                <div className="alert alert-info" style={{ marginBottom: '16px' }}>
                  <strong>🖥️ Rekomendowany rejestrator:</strong>{' '}
                  {activeConfig.recorderRecommendation.recorder.modelName}{' '}
                  ({activeConfig.recorderRecommendation.recorder.manufacturer}) —{' '}
                  {activeConfig.recorderRecommendation.recorder.minCameras}
                  –{activeConfig.recorderRecommendation.recorder.maxCameras} kamer
                </div>
              )}

              {activeConfig.templateMissing ? (
                <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                  ⚠️ Brak szablonu BOM dla tego zadania.
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
