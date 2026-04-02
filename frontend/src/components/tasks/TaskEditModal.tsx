// src/components/tasks/TaskEditModal.tsx
// Modal for editing existing tasks

import React, { useState, useEffect, useMemo } from 'react';
import taskService from '../../services/task.service';
import { BOMConfigModal } from './BOMConfigModal';
import { SMOKConfigModal } from './SMOKConfigModal';
import { LCSConfigModal } from './LCSConfigModal';
import { NastawniConfigModal } from './NastawniConfigModal';
import { LocationPicker } from '../common/LocationPicker';
import type { GPSCoordinates } from '../../hooks/useGoogleMaps';
import type { Task, TaskType, UpdateTaskDto } from '../../types/task.types';

interface Props {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
}

/** Determine which config modal to show based on task type / variant.
 *  Prefers the currently-selected task type (from formData + taskTypes list)
 *  so that changing the task type in the edit form doesn't open the wrong modal.
 */
const resolveConfigModalType = (
  task: Task,
  taskTypeId: number | undefined,
  taskTypes: TaskType[]
): 'LCS' | 'NASTAWNIA' | 'SMOK' => {
  // Try to resolve from the currently selected task type in the form
  if (taskTypeId) {
    const selectedType = taskTypes.find(t => t.id === taskTypeId);
    if (selectedType?.code === 'LCS') return 'LCS';
    if (selectedType?.code === 'NASTAWNIA') return 'NASTAWNIA';
    if (selectedType) return 'SMOK'; // known type, just not LCS/NASTAWNIA
  }
  // Fall back to the original task's stored variant
  const variant: string =
    task.metadata?.taskVariant || task.taskType?.code || '';
  if (variant === 'LCS') return 'LCS';
  if (variant === 'NASTAWNIA') return 'NASTAWNIA';
  return 'SMOK';
};

