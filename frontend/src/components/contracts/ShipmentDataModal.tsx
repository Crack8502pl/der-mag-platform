// src/components/contracts/ShipmentDataModal.tsx
// Modal wyświetlający dane wysyłkowe dla podsystemu

import React from 'react';
import type { Subsystem, SubsystemTask } from '../../services/contract.service';

interface CameraPoint {
  id: number;
  name: string;
  poleType: string | null;
}

interface ShipmentDataModalProps {
  subsystem: Subsystem;
  onClose: () => void;
}

const SHIPMENT_TASK_TYPES = ['KOMPLETACJA_WYSYLKI', 'KOMPLETACJA_SZAF'];

export const ShipmentDataModal: React.FC<ShipmentDataModalProps> = ({ subsystem, onClose }) => {
  const tasks = subsystem.tasks || [];

  // Zadania wysyłkowe
  const shipmentTasks = tasks.filter(
    (t) => SHIPMENT_TASK_TYPES.includes((t.taskType || '').toUpperCase())
  );

  // Zadania źródłowe (nie wysyłkowe)
  const sourceTasks = tasks.filter(
    (t) => !SHIPMENT_TASK_TYPES.includes((t.taskType || '').toUpperCase())
  );

  const renderCameraPoints = (cameraPoints: CameraPoint[]) => {
    if (!cameraPoints || cameraPoints.length === 0) return null;
    return (
      <div className="shipment-camera-points">
        <strong>Punkty kamerowe ({cameraPoints.length}):</strong>
        <ul className="camera-points-list">
          {cameraPoints.map((cp) => (
            <li key={cp.id}>
              <code>{cp.name}</code>
              {cp.poleType && <span className="pole-type-badge"> — {cp.poleType}</span>}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderShipmentTask = (task: SubsystemTask) => {
    const meta = task.metadata || {};
    const cameraPoints: CameraPoint[] = Array.isArray(meta.cameraPoints) ? meta.cameraPoints : [];
    return (
      <div key={task.id} className="shipment-data-task">
        <div className="shipment-task-header">
          <code>{task.taskNumber}</code>
          <span className="shipment-task-name">{task.taskName}</span>
          <span className="shipment-task-type">{task.taskType}</span>
        </div>

        {(meta.deliveryAddress || meta.contactPhone) && (
          <div className="shipment-delivery-info">
            {meta.deliveryAddress && (
              <div>
                <strong>Adres dostawy:</strong> {meta.deliveryAddress}
              </div>
            )}
            {meta.contactPhone && (
              <div>
                <strong>Telefon:</strong> {meta.contactPhone}
              </div>
            )}
          </div>
        )}

        {meta.cabinetType && (
          <div>
            <strong>Typ szafy:</strong> {meta.cabinetType}
          </div>
        )}

        {meta.poleQuantity != null && meta.poleQuantity > 0 && (
          <div>
            <strong>Ilość słupów:</strong> {meta.poleQuantity}
            {meta.poleType && ` (${meta.poleType})`}
            {meta.poleProductInfo && ` — ${meta.poleProductInfo}`}
          </div>
        )}

        {renderCameraPoints(cameraPoints)}

        {meta.sourceTaskNumber && (
          <div className="shipment-source-ref">
            <small>
              Źródło: <code>{meta.sourceTaskNumber}</code>
              {meta.sourceTaskType && ` (${meta.sourceTaskType})`}
            </small>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ maxWidth: 640, maxHeight: '80vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>📋 Dane wysyłkowe — {subsystem.subsystemNumber}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Zamknij">✕</button>
        </div>

        <div className="modal-body" style={{ padding: '16px' }}>
          <div className="subsystem-info" style={{ marginBottom: 16 }}>
            <strong>Typ:</strong> {subsystem.systemType}
            {subsystem.ipPool && (
              <span style={{ marginLeft: 12 }}>
                <strong>Pula IP:</strong> {subsystem.ipPool}
              </span>
            )}
          </div>

          {shipmentTasks.length === 0 ? (
            <div className="alert alert-info">
              Brak zleconych wysyłek dla tego podsystemu.
            </div>
          ) : (
            <>
              <h4 style={{ marginBottom: 8 }}>Zadania wysyłkowe ({shipmentTasks.length})</h4>
              <div className="shipment-tasks-list">
                {shipmentTasks.map(renderShipmentTask)}
              </div>
            </>
          )}

          {sourceTasks.length > 0 && (
            <>
              <h4 style={{ marginTop: 16, marginBottom: 8 }}>
                Wszystkie zadania podsystemu ({sourceTasks.length})
              </h4>
              <ul className="subsystem-tasks-list">
                {sourceTasks.map((task) => (
                  <li key={task.id} className="subsystem-task-item">
                    <code>{task.taskNumber}</code>
                    <span style={{ marginLeft: 8 }}>{task.taskName}</span>
                    <span className="task-selection-type" style={{ marginLeft: 8 }}>
                      {task.taskType}
                    </span>
                    {task.metadata?.substatus && (
                      <span style={{ marginLeft: 8, fontSize: '0.85em', color: 'var(--text-muted)' }}>
                        [{task.metadata.substatus.replace(/_/g, ' ')}]
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
