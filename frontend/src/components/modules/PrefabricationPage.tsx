import React, { useEffect, useState } from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import api from '../../services/api';
import './ModulePage.css';
import './PrefabricationPage.css';

interface PrefabricationTask {
  id: number;
  subsystem: {
    id: number;
    subsystemNumber: string;
    systemType: string;
  };
  status: string;
  assignedTo?: {
    id: number;
    name: string;
  };
  devices: Array<{ status: string }>;
  createdAt: string;
}

interface PrefabricationValidation {
  canStartPrefabrication: boolean;
  allTasksConfigured: boolean;
  totalSubsystemTasks: number;
  configuredTasks: number;
  missingTasks: Array<{
    taskNumber: string;
    taskName: string;
    status: string;
  }>;
  ipDevicesCount: number;
  message: string;
}

export const PrefabricationPage: React.FC = () => {
  const [tasks, setTasks] = useState<PrefabricationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState<PrefabricationTask | null>(null);
  const [validation, setValidation] = useState<PrefabricationValidation | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/prefabrication?all=true');
      setTasks(response.data.data || []);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setError(apiErr.response?.data?.message || 'Błąd ładowania zadań prefabrykacji');
    } finally {
      setLoading(false);
    }
  };

  const validatePrefabrication = async (task: PrefabricationTask) => {
    setSelectedTask(task);
    setValidation(null);
    setValidationLoading(true);
    setError('');
    try {
      const response = await api.get(`/prefabrication/validate/${task.subsystem.id}`);
      setValidation(response.data.data);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setError(apiErr.response?.data?.message || 'Błąd walidacji');
    } finally {
      setValidationLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedTask(null);
    setValidation(null);
  };

  const getStatusBadgeClass = (status: string) =>
    `status-badge status-badge--${status.toLowerCase()}`;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CREATED': return 'Oczekuje';
      case 'IN_PROGRESS': return 'W trakcie';
      case 'COMPLETED': return 'Zakończone';
      case 'CANCELLED': return 'Anulowane';
      default: return status;
    }
  };

  const getConfiguredCount = (task: PrefabricationTask) => {
    const configuredStatuses = ['CONFIGURED', 'VERIFIED'];
    return (task.devices || []).filter(d => configuredStatuses.includes(d.status)).length;
  };

  return (
    <div className="module-page">
      <BackButton to="/dashboard" />

      <div className="page-header">
        <div className="module-icon">
          <ModuleIcon name="prefabrication" emoji={MODULE_ICONS.prefabrication} size={36} />
        </div>
        <h1>Prefabrykacja</h1>
      </div>

      <div className="module-content card">
        <p className="module-description">
          Prefabrykacja urządzeń - konfiguracja, weryfikacja i przygotowanie urządzeń do montażu.
        </p>

        {/* Warunek konieczny */}
        <div className="prefab-warning-box">
          <h4>⚠️ Warunek konieczny do rozpoczęcia prefabrykacji:</h4>
          <p>
            Aby poprawnie przyjąć ilość urządzeń IP do zaadresowania,{' '}
            <strong>wszystkie zadania z podsystemu dla kontraktu muszą być skonfigurowane</strong>{' '}
            (status minimum: BOM_GENERATED).
          </p>
          <ul>
            <li>✓ Każde zadanie musi mieć wygenerowany BOM</li>
            <li>✓ Kompletacja materiałów musi być zakończona</li>
            <li>✓ Pula adresów IP musi być przypisana do podsystemu</li>
          </ul>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="prefab-loading">
            <div className="spinner" />
            <p>Ładowanie zadań...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="prefab-empty">
            <p>Brak zadań prefabrykacji</p>
            <small>Zadania pojawią się automatycznie po zakończeniu kompletacji materiałów</small>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Podsystem</th>
                  <th>Status</th>
                  <th>Przypisany do</th>
                  <th>Postęp konfiguracji</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => {
                  const configuredCount = getConfiguredCount(task);
                  const totalCount = (task.devices || []).length;
                  const progressPct = totalCount > 0 ? (configuredCount / totalCount) * 100 : 0;
                  return (
                    <tr key={task.id}>
                      <td>
                        <div className="subsystem-number">{task.subsystem.subsystemNumber}</div>
                        <div className="subsystem-type">{task.subsystem.systemType}</div>
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(task.status)}>
                          {getStatusLabel(task.status)}
                        </span>
                      </td>
                      <td>{task.assignedTo?.name ?? '—'}</td>
                      <td>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                        </div>
                        <span className="progress-label">
                          {configuredCount} / {totalCount} urządzeń
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => validatePrefabrication(task)}
                          >
                            Walidacja
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal walidacji */}
        {selectedTask && (
          <div className="prefab-modal-overlay" onClick={closeModal}>
            <div className="prefab-modal-content" onClick={e => e.stopPropagation()}>
              <h3>Walidacja: {selectedTask.subsystem.subsystemNumber}</h3>

              {validationLoading ? (
                <div className="prefab-loading">
                  <div className="spinner" />
                  <p>Sprawdzanie warunków...</p>
                </div>
              ) : validation ? (
                <>
                  <div className={`validation-status ${validation.canStartPrefabrication ? 'valid' : 'invalid'}`}>
                    {validation.canStartPrefabrication
                      ? '✅ Gotowe do prefabrykacji'
                      : '❌ Nie można rozpocząć prefabrykacji'}
                  </div>

                  <div className="validation-details">
                    <p>
                      <strong>Zadania podsystemu:</strong>{' '}
                      {validation.configuredTasks} / {validation.totalSubsystemTasks} skonfigurowanych
                    </p>
                    <p>
                      <strong>Urządzenia IP do zaadresowania:</strong> {validation.ipDevicesCount}
                    </p>

                    {validation.missingTasks.length > 0 && (
                      <div className="missing-tasks">
                        <p><strong>Zadania bez BOM ({validation.missingTasks.length}):</strong></p>
                        <ul>
                          {validation.missingTasks.map(t => (
                            <li key={t.taskNumber}>
                              {t.taskNumber}: {t.taskName}
                              <span className="task-status-label">{t.status}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <p className="validation-message-text">{validation.message}</p>
                  </div>
                </>
              ) : null}

              <button className="btn btn-secondary" onClick={closeModal}>
                Zamknij
              </button>
            </div>
          </div>
        )}

        {/* Funkcje modułu */}
        <div className="prefab-features">
          <h3>📋 Funkcje modułu prefabrykacji:</h3>
          <ul className="feature-list">
            <li className="feature-item">
              <span className="feature-icon">✅</span>
              <span>Przyjmowanie zleceń prefabrykacji</span>
            </li>
            <li className="feature-item">
              <span className="feature-icon">✅</span>
              <span>Konfiguracja urządzeń (IP, NTP=Gateway, parametry)</span>
            </li>
            <li className="feature-item">
              <span className="feature-icon">✅</span>
              <span>Weryfikacja numerów seryjnych</span>
            </li>
            <li className="feature-item">
              <span className="feature-icon">✅</span>
              <span>Przygotowanie do wysyłki</span>
            </li>
            <li className="feature-item">
              <span className="feature-icon">✅</span>
              <span>Dokumentacja wykonanych prac</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
