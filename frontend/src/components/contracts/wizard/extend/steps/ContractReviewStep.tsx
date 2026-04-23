// src/components/contracts/wizard/extend/steps/ContractReviewStep.tsx
// Extend wizard – Step 1: Read-only review of the contract before extending

import React from 'react';
import { SUBSYSTEM_WIZARD_CONFIG } from '../../../../../config/subsystemWizardConfig';
import type { ExtendWizardData } from '../../types/extend-wizard.types';

interface ContractReviewStepProps {
  contractData: ExtendWizardData;
  loading?: boolean;
  onNext: () => void;
}

export const ContractReviewStep: React.FC<ContractReviewStepProps> = ({
  contractData,
  loading,
  onNext,
}) => {
  const {
    contractNumber,
    customName,
    orderDate,
    projectManagerId,
    managerCode,
    liniaKolejowa,
    existingSubsystems,
  } = contractData;

  return (
    <div className="wizard-step-content">
      <h3>📋 Przegląd kontraktu</h3>

      <div className="alert alert-info" style={{ marginBottom: '16px' }}>
        ℹ️ Poniżej możesz rozszerzyć kontrakt o nowe podsystemy lub zadania.
        Istniejące elementy są wyświetlone tylko do odczytu — nie można ich edytować ani usunąć.
      </div>

      <section style={{ marginBottom: '20px' }}>
        <h4>Dane kontraktu</h4>
        <table className="tasks-table" style={{ maxWidth: '520px' }}>
          <tbody>
            {contractNumber && (
              <tr>
                <td><strong>Numer kontraktu</strong></td>
                <td><code>{contractNumber}</code></td>
              </tr>
            )}
            <tr>
              <td><strong>Nazwa</strong></td>
              <td>{customName || '—'}</td>
            </tr>
            {orderDate && (
              <tr>
                <td><strong>Data zamówienia</strong></td>
                <td>{orderDate}</td>
              </tr>
            )}
            <tr>
              <td><strong>Kierownik (ID)</strong></td>
              <td>{projectManagerId || '—'}</td>
            </tr>
            {managerCode && (
              <tr>
                <td><strong>Kod kierownika</strong></td>
                <td>{managerCode}</td>
              </tr>
            )}
            {liniaKolejowa && (
              <tr>
                <td><strong>Linia kolejowa</strong></td>
                <td>{liniaKolejowa}</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h4>Istniejące podsystemy ({existingSubsystems.length})</h4>
        {loading ? (
          <p className="text-muted">⏳ Wczytywanie danych kontraktu…</p>
        ) : existingSubsystems.length === 0 ? (
          <p className="text-muted">Brak podsystemów w kontrakcie.</p>
        ) : (
          <div className="tasks-preview">
            {existingSubsystems.map((sub) => {
              const config = SUBSYSTEM_WIZARD_CONFIG[sub.type];
              return (
                <div key={sub.id} className="subsystem-tasks" style={{ marginBottom: '12px' }}>
                  <h5 style={{ margin: '0 0 6px' }}>
                    {config?.label ?? sub.type}
                    <span className="text-muted" style={{ fontWeight: 'normal', marginLeft: '8px', fontSize: '0.9em' }}>
                      ({sub.existingTasks.length} zadań)
                    </span>
                    {sub.ipPool && (
                      <span
                        style={{
                          marginLeft: '8px',
                          padding: '2px 8px',
                          backgroundColor: '#e3f2fd',
                          borderRadius: '4px',
                          fontSize: '0.85em',
                        }}
                      >
                        🌐 {sub.ipPool}
                      </span>
                    )}
                  </h5>
                  {sub.existingTasks.length > 0 && (
                    <table className="tasks-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Typ</th>
                          <th>Numer</th>
                          <th>Nazwa / Dane</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sub.existingTasks.map((task, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td>
                              <code>{task.taskType}</code>
                            </td>
                            <td>
                              <code>{task.taskNumber || '—'}</code>
                            </td>
                            <td>
                              {task.nazwa ||
                                task.kilometraz ||
                                task.miejscowosc ||
                                '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary"
          onClick={onNext}
          disabled={loading}
        >
          Dalej →
        </button>
      </div>
    </div>
  );
};
