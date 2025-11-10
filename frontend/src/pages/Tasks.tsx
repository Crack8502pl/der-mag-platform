import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Task } from '../types';
import './Tasks.css';

export const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadTasks();
  }, [statusFilter]);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const params = statusFilter ? { status: statusFilter } : undefined;
      const response = await apiClient.getTasks(params);
      setTasks(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd ładowania zadań');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (status: string): string => {
    const labels: { [key: string]: string } = {
      created: 'Utworzone',
      assigned: 'Przypisane',
      started: 'Rozpoczęte',
      in_progress: 'W trakcie',
      completed: 'Ukończone',
      cancelled: 'Anulowane',
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string): string => {
    const labels: { [key: string]: string } = {
      low: 'Niski',
      medium: 'Średni',
      high: 'Wysoki',
      urgent: 'Pilny',
    };
    return labels[priority] || priority;
  };

  if (isLoading) {
    return (
      <div className="tasks-page">
        <div className="loading">Ładowanie zadań...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tasks-page">
        <div className="error-banner">{error}</div>
      </div>
    );
  }

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <h1>Zadania</h1>
        <div className="tasks-filters">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Wszystkie statusy</option>
            <option value="created">Utworzone</option>
            <option value="assigned">Przypisane</option>
            <option value="started">Rozpoczęte</option>
            <option value="in_progress">W trakcie</option>
            <option value="completed">Ukończone</option>
          </select>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="no-tasks">
          <p>Brak zadań do wyświetlenia</p>
        </div>
      ) : (
        <div className="tasks-grid">
          {tasks.map((task) => (
            <Link
              key={task.id}
              to={`/tasks/${task.taskNumber}`}
              className="task-card-link"
            >
              <div className="task-card">
                <div className="task-header">
                  <span className="task-number">{task.taskNumber}</span>
                  <span className={`task-status status-${task.status}`}>
                    {getStatusLabel(task.status)}
                  </span>
                </div>

                <h3 className="task-title">{task.title}</h3>
                
                {task.description && (
                  <p className="task-description">
                    {task.description.length > 100
                      ? `${task.description.substring(0, 100)}...`
                      : task.description}
                  </p>
                )}

                <div className="task-info">
                  <div className="info-item">
                    <span className="info-label">Lokalizacja:</span>
                    <span className="info-value">{task.location}</span>
                  </div>
                  {task.client && (
                    <div className="info-item">
                      <span className="info-label">Klient:</span>
                      <span className="info-value">{task.client}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="info-label">Typ:</span>
                    <span className="info-value">{task.taskType.name}</span>
                  </div>
                </div>

                <div className="task-footer">
                  <span className={`task-priority priority-${task.priority}`}>
                    {getPriorityLabel(task.priority)}
                  </span>
                  <span className="task-date">
                    {new Date(task.createdAt).toLocaleDateString('pl-PL')}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
