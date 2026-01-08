// src/components/tasks/TaskCreateModal.tsx
// Modal for creating new tasks

import React, { useState, useEffect } from 'react';
import taskService from '../../services/task.service';
import type { TaskType, CreateTaskDto } from '../../types/task.types';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const TaskCreateModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CreateTaskDto>({
    title: '',
    description: '',
    taskTypeId: 0,
    status: 'created',
    location: '',
    client: '',
    contractNumber: '',
    priority: 0
  });

  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTaskTypes();
  }, []);

  const loadTaskTypes = async () => {
    try {
      const types = await taskService.getTaskTypes();
      setTaskTypes(types.filter(t => t.active));
    } catch (err: any) {
      setError('Błąd pobierania typów zadań');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Tytuł jest wymagany');
      return;
    }

    if (!formData.taskTypeId) {
      setError('Typ zadania jest wymagany');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await taskService.create(formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd tworzenia zadania');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateTaskDto, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>➕ Nowe zadanie</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-form">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label>
                Tytuł <span className="required">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Np. Instalacja systemu alarmowego"
                required
              />
            </div>

            <div className="form-group">
              <label>
                Typ zadania <span className="required">*</span>
              </label>
              <select
                value={formData.taskTypeId}
                onChange={(e) => handleChange('taskTypeId', Number(e.target.value))}
                required
              >
                <option value="">Wybierz typ zadania</option>
                {taskTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Opis</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Szczegółowy opis zadania..."
                rows={4}
              />
            </div>

            <div className="form-group">
              <label>Lokalizacja</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="Np. Warszawa, ul. Marszałkowska 1"
              />
            </div>

            <div className="form-group">
              <label>Klient</label>
              <input
                type="text"
                value={formData.client}
                onChange={(e) => handleChange('client', e.target.value)}
                placeholder="Nazwa klienta"
              />
            </div>

            <div className="form-group">
              <label>Numer kontraktu</label>
              <input
                type="text"
                value={formData.contractNumber}
                onChange={(e) => handleChange('contractNumber', e.target.value)}
                placeholder="Np. K00001"
              />
            </div>

            <div className="form-group">
              <label>Priorytet</label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', Number(e.target.value))}
              >
                <option value={0}>Normalny</option>
                <option value={1}>⭐ Niski</option>
                <option value={2}>⭐⭐ Średni</option>
                <option value={3}>⭐⭐⭐ Wysoki</option>
                <option value={4}>⭐⭐⭐⭐ Krytyczny</option>
              </select>
            </div>

            <div className="form-group">
              <label>Status początkowy</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="created">Utworzone</option>
                <option value="assigned">Przypisane</option>
                <option value="in_progress">W realizacji</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={loading}
            >
              Anuluj
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Tworzenie...' : 'Utwórz zadanie'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
