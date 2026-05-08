import React, { useEffect, useMemo, useState } from 'react';
import type { BomSubsystemTemplate } from '../../../../services/bomSubsystemTemplate.service';
import bomSubsystemTemplateService from '../../../../services/bomSubsystemTemplate.service';
import type { ResolvedMaterial, StepProps, TaskConfiguration } from '../types/wizard.types';
import { buildWizardTaskEntries, type WizardTaskEntry } from '../utils/taskConfiguration';
import './TaskConfigurationStep.css';

const evaluateFormula = (base: number, formula?: string, context?: string): number => {
  if (!formula) {
    return base;
  }

  const match = formula.match(/([*+\-/])\s*(\d+(?:\.\d+)?)/);
  if (!match) {
    return base;
  }

  const [, operator, value] = match;
  const operand = Number(value);
  if (!Number.isFinite(operand)) {
    return base;
  }

  switch (operator) {
    case '*':
      return base * operand;
    case '+':
      return base + operand;
    case '-':
      return base - operand;
    case '/':
      if (operand === 0) {
        console.warn('Invalid BOM dependency formula: division by zero', { formula, context });
        return base;
      }
      return base / operand;
    default:
      return base;
  }
};

/**
 * Resolves BOM material quantities for a template using subsystem configuration data.
 * Supports FIXED, FROM_CONFIG, PER_UNIT and DEPENDENT quantity sources.
 */
const resolveQuantities = (
  template: BomSubsystemTemplate,
  configParams: Record<string, any>
): ResolvedMaterial[] => {
  const itemQuantities = new Map<number, number>();

  const sortedItems = [...template.items].sort((a, b) => {
    if (a.quantitySource === 'DEPENDENT' && b.quantitySource !== 'DEPENDENT') return 1;
    if (a.quantitySource !== 'DEPENDENT' && b.quantitySource === 'DEPENDENT') return -1;
    return a.sortOrder - b.sortOrder;
  });

  return sortedItems.map((item) => {
    let quantity = item.defaultQuantity;

    switch (item.quantitySource) {
      case 'FROM_CONFIG':
      case 'PER_UNIT': {
        if (item.configParamName) {
          const prefixedName = `${item.groupName || 'Inne'}_${item.configParamName}`;
          const rawValue = configParams[prefixedName] ?? configParams[item.configParamName];
          const numericValue = Number(rawValue);
          if (!Number.isNaN(numericValue)) {
            quantity =
              item.quantitySource === 'PER_UNIT'
                ? item.defaultQuantity * numericValue
                : numericValue;
          }
        }
        break;
      }
      case 'DEPENDENT': {
        if (item.dependsOnItemId && itemQuantities.has(item.dependsOnItemId)) {
          quantity = evaluateFormula(
            itemQuantities.get(item.dependsOnItemId) || 0,
            item.dependencyFormula,
            item.materialName
          );
        }
        break;
      }
      case 'FIXED':
      default:
        quantity = item.defaultQuantity;
    }

    if (item.id) {
      itemQuantities.set(item.id, quantity);
    }

    return {
      id: item.id || 0,
      materialName: item.materialName,
      catalogNumber: item.catalogNumber,
      quantity,
      unit: item.unit,
      quantitySource: item.quantitySource,
      groupName: item.groupName || 'Inne',
      requiresIp: item.requiresIp,
      isSelected: item.isRequired,
    };
  });
};

const buildTaskConfiguration = async (task: WizardTaskEntry): Promise<TaskConfiguration> => {
  const template = await bomSubsystemTemplateService.getTemplateFor(
    task.subsystemType,
    task.taskVariant || null
  );

  if (!template) {
    console.warn(`No BOM template found for ${task.subsystemType} / ${task.taskVariant ?? 'default'}`);
    return {
      taskId: task.key,
      taskNumber: task.taskNumber,
      taskName: task.taskName,
      taskType: task.taskType,
      subsystemType: task.subsystemType,
      taskVariant: task.taskVariant,
      materials: [],
      configParams: task.configParams,
      isConfigured: true,
      lastModified: new Date(),
    };
  }

  return {
    taskId: task.key,
    taskNumber: task.taskNumber,
    taskName: task.taskName,
    taskType: task.taskType,
    subsystemType: task.subsystemType,
    taskVariant: task.taskVariant,
    bomTemplateId: template.id,
    bomTemplateVersion: template.version,
    materials: resolveQuantities(template, task.configParams),
    configParams: task.configParams,
    isConfigured: true,
    lastModified: new Date(),
  };
};

