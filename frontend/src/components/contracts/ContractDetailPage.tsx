// src/components/contracts/ContractDetailPage.tsx
// Contract detail page

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BackButton } from '../common/BackButton';
import { ContractStatusBadge } from './ContractStatusBadge';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import { useAuth } from '../../hooks/useAuth';
import type { Contract, Subsystem, SubsystemTask } from '../../services/contract.service';
import api from '../../services/api';
import { ShipmentWizardModal } from './ShipmentWizardModal';
import { TaskStatusBadge } from '../tasks/TaskStatusBadge';
import './ContractListPage.css';

interface UserOption {
  id: number;
  firstName: string;
  lastName: string;
}

export const ContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shipmentSubsystem, setShipmentSubsystem] = useState<Subsystem | null>(null);
  const [completionTask, setCompletionTask] = useState<SubsystemTask | null>(null);
  const [completionWorkers, setCompletionWorkers] = useState<UserOption[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | ''>('');
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionError, setCompletionError] = useState('');
  const [taskStatuses, setTaskStatuses] = useState<Map<string, string>>(new Map());

  const canCreateTasks =
    typeof hasPermission === 'function' ? hasPermission('tasks', 'create') : false;
  const canApprove = hasPermission('contracts', 'approve');
  const canCreateCompletion =
    typeof hasPermission === 'function' ? hasPermission('completion', 'update') : false;

  useEffect(() => {
    loadContract();
  }, [id]);

  const loadContract = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get(`/contracts/${id}`);
      const data: Contract = response.data.data;
      setContract(data);

      if (data?.subsystems) {
        const taskNumbers = data.subsystems
          .flatMap((s) => s.tasks || [])
          .map((t) => t.taskNumber);
        if (taskNumbers.length > 0) {
          syncTaskStatuses(taskNumbers);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania kontraktu');
    } finally {
      setLoading(false);
    }
  };

  const syncTaskStatuses = async (taskNumbers: string[]) => {
    try {
      const response = await api.get('/tasks', {
        params: { taskNumbers: taskNumbers.join(',') },
      });
      const statusMap = new Map<string, string>();
      response.data.data?.forEach((task: any) => {
        statusMap.set(task.taskNumber, task.status);
      });
      setTaskStatuses(statusMap);
    } catch (error) {
      // Non-critical — keep existing statuses from contract data
      console.warn('Failed to sync task statuses', { error, taskNumbers });
    }
  };

  const handleApprove = async () => {
    if (!contract || !confirm('Czy na pewno chcesz zatwierdzić ten kontrakt?')) return;
    
    try {
      await api.post(`/contracts/${contract.id}/approve`, {});
      loadContract();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd zatwierdzania kontraktu');
    }
  };

  const handleOpenCompletionModal = async (task: SubsystemTask) => {
    setCompletionTask(task);
    setCompletionError('');
    setSelectedWorkerId('');
    try {
      const response = await api.get('/users/managers');
      setCompletionWorkers(response.data.data || []);
    } catch {
      setCompletionWorkers([]);
      setCompletionError('Nie udało się załadować listy pracowników');
    }
  };

  const handleSendToCompletion = async () => {
    if (!completionTask || !selectedWorkerId) return;
    setCompletionLoading(true);
    setCompletionError('');
    try {
      const response = await api.post('/completion', {
        subsystemId: completionTask.subsystemId,
        generatedBomId: completionTask.bomId,
        assignedToId: selectedWorkerId,
      });
      setCompletionTask(null);
      if (response.data?.data?.id) {
        navigate(`/completion/${response.data.data.id}/scanner`);
      } else {
        loadContract();
      }
    } catch (err: any) {
      setCompletionError(err.response?.data?.message || 'Błąd przekazywania do kompletacji');
    } finally {
      setCompletionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="module-page">
        <BackButton to="/contracts" />
        <div className="loading">Ładowanie...</div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="module-page">
        <BackButton to="/contracts" />
        <div className="alert alert-error">{error || 'Kontrakt nie znaleziony'}</div>
      </div>
    );
  }

  return (
    <div className="module-page">
      <BackButton to="/contracts" />
      
      <div className="module-header">
        <div className="module-icon">
          <ModuleIcon name="contracts" emoji={MODULE_ICONS.contracts} size={36} />
        </div>
        <div>
          <h1>{contract.customName}</h1>
          <p className="subtitle">
            <code>{contract.contractNumber}</code>
          </p>
        </div>
      </div>

      {/* Contract Details Card */}
      <div className="contract-detail card">
        <div className="card-header">
          <h2>Dane kontraktu</h2>
          <div className="card-actions">
            {canApprove && contract.status === 'CREATED' && (
              <button className="btn btn-success" onClick={handleApprove}>
                ✅ Zatwierdź
              </button>
            )}
          </div>
        </div>
        
        <div className="detail-grid">
          <div className="detail-item">
            <label>Numer kontraktu</label>
            <div className="detail-value">
              <code>{contract.contractNumber}</code>
            </div>
          </div>
          
          <div className="detail-item">
            <label>Status</label>
            <div className="detail-value">
              <ContractStatusBadge status={contract.status} />
            </div>
          </div>
          
          <div className="detail-item">
            <label>Nazwa własna</label>
            <div className="detail-value">{contract.customName}</div>
          </div>
          
          <div className="detail-item">
            <label>Data zamówienia</label>
            <div className="detail-value">
              {new Date(contract.orderDate).toLocaleDateString('pl-PL')}
            </div>
          </div>
          
          <div className="detail-item">
            <label>Kod kierownika</label>
            <div className="detail-value">{contract.managerCode}</div>
          </div>
          
          <div className="detail-item">
            <label>Kierownik projektu</label>
            <div className="detail-value">
              {contract.projectManager 
                ? `${contract.projectManager.firstName} ${contract.projectManager.lastName} (${contract.projectManager.username})`
                : 'N/A'
              }
            </div>
          </div>
          
          {contract.jowiszRef && (
            <div className="detail-item">
              <label>Referencja Jowisz</label>
              <div className="detail-value">{contract.jowiszRef}</div>
            </div>
          )}
          
          <div className="detail-item">
            <label>Utworzono</label>
            <div className="detail-value">
              {new Date(contract.createdAt).toLocaleString('pl-PL')}
            </div>
          </div>
          
          <div className="detail-item">
            <label>Ostatnia aktualizacja</label>
            <div className="detail-value">
              {new Date(contract.updatedAt).toLocaleString('pl-PL')}
            </div>
          </div>
        </div>
      </div>

      {/* Subsystems Cards - grover/husky theme */}
      <div className="subsystems-card card">
        <div className="card-header">
          <h2>Podsystemy i Zadania</h2>
          <div className="subsystems-count">
            {contract.subsystems?.length || 0} podsystemów
          </div>
        </div>
        
        {(!contract.subsystems || contract.subsystems.length === 0) ? (
          <div className="empty-state subsystem-empty">
            <p>Brak podsystemów dla tego kontraktu</p>
          </div>
        ) : (
          <div className="subsystems-grid">
            {contract.subsystems.map((subsystem) => (
              <div key={subsystem.id} className="subsystem-card">
                <div className="subsystem-card-header">
                  <h3>
                    <ModuleIcon
                      name={MODULE_ICONS[subsystem.systemType.toLowerCase()] ? subsystem.systemType.toLowerCase() : 'subsystems'}
                      emoji={MODULE_ICONS[subsystem.systemType.toLowerCase()] ?? MODULE_ICONS.subsystems}
                      size={20}
                    />
                    <code>{subsystem.subsystemNumber}</code>
                    <span className="subsystem-type">{subsystem.systemType}</span>
                    {subsystem.ipPool && (
                      <span className="ip-pool-badge">🌐 {subsystem.ipPool}</span>
                    )}
                  </h3>
                  <div className="subsystem-card-actions">
                    {canCreateTasks && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setShipmentSubsystem(subsystem)}
                      >
                        📦 Kreator wysyłki
                      </button>
                    )}
                  </div>
                </div>
                <div className="subsystem-card-body">
                  {subsystem.tasks && subsystem.tasks.length > 0 ? (
                    <ul className="subsystem-tasks-list">
                      {subsystem.tasks.map((task: SubsystemTask) => {
                        const actualStatus =
                          taskStatuses.get(task.taskNumber) || task.status || 'CREATED';
                        return (
                          <li key={task.id} className="subsystem-task-item">
                            <div className="task-info">
                              <code>{task.taskNumber}</code>
                              <span className="task-name">{task.taskName}</span>
                            </div>
                            <TaskStatusBadge status={actualStatus.toLowerCase()} />
                            {canCreateCompletion && actualStatus.toUpperCase() === 'BOM_GENERATED' && task.bomId && !task.completionOrderId && (
                              <button
                                className="btn btn-primary btn-sm"
                                title="Przekaż do kompletacji"
                                onClick={() => handleOpenCompletionModal(task)}
                              >
                                ✅ Przekaż do kompletacji
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="subsystem-empty">Brak zadań</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {shipmentSubsystem && canCreateTasks && (
        <ShipmentWizardModal
          subsystem={shipmentSubsystem}
          onClose={() => setShipmentSubsystem(null)}
          onSuccess={() => {
            setShipmentSubsystem(null);
            loadContract();
          }}
        />
      )}

      {completionTask && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>📦 Przekaż do kompletacji</h2>
              <button className="modal-close" onClick={() => setCompletionTask(null)}>✕</button>
            </div>
            <div className="modal-form">
              <p>
                Zadanie: <strong>{completionTask.taskName}</strong>{' '}
                (<code>{completionTask.taskNumber}</code>)
              </p>
              <div className="form-group">
                <label>Przypisz do pracownika:</label>
                <select
                  className="filter-select"
                  value={selectedWorkerId}
                  onChange={e => setSelectedWorkerId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">-- Wybierz pracownika --</option>
                  {completionWorkers.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.firstName} {w.lastName}
                    </option>
                  ))}
                </select>
              </div>
              {completionError && (
                <div className="alert alert-error">{completionError}</div>
              )}
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setCompletionTask(null)}
                  disabled={completionLoading}
                >
                  Anuluj
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSendToCompletion}
                  disabled={!selectedWorkerId || completionLoading}
                >
                  {completionLoading ? 'Przekazywanie...' : '✅ Przekaż do kompletacji'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
