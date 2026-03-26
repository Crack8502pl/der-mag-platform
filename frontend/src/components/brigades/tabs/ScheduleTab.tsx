// src/components/brigades/tabs/ScheduleTab.tsx
// Schedule tab - assign tasks to brigades in a weekly timeline layout

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
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
}

const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'];

// ISO 8601 week number: week 1 is the first week containing a Thursday
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getWeekDates = (date: Date): Date[] => {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

// Timeline bounds: 6:00–18:00 (in minutes from midnight)
const TIMELINE_START_MINUTES = 360; // 6:00
const TIMELINE_RANGE_MINUTES = 720; // 12 hours

// Convert time (hours) to percentage on 6:00–18:00 timeline
const timeToPercent = (hours: number, minutes = 0): number => {
  const totalMins = hours * 60 + minutes;
  return Math.max(0, Math.min(100, ((totalMins - TIMELINE_START_MINUTES) / TIMELINE_RANGE_MINUTES) * 100));
};

// Default task bar: 8:00–16:00 (used until backend provides actual start/end times)
const DEFAULT_LEFT = timeToPercent(8);
const DEFAULT_WIDTH = timeToPercent(16) - DEFAULT_LEFT;

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

  const handleAssignSuccess = () => {
    setShowAssignModal(false);
    loadData();
  };

  const weekDates = getWeekDates(new Date(selectedDate));
  const weekNumber = getWeekNumber(new Date(selectedDate));
  const unassignedTasks = tasks.filter((t) => !t.brigadeId);

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
          <span style={{ color: 'var(--text-secondary)', fontSize: 14, marginLeft: 8 }}>
            Tydzień {weekNumber}
          </span>
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
        <>
          {/* Weekly timeline view */}
          <div className="schedule-week-view">
            {weekDates.map((date, idx) => {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${day}`;
              const dayTasks = tasks.filter((t) => {
                if (!t.plannedStartDate) return false;
                // Compare date portion only (plannedStartDate may be 'YYYY-MM-DD' or ISO timestamp)
                return t.plannedStartDate.slice(0, 10) === dateStr;
              });
              const timelineHeight = Math.max(60, dayTasks.length * 44 + 16);

              return (
                <div key={dateStr} className="schedule-day-row">
                  <div className="schedule-day-label">
                    <strong>{DAY_LABELS[idx]}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
                    </div>
                  </div>
                  <div className="schedule-timeline" style={{ height: timelineHeight }}>
                    {dayTasks.length === 0 ? (
                      <span
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          color: 'var(--text-secondary)',
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Brak zadań
                      </span>
                    ) : (
                      dayTasks.map((task, taskIdx) => (
                        <div
                          key={task.id}
                          className="schedule-task-bar"
                          style={{
                            left: `${DEFAULT_LEFT}%`,
                            width: `${DEFAULT_WIDTH}%`,
                            top: `${taskIdx * 44 + 8}px`,
                            height: '36px',
                            backgroundColor: task.brigadeId
                              ? 'var(--primary-color)'
                              : 'var(--warning-color, #f59e0b)',
                          }}
                          title={`${task.taskNumber}: ${task.title}${task.brigade ? ` [${task.brigade.code}]` : ''}`}
                        >
                          <span className="task-bar-title">
                            {task.brigade ? `[${task.brigade.code}] ` : ''}
                            {task.title}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unassigned tasks summary */}
          {unassignedTasks.length > 0 && (
            <div className="card" style={{ marginTop: 16, padding: '12px 16px' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                📋 Nieprzypisane zadania ({unassignedTasks.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {unassignedTasks.map((task) => (
                  <div key={task.id} className="schedule-task-card" style={{ minWidth: 180 }}>
                    <div className="schedule-task-number">{task.taskNumber}</div>
                    <div className="schedule-task-title">{task.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
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
