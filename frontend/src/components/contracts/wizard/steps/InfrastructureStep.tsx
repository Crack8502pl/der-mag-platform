// src/components/contracts/wizard/steps/InfrastructureStep.tsx
// Infrastructure parameters configuration step

import React, { useState } from 'react';
import type { WizardData, CabinetOption, PoleType, PoleConfig, TaskInfrastructure, InfrastructureData, GeneratedTask } from '../types/wizard.types';
import { generateAllTasks } from '../utils/taskGenerator';
import { requiresCabinetCompletion } from '../../../../config/taskTypes';
import { PoleSearchModal } from '../../PoleSearchModal';
import './InfrastructureStep.css';

interface Props {
  wizardData: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  onUpdateTaskInfrastructure: (taskNumber: string, data: Partial<TaskInfrastructure>) => void;
}

const CABINET_OPTIONS: { value: CabinetOption; label: string }[] = [
  { value: 'SZAFA_TERENOWA', label: 'Szafa terenowa' },
  { value: 'SZAFA_WEWNETRZNA', label: 'Szafa wewnętrzna' },
  { value: 'KONTENER', label: 'Kontener' },
  { value: '42U', label: 'Szafa 42U' },
  { value: '24U', label: 'Szafa 24U' },
];

const POLE_TYPES: { value: PoleType; label: string }[] = [
  { value: 'STALOWY', label: 'Stalowy' },
  { value: 'KOMPOZYT', label: 'Kompozytowy' },
  { value: 'INNY', label: 'Inny' },
];

/** Infrastructure task types that typically need cabinet/pole/terrain config */
const INFRASTRUCTURE_TASK_TYPES = [
  'SMOKIP_A', 'SMOKIP_B', 'LCS', 'NASTAWNIA', 'SKP',
];

const NO_POLES_TASK_TYPES = ['LCS', 'NASTAWNIA'];

interface InfrastructureFormProps {
  data: TaskInfrastructure;
  taskType: string;
  onChange: (data: Partial<TaskInfrastructure>) => void;
}

