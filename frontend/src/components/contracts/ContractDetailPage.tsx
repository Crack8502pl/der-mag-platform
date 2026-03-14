// src/components/contracts/ContractDetailPage.tsx
// Contract detail page

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BackButton } from '../common/BackButton';
import { ContractStatusBadge } from './ContractStatusBadge';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import { useAuth } from '../../hooks/useAuth';
import type { Contract, SubsystemTask } from '../../services/contract.service';
import api from '../../services/api';
import { ShipmentRequestModal } from './ShipmentRequestModal';
import './ContractListPage.css';

export const ContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAuth();
  const canCreateTasks =
    typeof hasPermission === 'function' ? hasPermission('tasks', 'create') : false;
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shipmentTask, setShipmentTask] = useState<SubsystemTask | null>(null);

  const canUpdate = hasPermission('contracts', 'update');
  const canApprove = hasPermission('contracts', 'approve');

  useEffect(() => {
    loadContract();
  }, [id]);

  const loadContract = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get(`/contracts/${id}`);
      
      setContract(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania kontraktu');
    } finally {
      setLoading(false);
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

  // Task types that do NOT get a shipment button
  const NO_SHIPMENT_TYPES = ['NASTAWNIA', 'LCS', 'CUID'];

  const canRequestShipment = (taskType: string): boolean => {
    return !NO_SHIPMENT_TYPES.includes(taskType);
  };

  const getShipmentTaskName = (taskType: string): string => {
    if (taskType === 'SZAFA_WEWNĘTRZNA') {
      return 'Kompletacja szafy wewnętrznej';
    }
    return 'Kompletacja szafy przejazdowej';
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

      {/* Subsystems Table - Nowy układ zgodny z grover-theme */}
      <div className="subsystems-card card">
        <div className="card-header">
          <h2>Podsystemy i Zadania</h2>
          <div className="subsystems-count">
            {contract.subsystems?.length || 0} podsystemów
          </div>
        </div>
        
        {(!contract.subsystems || contract.subsystems.length === 0) ? (
          <div className="empty-state">
            <p>Brak podsystemów dla tego kontraktu</p>
          </div>
        ) : (
          <div className="subsystems-table-wrapper">
            <table className="subsystems-table">
              <thead>
                <tr>
                  <th colSpan={2} className="table-title">
                    {contract.customName} - Struktura podsystemów
                  </th>
                </tr>
                <tr>
                  <th>Podsystem</th>
                  <th>Zadania</th>
                </tr>
              </thead>
              <tbody>
                {contract.subsystems.map((subsystem) => (
                  <tr key={subsystem.id}>
                    <td className="subsystem-cell">
                      <div className="subsystem-info">
                        <code className="subsystem-number">{subsystem.subsystemNumber}</code>
                        <span className="subsystem-type">{subsystem.systemType}</span>
                        {subsystem.ipPool && (
                          <span className="ip-pool-tag">🌐 {subsystem.ipPool}</span>
                        )}
                      </div>
                    </td>
                    <td className="tasks-cell">
                      {subsystem.tasks && subsystem.tasks.length > 0 ? (
                        <ul className="tasks-list">
                          {subsystem.tasks.map((task: SubsystemTask) => (
                            <li key={task.id}>
                              <code className="task-number">{task.taskNumber}</code>
                              <span className="task-name">{task.taskName}</span>
                              <span className={`task-status task-status--${(task.status || 'created').toLowerCase()}`}>
                                {task.status || 'CREATED'}
                              </span>
                              {canCreateTasks && canRequestShipment(task.taskType) && (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  title={`Zleć wysyłkę: ${getShipmentTaskName(task.taskType)}`}
                                  onClick={() => setShipmentTask(task)}
                                >
                                  📦 Zleć wysyłkę
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="no-tasks-text">Brak zadań</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {shipmentTask && canCreateTasks && (
        <ShipmentRequestModal
          task={shipmentTask}
          shipmentTaskName={getShipmentTaskName(shipmentTask.taskType)}
          onClose={() => setShipmentTask(null)}
          onSuccess={() => {
            setShipmentTask(null);
            loadContract();
          }}
        />
      )}
    </div>
  );
};
