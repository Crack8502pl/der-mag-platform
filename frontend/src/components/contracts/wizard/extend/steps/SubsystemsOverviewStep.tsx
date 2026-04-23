// src/components/contracts/wizard/extend/steps/SubsystemsOverviewStep.tsx
// Extend wizard – Step 2: Choose action for each existing subsystem and add new ones

import React, { useState } from 'react';
import {
  SUBSYSTEM_WIZARD_CONFIG,
  type SubsystemType,
} from '../../../../../config/subsystemWizardConfig';
import type { ExistingSubsystem } from '../../types/extend-wizard.types';
import type { SubsystemWizardData } from '../../types/wizard.types';

interface SubsystemsOverviewStepProps {
  existingSubsystems: ExistingSubsystem[];
  newSubsystems: SubsystemWizardData[];
  onToggleAddTasks: (subsystemId: number) => void;
  onAddNewSubsystem: (type: SubsystemType) => void;
  onRemoveNewSubsystem: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
}

const ALL_SUBSYSTEM_TYPES: SubsystemType[] = [
  'SMOKIP_A',
  'SMOKIP_B',
  'SKD',
  'SSWIN',
  'CCTV',
  'SMW',
  'SDIP',
  'SUG',
  'SSP',
  'LAN',
  'OTK',
  'ZASILANIE',
];

export const SubsystemsOverviewStep: React.FC<SubsystemsOverviewStepProps> = ({
  existingSubsystems,
  newSubsystems,
  onToggleAddTasks,
  onAddNewSubsystem,
  onRemoveNewSubsystem,
  onNext,
  onBack,
}) => {
  const [showTypePicker, setShowTypePicker] = useState(false);

  const hasAnyAction =
    existingSubsystems.some((s) => s.addingNewTasks) || newSubsystems.length > 0;

  const handleAddSubsystemType = (type: SubsystemType) => {
    onAddNewSubsystem(type);
    setShowTypePicker(false);
  };

  return (
    <div className="wizard-step-content">
      <h3>📦 Podsystemy</h3>
      <p className="info-text">
        Wybierz, do których istniejących podsystemów chcesz dodać nowe zadania
        lub dodaj całkowicie nowy podsystem.
      </p>

      {/* Existing subsystems */}
      <section style={{ marginBottom: '24px' }}>
        <h4>Istniejące podsystemy</h4>
        {existingSubsystems.length === 0 ? (
          <p className="text-muted">Brak istniejących podsystemów.</p>
        ) : (
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Podsystem</th>
                <th>Zadania</th>
                <th>Akcja</th>
              </tr>
            </thead>
            <tbody>
              {existingSubsystems.map((sub) => {
                const config = SUBSYSTEM_WIZARD_CONFIG[sub.type];
                return (
                  <tr key={sub.id}>
                    <td>
                      <strong>{config?.label ?? sub.type}</strong>
                      {sub.ipPool && (
                        <span
                          style={{
                            marginLeft: '8px',
                            padding: '2px 6px',
                            backgroundColor: '#e3f2fd',
                            borderRadius: '4px',
                            fontSize: '0.85em',
                          }}
                        >
                          🌐 {sub.ipPool}
                        </span>
                      )}
                    </td>
                    <td>{sub.existingTasks.length}</td>
                    <td>
                      <button
                        type="button"
                        className={`btn btn-sm ${sub.addingNewTasks ? 'btn-warning' : 'btn-secondary'}`}
                        onClick={() => onToggleAddTasks(sub.id)}
                        title={
                          sub.addingNewTasks
                            ? 'Anuluj dodawanie nowych zadań'
                            : 'Dodaj nowe zadania do tego podsystemu'
                        }
                      >
                        {sub.addingNewTasks ? '✖ Anuluj' : '➕ Dodaj zadania'}
                      </button>
                      {sub.addingNewTasks && (
                        <span
                          style={{
                            marginLeft: '8px',
                            color: '#e67e22',
                            fontSize: '0.9em',
                          }}
                        >
                          ✎ Konfiguracja w kolejnym kroku
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* New subsystems */}
      {newSubsystems.length > 0 && (
        <section style={{ marginBottom: '24px' }}>
          <h4>Nowe podsystemy do dodania</h4>
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Typ</th>
                <th>Akcja</th>
              </tr>
            </thead>
            <tbody>
              {newSubsystems.map((sub, idx) => {
                const config = SUBSYSTEM_WIZARD_CONFIG[sub.type];
                return (
                  <tr key={idx}>
                    <td>
                      <strong>{config?.label ?? sub.type}</strong>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => onRemoveNewSubsystem(idx)}
                        title="Usuń nowy podsystem"
                      >
                        🗑️ Usuń
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Add new subsystem button */}
      <section style={{ marginBottom: '24px' }}>
        {showTypePicker ? (
          <div>
            <p>
              <strong>Wybierz typ nowego podsystemu:</strong>
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              {ALL_SUBSYSTEM_TYPES.map((type) => {
                const config = SUBSYSTEM_WIZARD_CONFIG[type];
                return (
                  <button
                    key={type}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAddSubsystemType(type)}
                  >
                    {config?.label ?? type}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setShowTypePicker(false)}
            >
              Anuluj
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowTypePicker(true)}
          >
            ➕ Dodaj nowy podsystem
          </button>
        )}
      </section>

      {!hasAnyAction && (
        <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
          ⚠️ Nie wybrano żadnej akcji. Wybierz istniejący podsystem do rozszerzenia lub dodaj nowy.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn btn-secondary" onClick={onBack}>
          ← Wstecz
        </button>
        <button
          className="btn btn-primary"
          onClick={onNext}
          disabled={!hasAnyAction}
          title={!hasAnyAction ? 'Wybierz akcję przed kontynuowaniem' : undefined}
        >
          Dalej →
        </button>
      </div>
    </div>
  );
};
