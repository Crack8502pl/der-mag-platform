// src/components/contracts/wizard/steps/InfrastructureStep.tsx
// Infrastructure parameters configuration step

import React, { useState } from 'react';
import type { WizardData, CabinetOption, PoleType, PoleConfig, TaskInfrastructure } from '../types/wizard.types';
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

interface InfrastructureFormProps {
  data: TaskInfrastructure;
  onChange: (data: Partial<TaskInfrastructure>) => void;
}

const InfrastructureForm: React.FC<InfrastructureFormProps> = ({ data, onChange }) => {
  const [poleSearchTarget, setPoleSearchTarget] = useState<number | null>(null);

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

export const InfrastructureStep: React.FC<Props> = ({
  wizardData,
  onUpdateTaskInfrastructure,
}) => {
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
            const showCabinetNotice = requiresCabinetCompletion(task.type) && !!taskInfra.cabinetType;
            return (
              <div key={taskKey} className="per-task-card">
                <h4>
                  <span className="subsystem-badge">{task.subsystemType}</span>
                  {task.name || `Zadanie #${originalIdx + 1}`}
                </h4>
                <InfrastructureForm
                  data={taskInfra}
                  onChange={(data) => {
                    // When cabinetType is set for a task that requires cabinet completion,
                    // automatically set/clear the generateCabinetCompletion flag
                    const updatedData: Partial<TaskInfrastructure> =
                      requiresCabinetCompletion(task.type) && 'cabinetType' in data
                        ? { ...data, generateCabinetCompletion: !!data.cabinetType }
                        : data;
                    handlePerTaskChange(taskKey, updatedData);
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
