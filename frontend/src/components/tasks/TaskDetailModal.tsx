// src/components/tasks/TaskDetailModal.tsx
// Modal for viewing task details

import React, { useEffect, useState } from 'react';
import { TaskStatusBadge } from './TaskStatusBadge';
import { LCSConfigModal } from './LCSConfigModal';
import { NastawniConfigModal } from './NastawniConfigModal';
import { FiberSchemaModal } from './FiberSchemaModal';
import { CompleteTaskAndCreateAssetModal } from './CompleteTaskAndCreateAssetModal';
import taskService from '../../services/task.service';
import type { Task } from '../../types/task.types';
import { getPriorityDisplay } from '../../utils/priority';
import { usePermissions } from '../../hooks/usePermissions';

interface Props {
  taskNumber: string;
  onClose: () => void;
}

export const TaskDetailModal: React.FC<Props> = ({ taskNumber, onClose }) => {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLCSConfig, setShowLCSConfig] = useState(false);
  const [showNastawniConfig, setShowNastawniConfig] = useState(false);
  const [showFiberSchema, setShowFiberSchema] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('tasks', 'update');
  const canCreateAsset = hasPermission('assets', 'create');

  const INSTALLATION_TASK_TYPES = ['PRZEJAZD', 'LCS', 'CUID', 'NASTAWNIA', 'SKP'];

  useEffect(() => {
    loadTask();
  }, [taskNumber]);

  const loadTask = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await taskService.getById(taskNumber);
      setTask(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania zadania');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSuccess = () => {
    setShowLCSConfig(false);
    setShowNastawniConfig(false);
    setShowFiberSchema(false);
    loadTask();
  };

  const taskVariant: string = task?.metadata?.taskVariant || task?.taskType?.code || '';
  const isLCS = taskVariant === 'LCS';
  const isNastawnia = taskVariant === 'NASTAWNIA';

  const canCompleteTask =
    task !== null &&
    canEdit &&
    canCreateAsset &&
    ['in_progress', 'configured'].includes(task.status) &&
    INSTALLATION_TASK_TYPES.includes(task.taskType?.code || '');

  return (
    <>
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Szczegóły zadania</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {loading && (
          <div className="modal-form">
            <div className="loading">Ładowanie...</div>
          </div>
        )}

        {error && (
          <div className="modal-form">
            <div className="alert alert-error">{error}</div>
          </div>
        )}

        {task && !loading && (
          <div className="modal-form">
            <div className="detail-grid">
              <div className="detail-item">
                <label>Numer zadania</label>
                <div className="detail-value">
                  <code>{task.taskNumber}</code>
                </div>
              </div>

              <div className="detail-item">
                <label>Status</label>
                <div className="detail-value">
                  <TaskStatusBadge status={task.status} />
                </div>
              </div>

              <div className="detail-item">
                <label>Tytuł</label>
                <div className="detail-value">{task.title}</div>
              </div>

              <div className="detail-item">
                <label>Typ zadania</label>
                <div className="detail-value">{task.taskType?.name || 'N/A'}</div>
              </div>

              <div className="detail-item">
                <label>Priorytet</label>
                <div className="detail-value">
                  {getPriorityDisplay(task.priority)}
                </div>
              </div>

              {task.location && (
                <div className="detail-item">
                  <label>Lokalizacja</label>
                  <div className="detail-value">{task.location}</div>
                </div>
              )}

              {task.client && (
                <div className="detail-item">
                  <label>Klient</label>
                  <div className="detail-value">{task.client}</div>
                </div>
              )}

              {task.contractNumber && (
                <div className="detail-item">
                  <label>Numer kontraktu</label>
                  <div className="detail-value">
                    <code>{task.contractNumber}</code>
                  </div>
                </div>
              )}

              {task.plannedStartDate && (
                <div className="detail-item">
                  <label>Planowany start</label>
                  <div className="detail-value">
                    {new Date(task.plannedStartDate).toLocaleDateString('pl-PL')}
                  </div>
                </div>
              )}

              {task.plannedEndDate && (
                <div className="detail-item">
                  <label>Planowane zakończenie</label>
                  <div className="detail-value">
                    {new Date(task.plannedEndDate).toLocaleDateString('pl-PL')}
                  </div>
                </div>
              )}

              <div className="detail-item">
                <label>Data utworzenia</label>
                <div className="detail-value">
                  {new Date(task.createdAt).toLocaleString('pl-PL')}
                </div>
              </div>

              <div className="detail-item">
                <label>Ostatnia aktualizacja</label>
                <div className="detail-value">
                  {new Date(task.updatedAt).toLocaleString('pl-PL')}
                </div>
              </div>
            </div>

            {task.description && (
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label>Opis</label>
                <div className="detail-value detail-description">
                  {task.description}
                </div>
              </div>
            )}

            {task.assignments && task.assignments.length > 0 && (
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label>Przypisani użytkownicy</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                  {task.assignments.map((assignment) => (
                    <span key={assignment.id} className="user-badge">
                      👤 {assignment.user?.firstName} {assignment.user?.lastName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* BOM Materials Section */}
            {task.metadata?.bomMaterials && task.metadata.bomMaterials.length > 0 && (
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label>📦 Materiały BOM</label>
                <div style={{ marginTop: '10px' }}>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>Materiał</th>
                          <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>Ilość</th>
                          <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>Jednostka</th>
                          <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>Kategoria</th>
                        </tr>
                      </thead>
                      <tbody>
                        {task.metadata.bomMaterials.map((material: any, idx: number) => (
                          <tr key={idx}>
                            <td style={{ textAlign: 'left', verticalAlign: 'middle' }}>
                              <div style={{ fontWeight: 500 }}>{material.materialName}</div>
                              {material.catalogNumber && (
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  {material.catalogNumber}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <strong style={{ color: 'var(--primary-color)' }}>
                                {material.plannedQuantity || material.quantity}
                              </strong>
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{material.unit}</td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{material.category || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="modal-footer">
          {/* Configure buttons for LCS / Nastawnia tasks */}
          {task && canEdit && isLCS && (
            <>
              <button
                className="btn"
                style={{ backgroundColor: '#f59e0b', color: 'white', marginRight: '8px' }}
                onClick={() => setShowLCSConfig(true)}
              >
                ⚙️ Konfiguruj LCS
              </button>
              <button
                className="btn"
                style={{ backgroundColor: '#6366f1', color: 'white', marginRight: 'auto' }}
                onClick={() => setShowFiberSchema(true)}
              >
                🔗 Schemat światłowodowy
              </button>
            </>
          )}
          {task && canEdit && isNastawnia && (
            <button
              className="btn"
              style={{ backgroundColor: '#f59e0b', color: 'white', marginRight: 'auto' }}
              onClick={() => setShowNastawniConfig(true)}
            >
              ⚙️ Konfiguruj Nastawnie
            </button>
          )}
          {canCompleteTask && (
            <button
              className="btn btn-success"
              onClick={() => setShowCompleteModal(true)}
            >
              ✅ Zakończ i utwórz obiekt
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            Zamknij
          </button>
        </div>
      </div>
    </div>

    {/* LCS Config Modal */}
    {task && showLCSConfig && (
      <LCSConfigModal
        task={task}
        onClose={() => setShowLCSConfig(false)}
        onSuccess={handleConfigSuccess}
      />
    )}

    {/* Nastawnia Config Modal */}
    {task && showNastawniConfig && (
      <NastawniConfigModal
        task={task}
        onClose={() => setShowNastawniConfig(false)}
        onSuccess={handleConfigSuccess}
      />
    )}

    {/* Fiber Schema Modal */}
    {task && showFiberSchema && (
      <FiberSchemaModal
        task={task}
        onClose={() => setShowFiberSchema(false)}
        onSuccess={handleConfigSuccess}
      />
    )}
    {/* Complete Task and Create Asset Modal */}
    {task && showCompleteModal && (
      <CompleteTaskAndCreateAssetModal
        task={task}
        onClose={() => setShowCompleteModal(false)}
        onSuccess={() => {
          setShowCompleteModal(false);
          loadTask();
        }}
      />
    )}
    </>
  );
};