export const InfrastructureForm: React.FC<InfrastructureFormProps> = ({ data, taskType, onChange }) => {
  const [poleSearchTarget, setPoleSearchTarget] = useState<number | null>(null);
  const shouldHidePolesSection = NO_POLES_TASK_TYPES.includes(taskType);

  const poles: PoleConfig[] = data.poles || [];

  const addPole = () => {
    onChange({ poles: [...poles, { type: undefined, quantity: '', productInfo: '' }] });
  };

  const removePole = (idx: number) => {
    const updated = poles.filter((_, i) => i !== idx);
    onChange({ poles: updated.length > 0 ? updated : undefined });
  };

  const updatePole = (idx: number, patch: Partial<PoleConfig>) => {
    const updated = poles.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    onChange({ poles: updated });
  };

  const handlePoleProductSelect = (idx: number, item: { catalogNumber: string; materialName: string }) => {
    updatePole(idx, { productInfo: `${item.catalogNumber} | ${item.materialName}` });
    setPoleSearchTarget(null);
  };

  return (
    <div className="infra-form">
      <div className="infra-form-row">
        <div className="infra-form-group">
          <label>Typ szafy</label>
          <select
            value={data.cabinetType || ''}
            onChange={(e) => onChange({ cabinetType: (e.target.value as CabinetOption) || undefined })}
          >
            <option value="">— wybierz —</option>
            {CABINET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {shouldHidePolesSection ? (
        <p className="infra-poles-hidden-notice">Słupy nie dotyczą tego typu zadania.</p>
      ) : (
        <div className="infra-poles-section">
          <div className="infra-poles-header">
            <label>Słupy</label>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={addPole}
            >
              ➕ Dodaj typ słupa
            </button>
          </div>

          {poles.length === 0 && (
            <p className="infra-poles-empty">Brak skonfigurowanych słupów. Kliknij "Dodaj typ słupa".</p>
          )}

          {poles.map((pole, idx) => (
            <div key={idx} className="pole-config-item">
              <div className="pole-config-row">
                <div className="infra-form-group">
                  <label>Typ słupa</label>
                  <select
                    value={pole.type || ''}
                    onChange={(e) => updatePole(idx, { type: (e.target.value as PoleType) || undefined })}
                  >
                    <option value="">— wybierz —</option>
                    {POLE_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="infra-form-group infra-form-group--small">
                  <label>Ilość</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pole.quantity || ''}
                    onChange={(e) => updatePole(idx, { quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="infra-form-group">
                <label>Info o produkcie</label>
                <div className="pole-search-row">
                  <input
                    type="text"
                    value={pole.productInfo || ''}
                    onChange={(e) => updatePole(idx, { productInfo: e.target.value })}
                    placeholder="Numer magazynowy | Nazwa produktu"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPoleSearchTarget(idx)}
                  >
                    🔍 Magazyn
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => removePole(idx)}
              >
                🗑️ Usuń typ słupa
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="infra-form-group">
        <label>Uwagi terenowe</label>
        <textarea
          value={data.terrainNotes || ''}
          onChange={(e) => onChange({ terrainNotes: e.target.value })}
          placeholder="Dodatkowe informacje o terenie, warunkach zabudowy..."
          rows={3}
        />
      </div>

      {poleSearchTarget !== null && (
        <PoleSearchModal
          onSelect={(item) => handlePoleProductSelect(poleSearchTarget, item)}
          onClose={() => setPoleSearchTarget(null)}
        />
      )}
    </div>
  );
};

const tableHeaderStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontWeight: 600,
  borderBottom: '2px solid var(--border-color)',
  backgroundColor: 'var(--bg-secondary)',
  fontSize: '12px',
};

const tableCellStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--border-color)',
  fontSize: '13px',
};

export const PolesOverviewTable: React.FC<{
  allTasks: GeneratedTask[];
  infrastructure: InfrastructureData;
}> = ({ allTasks, infrastructure }) => {
  const rows = allTasks.flatMap((task, originalIdx) => {
    const taskKey = `${task.subsystemType}-${originalIdx}`;
    const infra = infrastructure?.perTask?.[taskKey];
    const poles = infra?.poles;
    if (!infra?.cabinetType && !poles?.length) return [];
    if (!poles?.length) {
      return [{
        taskName: task.name,
        cabinetType: infra?.cabinetType ?? '—',
        poleType: '—',
        quantity: '—',
        productInfo: '—',
        isNoPolesRow: true,
      }];
    }
    return poles.map((pole) => ({
      taskName: task.name,
      cabinetType: infra?.cabinetType ?? '—',
      poleType: pole.type ?? '—',
      quantity: pole.quantity ?? '—',
      productInfo: pole.productInfo ?? '—',
      isNoPolesRow: false,
    }));
  });
  const hasNoPolesRows = rows.some((row) => row.isNoPolesRow);

  if (rows.length === 0) return null;

  return (
    <div className="poles-overview card" style={{ marginBottom: '20px', padding: '16px' }}>
      <h4 style={{ marginBottom: '12px' }}>📋 Podsumowanie</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            <th style={tableHeaderStyle}>Zadanie</th>
            <th style={tableHeaderStyle}>Typ szafy</th>
            <th style={tableHeaderStyle}>Typ słupa</th>
            <th style={tableHeaderStyle}>Ilość</th>
            <th style={tableHeaderStyle}>Produkt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={tableCellStyle}>{r.taskName}</td>
              <td style={tableCellStyle}>{r.cabinetType}</td>
              <td style={tableCellStyle}>{r.isNoPolesRow ? 'Brak słupów' : r.poleType}</td>
              <td style={tableCellStyle}>{r.quantity}</td>
              <td style={tableCellStyle}>{r.productInfo}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasNoPolesRows && (
        <p className="infra-poles-hidden-notice" style={{ paddingBottom: 0, marginTop: '8px' }}>
          ℹ️ Dla niektórych zadań nie skonfigurowano jeszcze słupów.
        </p>
      )}
    </div>
  );
};

export const InfrastructureStep: React.FC<Props> = ({
  wizardData,
  onUpdateTaskInfrastructure,
}) => {
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());

  const toggleCollapse = (key: string) =>
    setCollapsedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

  // Generate task list from wizard config (works for both new and existing contracts)
  const generatedTasks = generateAllTasks(wizardData.subsystems, wizardData.liniaKolejowa);

  // Filter tasks that typically need infrastructure config, preserving original index so that
  // the key stays consistent with LogisticsStep (which iterates the full allTasks list).
  const infrastructureTasks = generatedTasks
    .map((task, originalIdx) => ({ task, originalIdx }))
    .filter(({ task }) =>
      task.type.startsWith('PRZEJAZD_KAT_') || INFRASTRUCTURE_TASK_TYPES.includes(task.type)
    );

  const handlePerTaskChange = (taskKey: string, data: Partial<TaskInfrastructure>) => {
    onUpdateTaskInfrastructure(taskKey, data);
  };

  const getTaskInfrastructure = (taskKey: string): TaskInfrastructure =>
    wizardData.infrastructure?.perTask?.[taskKey] || {};

  return (
    <div className="wizard-step-content infrastructure-step">
      <h3>Parametry infrastruktury</h3>
      <p className="step-description">
        Określ parametry fizycznej infrastruktury: szafy, słupy i elementy terenowe.
        Wszystkie pola są opcjonalne.
      </p>

      <PolesOverviewTable
        allTasks={generatedTasks}
        infrastructure={wizardData.infrastructure ?? {}}
      />

      <div className="infra-section">
        {infrastructureTasks.length === 0 ? (
          <div className="alert alert-info">
            Brak zadań wymagających konfiguracji infrastruktury. Uzupełnij konfigurację podsystemów, aby ustawić parametry per zadanie.
          </div>
        ) : (
          infrastructureTasks.map(({ task, originalIdx }) => {
            // Use the original allTasks index so keys are consistent with LogisticsStep
            const taskKey = `${task.subsystemType}-${originalIdx}`;
            const taskInfra = getTaskInfrastructure(taskKey);
            // Mirror backend logic: show notice when cabinetType is present and flag is either
            // explicitly true OR absent (backward-compatible default)
            const showCabinetNotice =
              requiresCabinetCompletion(task.type) &&
              !!taskInfra.cabinetType &&
              (taskInfra.generateCabinetCompletion ?? true);
            return (
              <div key={taskKey} className="per-task-card">
                <div
                  className="per-task-card-header"
                  onClick={() => toggleCollapse(taskKey)}
                  role="button"
                  aria-expanded={!collapsedTasks.has(taskKey)}
                >
                  <button
                    type="button"
                    className="per-task-card-toggle"
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    {collapsedTasks.has(taskKey) ? '▶' : '▼'}
                  </button>
                  <div className="per-task-card-title">
                    <span className="subsystem-badge">{task.subsystemType}</span>
                    {task.name || `Zadanie #${originalIdx + 1}`}
                  </div>
                </div>

                {!collapsedTasks.has(taskKey) && (
                  <>
                    <InfrastructureForm
                      data={taskInfra}
                      taskType={task.type}
                      onChange={(data) => {
                        // When cabinetType is set for a task that requires cabinet completion,
                        // automatically set/clear the generateCabinetCompletion flag
                        const updatedData: Partial<TaskInfrastructure> =
                          requiresCabinetCompletion(task.type) && 'cabinetType' in data
                            ? { ...data, generateCabinetCompletion: !!data.cabinetType }
                            : data;
                        // Clear poles for task types that don't use poles
                        const finalData = NO_POLES_TASK_TYPES.includes(task.type)
                          ? { ...updatedData, poles: undefined }
                          : updatedData;
                        handlePerTaskChange(taskKey, finalData);
                      }}
                    />
                    {showCabinetNotice && (
                      <div
                        className="alert alert-info cabinet-completion-notice"
                        style={{
                          marginTop: '12px',
                          padding: '10px 12px',
                          fontSize: '13px',
                          background: 'rgba(46, 160, 67, 0.1)',
                          border: '1px solid rgba(46, 160, 67, 0.3)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>✅</span>
                        <div>
                          <strong style={{ color: 'var(--success-color, #3fb950)' }}>
                            Automatyczna kompletacja szafy
                          </strong>
                          <br />
                          <small style={{ opacity: 0.9 }}>
                            Zostanie utworzone zadanie{' '}
                            <code style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontFamily: 'monospace',
                              fontSize: '12px'
                            }}>
                              KOMPLETACJA_SZAF
                            </code>{' '}
                            dla {task.type}
                          </small>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="infra-skip-hint">
        <span>ℹ️ Ten krok jest opcjonalny. Możesz przejść dalej bez wypełniania danych infrastruktury.</span>
      </div>
    </div>
  );
};
