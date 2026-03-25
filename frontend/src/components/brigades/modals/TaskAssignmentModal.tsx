// src/components/brigades/modals/TaskAssignmentModal.tsx
// Modal for assigning a task to a brigade

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import type { Brigade } from '../../../types/brigade.types';

interface Task {
  id: number;
  taskNumber: string;
  title: string;
  status: string;
  brigadeId?: number | null;
}

interface TaskAssignmentModalProps {
  brigades: Brigade[];
  onClose: () => void;
  onSuccess: () => void;
}

export const TaskAssignmentModal: React.FC<TaskAssignmentModalProps> = ({
  brigades,
  onClose,
  onSuccess,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | ''>('');
  const [selectedBrigadeId, setSelectedBrigadeId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [error, setError] = useState('');

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  useEffect(() => {
    loadUnassignedTasks();
  }, []);

  const loadUnassignedTasks = async () => {
    try {
      setLoadingTasks(true);
      const response = await api.get('/service-tasks', { params: { status: 'created', limit: 100 } });
      const data = response.data.data || response.data || [];
      setTasks(Array.isArray(data) ? data : data.tasks || []);
    } catch {
      setError('Błąd pobierania zadań. Spróbuj ponownie.');
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTaskId || !selectedBrigadeId) {
      setError('Wybierz zadanie i brygadę');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.patch(`/service-tasks/${selectedTaskId}/assign-brigade`, {
        brigadeId: selectedBrigadeId,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd podczas przypisywania zadania');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="brigade-modal" onClick={onClose}>
      <div className="brigade-modal-content brigade-modal-animate" onClick={(e) => e.stopPropagation()}>
        <div className="brigade-modal-header">
          <h2>📋 Przypisz zadanie do brygady</h2>
          <button className="brigade-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="brigade-modal-body">
            <div className="form-group">
              <label htmlFor="task-select">Zadanie</label>
              {loadingTasks ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Ładowanie zadań...</p>
              ) : (
                <select
                  id="task-select"
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value ? Number(e.target.value) : '')}
                  required
                >
                  <option value="">-- Wybierz zadanie --</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.taskNumber} – {t.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="brigade-select">Brygada</label>
              <select
                id="brigade-select"
                value={selectedBrigadeId}
                onChange={(e) => setSelectedBrigadeId(e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="">-- Wybierz brygadę --</option>
                {brigades
                  .filter((b) => b.active)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} – {b.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="brigade-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Anuluj
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || loadingTasks}>
              {loading ? 'Przypisywanie...' : 'Przypisz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
