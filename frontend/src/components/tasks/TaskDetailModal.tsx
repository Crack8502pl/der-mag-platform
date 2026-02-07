// src/components/tasks/TaskDetailModal.tsx
// Modal for viewing task details

import React, { useEffect, useState } from 'react';
import { TaskStatusBadge } from './TaskStatusBadge';
import taskService from '../../services/task.service';
import type { Task } from '../../types/task.types';
import { getPriorityDisplay } from '../../utils/priority';

interface Props {
  taskNumber: string;
  onClose: () => void;
}

export const TaskDetailModal: React.FC<Props> = ({ taskNumber, onClose }) => {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="modal-overlay" onClick={onClose}>
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
                          <th>Materiał</th>
                          <th>Ilość</th>
                          <th>Jednostka</th>
                          <th>Kategoria</th>
                        </tr>
                      </thead>
                      <tbody>
                        {task.metadata.bomMaterials.map((material: any, idx: number) => (
                          <tr key={idx}>
                            <td>
                              <div style={{ fontWeight: 500 }}>{material.materialName}</div>
                              {material.catalogNumber && (
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  {material.catalogNumber}
                                </div>
                              )}
                            </td>
                            <td>
                              <strong style={{ color: 'var(--primary-color)' }}>
                                {material.plannedQuantity || material.quantity}
                              </strong>
                            </td>
                            <td>{material.unit}</td>
                            <td>{material.category || '-'}</td>
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
          <button className="btn btn-secondary" onClick={onClose}>
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
