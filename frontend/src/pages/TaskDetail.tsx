import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Task } from '../types';
import './TaskDetail.css';

export const TaskDetail: React.FC = () => {
  const { taskNumber } = useParams<{ taskNumber: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (taskNumber) {
      loadTask(taskNumber);
    }
  }, [taskNumber]);

  const loadTask = async (number: string) => {
    try {
      setIsLoading(true);
      const response = await apiClient.getTask(number);
      setTask(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd ładowania zadania');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="task-detail-page">
        <div className="loading">Ładowanie zadania...</div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="task-detail-page">
        <div className="error-banner">{error || 'Zadanie nie znalezione'}</div>
        <Link to="/tasks" className="back-link">← Powrót do listy zadań</Link>
      </div>
    );
  }

  return (
    <div className="task-detail-page">
      <Link to="/tasks" className="back-link">← Powrót do listy zadań</Link>

      <div className="task-detail-header">
        <div className="header-left">
          <h1>{task.title}</h1>
          <span className="task-number-large">{task.taskNumber}</span>
        </div>
        <span className={`task-status-large status-${task.status}`}>
          {task.status}
        </span>
      </div>

      <div className="task-detail-grid">
        <div className="detail-section">
          <h2>Informacje podstawowe</h2>
          <div className="detail-row">
            <span className="detail-label">Status:</span>
            <span className="detail-value">{task.status}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Priorytet:</span>
            <span className={`priority-badge priority-${task.priority}`}>
              {task.priority}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Lokalizacja:</span>
            <span className="detail-value">{task.location}</span>
          </div>
          {task.client && (
            <div className="detail-row">
              <span className="detail-label">Klient:</span>
              <span className="detail-value">{task.client}</span>
            </div>
          )}
          <div className="detail-row">
            <span className="detail-label">Typ zadania:</span>
            <span className="detail-value">{task.taskType.name}</span>
          </div>
        </div>

        {task.description && (
          <div className="detail-section">
            <h2>Opis</h2>
            <p className="task-description">{task.description}</p>
          </div>
        )}

        <div className="detail-section">
          <h2>Harmonogram</h2>
          {task.plannedStartDate && (
            <div className="detail-row">
              <span className="detail-label">Planowany start:</span>
              <span className="detail-value">
                {new Date(task.plannedStartDate).toLocaleDateString('pl-PL')}
              </span>
            </div>
          )}
          {task.plannedEndDate && (
            <div className="detail-row">
              <span className="detail-label">Planowane zakończenie:</span>
              <span className="detail-value">
                {new Date(task.plannedEndDate).toLocaleDateString('pl-PL')}
              </span>
            </div>
          )}
          {task.actualStartDate && (
            <div className="detail-row">
              <span className="detail-label">Faktyczny start:</span>
              <span className="detail-value">
                {new Date(task.actualStartDate).toLocaleDateString('pl-PL')}
              </span>
            </div>
          )}
          {task.actualEndDate && (
            <div className="detail-row">
              <span className="detail-label">Faktyczne zakończenie:</span>
              <span className="detail-value">
                {new Date(task.actualEndDate).toLocaleDateString('pl-PL')}
              </span>
            </div>
          )}
        </div>

        <div className="detail-section">
          <h2>Osoby</h2>
          <div className="detail-row">
            <span className="detail-label">Utworzone przez:</span>
            <span className="detail-value">
              {task.createdBy.firstName} {task.createdBy.lastName}
            </span>
          </div>
          {task.assignedTo && task.assignedTo.length > 0 && (
            <div className="detail-row">
              <span className="detail-label">Przypisane do:</span>
              <div className="assigned-users">
                {task.assignedTo.map((user) => (
                  <span key={user.id} className="user-badge">
                    {user.firstName} {user.lastName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="detail-section">
          <h2>Daty systemowe</h2>
          <div className="detail-row">
            <span className="detail-label">Utworzono:</span>
            <span className="detail-value">
              {new Date(task.createdAt).toLocaleString('pl-PL')}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Ostatnia aktualizacja:</span>
            <span className="detail-value">
              {new Date(task.updatedAt).toLocaleString('pl-PL')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
