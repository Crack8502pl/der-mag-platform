// src/components/contracts/wizard/steps/InfrastructureStep.tsx
// Infrastructure parameters configuration step

import React, { useState } from 'react';
import type { WizardData, CabinetOption, PoleType, TaskInfrastructure, InfrastructureData } from '../types/wizard.types';
import { generateAllTasks } from '../utils/taskGenerator';
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
  'SMOKIP_A', 'SMOKIP_B', 'PRZEJAZD_KAT_A', 'PRZEJAZD_KAT_B',
  'LCS', 'NASTAWNIA', 'SKP',
];

const InfrastructureForm: React.FC<{
  data: TaskInfrastructure;
  onChange: (data: Partial<TaskInfrastructure>) => void;
}> = ({ data, onChange }) => (
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
      <div className="infra-form-group">
        <label>Miejsce zabudowy szafy</label>
        <input
          type="text"
          value={data.cabinetInstallLocation || ''}
          onChange={(e) => onChange({ cabinetInstallLocation: e.target.value })}
          placeholder="np. maszynownia, pomieszczenie techniczne"
        />
      </div>
    </div>

    <div className="infra-form-row">
      <div className="infra-form-group infra-form-group--small">
        <label>Ilość słupów</label>
        <input
          type="number"
          min={0}
          value={data.poleQuantity ?? ''}
          onChange={(e) => onChange({ poleQuantity: e.target.value === '' ? undefined : parseInt(e.target.value) })}
          placeholder="0"
        />
      </div>
      <div className="infra-form-group">
        <label>Typ słupa</label>
        <select
          value={data.poleType || ''}
          onChange={(e) => onChange({ poleType: (e.target.value as PoleType) || undefined })}
        >
          <option value="">— wybierz —</option>
          {POLE_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div className="infra-form-group">
        <label>Info o produkcie słupa</label>
        <input
          type="text"
          value={data.poleProductInfo || ''}
          onChange={(e) => onChange({ poleProductInfo: e.target.value })}
          placeholder="np. nr katalogowy, producent"
        />
      </div>
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
  </div>
);

export const InfrastructureStep: React.FC<Props> = ({
  wizardData,
  onUpdate,
  onUpdateTaskInfrastructure,
}) => {
  const [mode, setMode] = useState<'global' | 'perTask'>('global');

  // Generate task list from wizard config (works for both new and existing contracts)
  const generatedTasks = generateAllTasks(wizardData.subsystems, wizardData.liniaKolejowa);

  // Filter tasks that typically need infrastructure config
  const infrastructureTasks = generatedTasks.filter(task =>
    INFRASTRUCTURE_TASK_TYPES.includes(task.type)
  );

  const globalData: TaskInfrastructure = wizardData.infrastructure?.global || {};

  const handleGlobalChange = (data: Partial<TaskInfrastructure>) => {
    onUpdate({
      infrastructure: {
        ...wizardData.infrastructure,
        global: {
          ...wizardData.infrastructure?.global,
          ...data,
        },
      } as InfrastructureData,
    });
  };

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

      <div className="infra-mode-toggle">
        <button
          className={`btn-mode ${mode === 'global' ? 'active' : ''}`}
          onClick={() => setMode('global')}
          type="button"
        >
          🌐 Globalne (dla wszystkich zadań)
        </button>
        <button
          className={`btn-mode ${mode === 'perTask' ? 'active' : ''}`}
          onClick={() => setMode('perTask')}
          type="button"
        >
          📋 Per zadanie
        </button>
      </div>

      {mode === 'global' && (
        <div className="infra-section">
          <h4>Domyślne parametry infrastruktury</h4>
          <InfrastructureForm data={globalData} onChange={handleGlobalChange} />
        </div>
      )}

      {mode === 'perTask' && (
        <div className="infra-section">
          {infrastructureTasks.length === 0 ? (
            <div className="alert alert-info">
              Brak zadań wymagających konfiguracji infrastruktury. Uzupełnij konfigurację podsystemów, aby ustawić parametry per zadanie.
            </div>
          ) : (
            infrastructureTasks.map((task, idx) => {
              // Use a wizard-stable key: subsystemType + index, available for both new and existing contracts
              const taskKey = `${task.subsystemType}-${idx}`;
              return (
                <div key={taskKey} className="per-task-card">
                  <h4>
                    <span className="subsystem-badge">{task.subsystemType}</span>
                    {task.name || `Zadanie #${idx + 1}`}
                  </h4>
                  <InfrastructureForm
                    data={getTaskInfrastructure(taskKey)}
                    onChange={(data) => handlePerTaskChange(taskKey, data)}
                  />
                </div>
              );
            })
          )}
        </div>
      )}

      <div className="infra-skip-hint">
        <span>ℹ️ Ten krok jest opcjonalny. Możesz przejść dalej bez wypełniania danych infrastruktury.</span>
      </div>
    </div>
  );
};
