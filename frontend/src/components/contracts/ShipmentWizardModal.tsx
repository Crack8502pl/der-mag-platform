// src/components/contracts/ShipmentWizardModal.tsx
// Modal for initiating shipment for all eligible tasks in a subsystem

import React, { useState } from 'react';
import type { Subsystem, SubsystemTask } from '../../services/contract.service';
import api from '../../services/api';

interface ShipmentWizardModalProps {
  subsystem: Subsystem;
  onClose: () => void;
  onSuccess: () => void;
}

const NO_SHIPMENT_TYPES = ['NASTAWNIA', 'LCS', 'CUID'];

const getEligibleTasks = (tasks: SubsystemTask[]): SubsystemTask[] =>
  tasks.filter((t) => !NO_SHIPMENT_TYPES.includes(t.taskType));

export const ShipmentWizardModal: React.FC<ShipmentWizardModalProps> = ({
  subsystem,
  onClose,
  onSuccess,
}) => {
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [taskErrors, setTaskErrors] = useState<string[]>([]);

  const eligibleTasks = getEligibleTasks(subsystem.tasks || []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!deliveryAddress.trim()) {
      setError('Adres dostawy jest wymagany');
      return;
    }
    if (!contactPhone.trim()) {
      setError('Telefon kontaktowy jest wymagany');
      return;
    }
    if (eligibleTasks.length === 0) {
      setError('Brak zadań kwalifikujących się do wysyłki');
      return;
    }

    try {
      setLoading(true);
      const results = await Promise.allSettled(
        eligibleTasks.map((task) =>
          api.post(`/tasks/${task.taskNumber}/request-shipment`, {
            deliveryAddress: deliveryAddress.trim(),
            contactPhone: contactPhone.trim(),
          })
        )
      );

      const failures = results
        .map((result, i) =>
          result.status === 'rejected'
            ? `${eligibleTasks[i].taskNumber}: ${(result.reason as any)?.response?.data?.message || 'Błąd zlecania wysyłki'}`
            : null
        )
        .filter((msg): msg is string => msg !== null);

      if (failures.length > 0) {
        setTaskErrors(failures);
        // If some succeeded, still call onSuccess to refresh; show errors too
        const successes = results.filter((r) => r.status === 'fulfilled').length;
        if (successes > 0) {
          onSuccess();
        }
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd zlecania wysyłki');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shipment-wizard-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="shipment-wizard-title">📦 Kreator wysyłki — {subsystem.subsystemNumber}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Zamknij">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p>
            Podsystem: <strong>{subsystem.subsystemNumber}</strong> —{' '}
            {subsystem.systemType}
          </p>

          {eligibleTasks.length === 0 ? (
            <div className="alert alert-error">
              Brak zadań kwalifikujących się do wysyłki w tym podsystemie.
            </div>
          ) : (
            <>
              <p>
                Wysyłka zostanie zlecona dla{' '}
                <strong>{eligibleTasks.length}</strong>{' '}
                {eligibleTasks.length === 1 ? 'zadania' : 'zadań'}:
              </p>
              <ul className="shipment-tasks-preview">
                {eligibleTasks.map((task) => (
                  <li key={task.id}>
                    <code>{task.taskNumber}</code> — {task.taskName}
                  </li>
                ))}
              </ul>

              {error && <div className="alert alert-error">{error}</div>}
              {taskErrors.length > 0 && (
                <div className="alert alert-error">
                  <p>Niektóre wysyłki nie powiodły się:</p>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {taskErrors.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="sw-deliveryAddress">Adres dostawy *</label>
                  <textarea
                    id="sw-deliveryAddress"
                    className="form-control"
                    rows={3}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Ulica, numer, kod pocztowy, miejscowość"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sw-contactPhone">Telefon kontaktowy *</label>
                  <input
                    id="sw-contactPhone"
                    type="tel"
                    className="form-control"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+48 000 000 000"
                    required
                  />
                </div>

                <div className="modal-actions">
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
                    {loading ? '⏳ Zlecanie...' : '📦 Zleć wysyłkę'}
                  </button>
                </div>
              </form>
            </>
          )}

          {eligibleTasks.length === 0 && (
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>
                Zamknij
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