export const TaskConfigurationStep: React.FC<StepProps> = ({ wizardData, onUpdate }) => {
  const taskEntries = useMemo(() => buildWizardTaskEntries(wizardData), [wizardData]);
  const [search, setSearch] = useState('');
  const [activeTaskKey, setActiveTaskKey] = useState<string>('');
  const [loadingTaskKey, setLoadingTaskKey] = useState<string | null>(null);
  const [savingTaskKey, setSavingTaskKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!activeTaskKey && taskEntries.length > 0) {
      setActiveTaskKey(taskEntries[0].key);
    }
  }, [activeTaskKey, taskEntries]);

  useEffect(() => {
    const missingTasks = taskEntries.filter((task) => !wizardData.taskConfigurations?.[task.key]);
    if (missingTasks.length === 0) {
      return;
    }

    let isCancelled = false;
    const preloadConfigurations = async () => {
      try {
        const loadedEntries = await Promise.all(
          missingTasks.map(async (task) => [task.key, await buildTaskConfiguration(task)] as const)
        );

        if (isCancelled) {
          return;
        }

        onUpdate({
          taskConfigurations: {
            ...(wizardData.taskConfigurations || {}),
            ...Object.fromEntries(loadedEntries),
          },
        });
      } catch (error) {
        console.error('Nie udało się wczytać konfiguracji BOM dla zadań:', {
          error,
          tasks: missingTasks.map((task) => `${task.taskNumber}:${task.taskType}`),
        });
      }
    };

    void preloadConfigurations();

    return () => {
      isCancelled = true;
    };
  }, [onUpdate, taskEntries, wizardData.taskConfigurations]);

  const filteredTasks = useMemo(() => {
    const phrase = search.trim().toLowerCase();
    if (!phrase) {
      return taskEntries;
    }

    return taskEntries.filter((task) =>
      [task.taskName, task.taskNumber, task.taskType, task.subsystemLabel]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(phrase))
    );
  }, [search, taskEntries]);

  const tasksBySubsystem = useMemo(() => {
    return filteredTasks.reduce((groups, task) => {
      if (!groups[task.subsystemLabel]) {
        groups[task.subsystemLabel] = [];
      }
      groups[task.subsystemLabel].push(task);
      return groups;
    }, {} as Record<string, WizardTaskEntry[]>);
  }, [filteredTasks]);

  const activeTask = taskEntries.find((task) => task.key === activeTaskKey) || filteredTasks[0];
  const activeConfiguration = activeTask ? wizardData.taskConfigurations?.[activeTask.key] : undefined;

  useEffect(() => {
    if (activeTask && activeTask.key !== activeTaskKey) {
      setActiveTaskKey(activeTask.key);
    }
  }, [activeTask, activeTaskKey]);

  const groupedMaterials = useMemo(() => {
    if (!activeConfiguration) {
      return {};
    }

    return activeConfiguration.materials.reduce((groups, material) => {
      if (!groups[material.groupName]) {
        groups[material.groupName] = [];
      }
      groups[material.groupName].push(material);
      return groups;
    }, {} as Record<string, ResolvedMaterial[]>);
  }, [activeConfiguration]);

  const updateActiveConfiguration = (updater: (current: TaskConfiguration) => TaskConfiguration) => {
    if (!activeTask || !activeConfiguration) {
      return;
    }

    onUpdate({
      taskConfigurations: {
        ...(wizardData.taskConfigurations || {}),
        [activeTask.key]: updater(activeConfiguration),
      },
    });
  };

  const handleRefreshTaskConfiguration = async () => {
    if (!activeTask) {
      return;
    }

    try {
      setLoadingTaskKey(activeTask.key);
      setStatusMessage('');
      const refreshed = await buildTaskConfiguration(activeTask);
      onUpdate({
        taskConfigurations: {
          ...(wizardData.taskConfigurations || {}),
          [activeTask.key]: refreshed,
        },
      });
      setStatusMessage('Szablon BOM został odświeżony.');
    } catch (error: any) {
      setStatusMessage(error.response?.data?.message || 'Nie udało się odświeżyć szablonu BOM.');
    } finally {
      setLoadingTaskKey(null);
    }
  };

  const handleApply = async () => {
    if (!activeTask || !activeConfiguration) {
      return;
    }

    const nextConfiguration: TaskConfiguration = {
      ...activeConfiguration,
      isConfigured: true,
      lastModified: new Date(),
    };

    onUpdate({
      taskConfigurations: {
        ...(wizardData.taskConfigurations || {}),
        [activeTask.key]: nextConfiguration,
      },
    });

    if (!activeTask.taskId || !nextConfiguration.bomTemplateId) {
      setStatusMessage('Konfiguracja została zapisana w kreatorze i zostanie użyta przy zapisie kontraktu.');
      return;
    }

    try {
      setSavingTaskKey(activeTask.key);
      await bomSubsystemTemplateService.applyToTask(
        nextConfiguration.bomTemplateId,
        activeTask.taskId,
        nextConfiguration.configParams || {}
      );
      setStatusMessage(`Zastosowano BOM do zadania ${activeTask.taskNumber}.`);
    } catch (error: any) {
      setStatusMessage(error.response?.data?.message || 'Nie udało się zastosować BOM do zadania.');
    } finally {
      setSavingTaskKey(null);
    }
  };

  const stats = useMemo(() => {
    const materials = activeConfiguration?.materials || [];
    return {
      total: materials.length,
      selected: materials.filter((item) => item.isSelected).length,
      requiresIp: materials.filter((item) => item.requiresIp && item.isSelected).length,
      fromConfig: materials.filter((item) => item.quantitySource === 'FROM_CONFIG' || item.quantitySource === 'PER_UNIT').length,
    };
  }, [activeConfiguration]);

  return (
    <div className="wizard-step-content task-configuration-step">
      <div className="task-configuration-layout">
        <aside className="task-config-sidebar">
          <div className="task-config-sidebar-header">
            <div>
              <h3>Konfiguracja zadań</h3>
              <p>Szablony BOM per zadanie z możliwością korekty materiałów.</p>
            </div>
            <label className="task-config-toggle">
              <input
                type="checkbox"
                checked={!!wizardData.customOrdersEnabled}
                onChange={(event) => onUpdate({ customOrdersEnabled: event.target.checked })}
              />
              <span>Zamówienia niestandardowe</span>
            </label>
          </div>

          <input
            type="search"
            className="task-config-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Szukaj zadania, numeru lub typu…"
          />

          <div className="task-config-task-list">
            {Object.entries(tasksBySubsystem).map(([subsystemLabel, tasks]) => (
              <div key={subsystemLabel} className="task-config-subsystem-group">
                <div className="task-config-subsystem-title">{subsystemLabel}</div>
                {tasks.map((task) => {
                  const isConfigured = !!wizardData.taskConfigurations?.[task.key]?.isConfigured;
                  return (
                    <button
                      key={task.key}
                      type="button"
                      className={`task-config-task-item${activeTask?.key === task.key ? ' active' : ''}`}
                      onClick={() => {
                        setActiveTaskKey(task.key);
                        setStatusMessage('');
                      }}
                    >
                      <div>
                        <strong>{task.taskName}</strong>
                        <span>{task.taskNumber} · {task.taskType}</span>
                      </div>
                      <span className={`task-config-status ${isConfigured ? 'configured' : 'pending'}`}>
                        {isConfigured ? '✅' : '⏳'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}

            {filteredTasks.length === 0 && (
              <div className="task-config-empty">Brak zadań spełniających kryteria wyszukiwania.</div>
            )}
          </div>
        </aside>

        <section className="task-config-workspace">
          {!activeTask || !activeConfiguration ? (
            <div className="task-config-empty-state">
              <div className="task-config-empty-icon">📦</div>
              <p>Wybierz zadanie z listy, aby zobaczyć przypisany szablon BOM.</p>
            </div>
          ) : (
            <>
              <div className="task-config-workspace-header">
                <div>
                  <h3>{activeTask.taskName}</h3>
                  <p>
                    {activeTask.taskNumber} · {activeTask.subsystemLabel} · {activeTask.taskType}
                  </p>
                </div>
                <div className="task-config-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void handleRefreshTaskConfiguration()}
                    disabled={loadingTaskKey === activeTask.key}
                  >
                    {loadingTaskKey === activeTask.key ? '⏳ Odświeżanie…' : '🔄 Odśwież BOM'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void handleApply()}
                    disabled={savingTaskKey === activeTask.key}
                  >
                    {savingTaskKey === activeTask.key ? '⏳ Zapisywanie…' : '✅ Zastosuj BOM do zadania'}
                  </button>
                </div>
              </div>

              <div className="task-config-stats">
                <div className="task-config-stat-card">
                  <strong>{stats.total}</strong>
                  <span>łącznie</span>
                </div>
                <div className="task-config-stat-card">
                  <strong>{stats.selected}</strong>
                  <span>wybrane</span>
                </div>
                <div className="task-config-stat-card">
                  <strong>{stats.requiresIp}</strong>
                  <span>wymaga IP</span>
                </div>
                <div className="task-config-stat-card">
                  <strong>{stats.fromConfig}</strong>
                  <span>z konfiguracji</span>
                </div>
              </div>

              {statusMessage && <div className="task-config-message">{statusMessage}</div>}

              {activeConfiguration.materials.length === 0 ? (
                <div className="task-config-empty-state compact">
                  <div className="task-config-empty-icon">ℹ️</div>
                  <p>Brak aktywnego szablonu BOM dla tego zadania. Zadanie zostanie zapisane bez materiałów.</p>
                </div>
              ) : (
                <div className="task-config-material-groups">
                  {Object.entries(groupedMaterials).map(([groupName, materials]) => (
                    <div key={groupName} className="task-config-material-group">
                      <div className="task-config-material-group-header">
                        <h4>{groupName}</h4>
                        <span>{materials.length} pozycji</span>
                      </div>

                      <div className="task-config-material-list">
                        {materials.map((material) => (
                          <div key={`${groupName}-${material.id}`} className="task-config-material-row">
                            <label className="task-config-material-checkbox">
                              <input
                                type="checkbox"
                                checked={material.isSelected}
                                onChange={(event) =>
                                  updateActiveConfiguration((current) => ({
                                    ...current,
                                    materials: current.materials.map((item) =>
                                      item.id === material.id
                                        ? { ...item, isSelected: event.target.checked }
                                        : item
                                    ),
                                    lastModified: new Date(),
                                  }))
                                }
                              />
                              <span />
                            </label>

                            <div className="task-config-material-main">
                              <strong>{material.materialName}</strong>
                              <span>
                                {material.catalogNumber || 'Brak numeru katalogowego'} · {material.quantitySource}
                                {material.requiresIp ? ' · Wymaga IP' : ''}
                              </span>
                            </div>

                            <div className="task-config-material-quantity">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={material.quantity}
                                onChange={(event) =>
                                  updateActiveConfiguration((current) => ({
                                    ...current,
                                    materials: current.materials.map((item) =>
                                      item.id === material.id
                                        ? { ...item, quantity: Number(event.target.value) || 0 }
                                        : item
                                    ),
                                    lastModified: new Date(),
                                  }))
                                }
                              />
                              <span>{material.unit}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};
