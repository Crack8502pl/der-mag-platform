import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import type { DashboardMetrics } from '../types';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const response = await apiClient.getDashboardMetrics();
        setMetrics(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Błąd ładowania danych');
      } finally {
        setIsLoading(false);
      }
    };

    loadMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="dashboard">
        <div className="loading">Ładowanie...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error-banner">{error}</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Witaj, {user?.firstName} {user?.lastName}!</p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{metrics?.totalTasks || 0}</div>
          <div className="metric-label">Wszystkie zadania</div>
        </div>

        <div className="metric-card active">
          <div className="metric-value">{metrics?.activeTasks || 0}</div>
          <div className="metric-label">Aktywne zadania</div>
        </div>

        <div className="metric-card success">
          <div className="metric-value">{metrics?.completedTasks || 0}</div>
          <div className="metric-label">Ukończone zadania</div>
        </div>

        <div className="metric-card warning">
          <div className="metric-value">{metrics?.delayedTasks || 0}</div>
          <div className="metric-label">Opóźnione zadania</div>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Zadania według statusu</h2>
        <div className="status-list">
          {metrics?.tasksByStatus.map((item) => (
            <div key={item.status} className="status-item">
              <span className="status-name">{item.status}</span>
              <span className="status-count">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Zadania według typu</h2>
        <div className="type-list">
          {metrics?.tasksByType.map((item) => (
            <div key={item.taskType} className="type-item">
              <span className="type-name">{item.taskType}</span>
              <span className="type-count">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {metrics?.recentTasks && metrics.recentTasks.length > 0 && (
        <div className="dashboard-section">
          <h2>Ostatnie zadania</h2>
          <div className="recent-tasks">
            {metrics.recentTasks.map((task) => (
              <div key={task.id} className="task-card">
                <div className="task-header">
                  <span className="task-number">{task.taskNumber}</span>
                  <span className={`task-status status-${task.status}`}>
                    {task.status}
                  </span>
                </div>
                <h3 className="task-title">{task.title}</h3>
                <p className="task-location">{task.location}</p>
                <div className="task-footer">
                  <span className="task-type">{task.taskType.name}</span>
                  <span className="task-priority priority-${task.priority}">
                    {task.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
