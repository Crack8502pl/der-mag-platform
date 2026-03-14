// src/components/contracts/ShipmentRequestModal.tsx
// Modal do zlecania wysyłki materiałów podstawowych

import React, { useState } from 'react';
import type { SubsystemTask } from '../../services/contract.service';
import api from '../../services/api';

interface ShipmentRequestModalProps {
  task: SubsystemTask;
  shipmentTaskName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ShipmentRequestModal: React.FC<ShipmentRequestModalProps> = ({
  task,
  shipmentTaskName,
  onClose,
  onSuccess
}) => {
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    try {
      setLoading(true);
      await api.post(`/tasks/${task.taskNumber}/request-shipment`, {
        deliveryAddress: deliveryAddress.trim(),
        contactPhone: contactPhone.trim()
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd zlecania wysyłki');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📦 Zleć wysyłkę materiałów</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p>
            Zadanie: <strong>{task.taskNumber}</strong> — {task.taskName}
          </p>
          <p>
            Zostanie utworzone zadanie: <strong>{shipmentTaskName}</strong>
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="deliveryAddress">Adres dostawy *</label>
              <textarea
                id="deliveryAddress"
                className="form-control"
                rows={3}
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Ulica, numer, kod pocztowy, miejscowość"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="contactPhone">Telefon kontaktowy *</label>
              <input
                id="contactPhone"
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
        </div>
      </div>
    </div>
  );
};
