// src/components/brigades/tabs/ScheduleTab.tsx
// Schedule tab - assign tasks to brigades in a column layout

import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import brigadeService from '../../../services/brigade.service';
import type { Brigade } from '../../../types/brigade.types';
import { TaskAssignmentModal } from '../modals/TaskAssignmentModal';

interface ServiceTask {
  id: number;
  taskNumber: string;
  title: string;
  status: string;
  brigadeId?: number | null;
  brigade?: { id: number; code: string; name: string } | null;
  scheduledDate?: string | null;
}

export const ScheduleTab: React.FC = () => {
  const [brigades, setBrigades] = useState<Brigade[]>([]);
  const [tasks, setTasks] = useState<ServiceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [brigadesRes, tasksRes] = await Promise.all([
        brigadeService.getAll({ active: true, limit: 100 }),
        api.get('/service-tasks', { params: { limit: 200 } }),
      ]);

      setBrigades(brigadesRes.brigades || []);
      const tasksData = tasksRes.data.data || tasksRes.data;
      setTasks(Array.isArray(tasksData) ? tasksData : tasksData?.tasks || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania danych harmonogramu');
    } finally {
      setLoading(false);
    }
  };

  const unassignedTasks = tasks.filter((t) => !t.brigadeId);
  const getTasksForBrigade = (brigadeId: number) =>
    tasks.filter((t) => t.brigadeId === brigadeId);

  const handleAssignSuccess = () => {
    setShowAssignModal(false);
    loadData();
  };

  return (
    <div className="brigades-tab-content">
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="brigades-toolbar card">
        <div className="toolbar-row">
          <label htmlFor="schedule-date" style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            📅 Data harmonogramu:
          </label>
          <input
            type="date"
            id="schedule-date"
            className="search-input"
            style={{ flex: '0 0 auto', width: 'auto' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={() => setShowAssignModal(true)}
            style={{ marginLeft: 'auto' }}
          >
            ➕ Przypisz zadanie
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Ładowanie harmonogramu...</p>
        </div>
      ) : (
        <div className="schedule-columns">
          {/* Unassigned tasks column */}
          <div className="schedule-column schedule-column-unassigned">
            <div className="schedule-column-header">
              <span>📋 Nieprzypisane</span>
              <span className="count-badge">{unassignedTasks.length}</span>
            </div>
            <div className="schedule-column-body">
              {unassignedTasks.length === 0 ? (
                <p className="schedule-empty">Brak nieprzypisanych zadań</p>
              ) : (
                unassignedTasks.map((task) => (
                  <div key={task.id} className="schedule-task-card">
                    <div className="schedule-task-number">{task.taskNumber}</div>
                    <div className="schedule-task-title">{task.title}</div>
                    <div className="schedule-task-status">
                      <span className={`status-badge ${task.status}`}>{task.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Brigade columns */}
          {brigades.map((brigade) => {
            const brigadeTasks = getTasksForBrigade(brigade.id);
            return (
              <div key={brigade.id} className="schedule-column">
                <div className="schedule-column-header">
                  <span className="brigade-code">{brigade.code}</span>
                  <span>{brigade.name}</span>
                  <span className="count-badge">{brigadeTasks.length}</span>
                </div>
                <div className="schedule-column-body">
                  {brigadeTasks.length === 0 ? (
                    <p className="schedule-empty">Brak zadań</p>
                  ) : (
                    brigadeTasks.map((task) => (
                      <div key={task.id} className="schedule-task-card">
                        <div className="schedule-task-number">{task.taskNumber}</div>
                        <div className="schedule-task-title">{task.title}</div>
                        <div className="schedule-task-status">
                          <span className={`status-badge ${task.status}`}>{task.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAssignModal && (
        <TaskAssignmentModal
          brigades={brigades}
          onClose={() => setShowAssignModal(false)}
          onSuccess={handleAssignSuccess}
        />
      )}
    </div>
  );
};