export const TaskEditModal: React.FC<Props> = ({ task, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<UpdateTaskDto>({
    title: task.title,
    description: task.description || '',
    taskTypeId: task.taskTypeId,
    status: task.status,
    location: task.location || '',
    client: task.client || '',
    contractNumber: task.contractNumber || '',
    priority: task.priority || 0,
    googleMapsUrl: task.googleMapsUrl || '',
    gpsLatitude: task.gpsLatitude ?? null,
    gpsLongitude: task.gpsLongitude ?? null,
  });

  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBOMConfig, setShowBOMConfig] = useState(false);
  const [showSMOKConfig, setShowSMOKConfig] = useState(false);
  const [showLCSConfig, setShowLCSConfig] = useState(false);
  const [showNastawniConfig, setShowNastawniConfig] = useState(false);

  const configModalType = resolveConfigModalType(task, formData.taskTypeId, taskTypes);

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
    
    if (!formData.title?.trim()) {
      setError('Tytuł jest wymagany');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await taskService.update(task.taskNumber, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd aktualizacji zadania');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof UpdateTaskDto, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isTaskTypeLocked = useMemo(() => {
    const hasBom = task.metadata?.bomGenerated === true || task.metadata?.bomId;
    const advancedStatuses = ['configured', 'ready_for_completion', 'completed'];
    return hasBom || advancedStatuses.includes(task.status);
  }, [task]);

  const handlePassToCompletion = async () => {
    try {
      setLoading(true);
      await taskService.updateStatus(task.taskNumber, 'ready_for_completion');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd podczas przekazywania do kompletacji');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Edytuj zadanie</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-form">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label>Numer zadania</label>
              <input
                type="text"
                value={task.taskNumber}
                disabled
                className="disabled"
              />
            </div>

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
                {isTaskTypeLocked && (
                  <span className="locked-hint" title="Typ zadania zablokowany - BOM został wygenerowany lub zadanie jest w zaawansowanym statusie">
                    🔒
                  </span>
                )}
              </label>
              <select
                value={formData.taskTypeId}
                onChange={(e) => handleChange('taskTypeId', Number(e.target.value))}
                required
                disabled={isTaskTypeLocked}
                className={isTaskTypeLocked ? 'disabled' : ''}
              >
                <option value="">Wybierz typ zadania</option>
                {taskTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {isTaskTypeLocked && (
                <small className="form-hint">
                  Typ zadania nie może być zmieniony po wygenerowaniu BOM lub gdy zadanie jest w zaawansowanym statusie
                </small>
              )}
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
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="created">Utworzone</option>
                <option value="assigned">Przypisane</option>
                <option value="in_progress">W realizacji</option>
                <option value="on_hold">Wstrzymane</option>
                <option value="configured">Skonfigurowane</option>
                <option value="ready_for_completion">Do kompletacji</option>
                <option value="completed">Zakończone</option>
                <option value="cancelled">Anulowane</option>
              </select>
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
              <label>Link Google Maps / GPS</label>
              <LocationPicker
                googleMapsUrl={formData.googleMapsUrl || ''}
                value={
                  formData.gpsLatitude != null && formData.gpsLongitude != null
                    ? { lat: Number(formData.gpsLatitude), lon: Number(formData.gpsLongitude) }
                    : null
                }
                onChange={(coords: GPSCoordinates | null) => {
                  setFormData(prev => ({
                    ...prev,
                    gpsLatitude: coords?.lat ?? null,
                    gpsLongitude: coords?.lon ?? null,
                  }));
                }}
                onGoogleMapsUrlChange={(url: string) => {
                  setFormData(prev => ({ ...prev, googleMapsUrl: url }));
                }}
                placeholder="Wklej link Google Maps lub współrzędne GPS"
                showNavigationButton={true}
              />
              <small className="form-help">
                Obsługiwane: pełny link Google Maps, skrócony link (maps.app.goo.gl), współrzędne (52.2297, 21.0122)
              </small>
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
                <option value={0}>🔶🔶 Bardzo niski</option>
                <option value={1}>🔶 Niski</option>
                <option value={2}>Normalny</option>
                <option value={3}>⭐️ Wysoki</option>
                <option value={4}>⭐️⭐️ Bardzo Wysoki</option>
                <option value={5}>🌟🌟🌟 Krytyczny</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn"
              onClick={() => setShowBOMConfig(true)}
              disabled={loading}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                marginRight: '8px'
              }}
            >
              👁️ Podgląd
            </button>
            <button 
              type="button" 
              className="btn"
              onClick={() => {
                if (configModalType === 'LCS') setShowLCSConfig(true);
                else if (configModalType === 'NASTAWNIA') setShowNastawniConfig(true);
                else setShowSMOKConfig(true);
              }}
              disabled={loading}
              style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                marginRight: 'auto'
              }}
            >
              ⚙️ Konfiguruj
            </button>
            {task.status === 'configured' && (
              <button
                type="button"
                className="btn"
                onClick={handlePassToCompletion}
                disabled={loading}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  marginRight: '8px'
                }}
              >
                📦 Przekaż do kompletacji
              </button>
            )}
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
              {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </button>
          </div>
        </form>
        
        {/* BOM Config Modal - Read Only Preview */}
        {showBOMConfig && (
          <BOMConfigModal
            task={task}
            onClose={() => setShowBOMConfig(false)}
            onSuccess={() => {
              setShowBOMConfig(false);
              onSuccess();
            }}
            readOnly={true}
          />
        )}

        {/* SMOK Config Modal */}
        {showSMOKConfig && (
          <SMOKConfigModal
            task={task}
            onClose={() => setShowSMOKConfig(false)}
            onSuccess={() => {
              setShowSMOKConfig(false);
              onSuccess();
            }}
          />
        )}

        {/* LCS Config Modal */}
        {showLCSConfig && (
          <LCSConfigModal
            task={task}
            onClose={() => setShowLCSConfig(false)}
            onSuccess={() => {
              setShowLCSConfig(false);
              onSuccess();
            }}
          />
        )}

        {/* Nastawnia Config Modal */}
        {showNastawniConfig && (
          <NastawniConfigModal
            task={task}
            onClose={() => setShowNastawniConfig(false)}
            onSuccess={() => {
              setShowNastawniConfig(false);
              onSuccess();
            }}
          />
        )}
      </div>
    </div>
  );
};
