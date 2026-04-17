// src/components/contracts/wizard/steps/LogisticsStep.tsx
// Step: Logistics/shipping data collection

import React from 'react';
import type { WizardData, LogisticsData, DeliveryAddress } from '../types/wizard.types';
import { generateAllTasks } from '../utils/taskGenerator';
import './LogisticsStep.css';

interface Props {
  wizardData: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
}

/**
 * Auto-format Polish phone number to +48-XXX-XXX-XXX on blur
 */
const formatPhoneNumber = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9) {
    return `+48-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('48')) {
    const local = digits.slice(2);
    return `+48-${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  }
  return raw;
};

export const LogisticsStep: React.FC<Props> = ({ wizardData, onUpdate }) => {
  const logistics: Partial<LogisticsData> = wizardData.logistics || {};

  // Build task list for address-task assignment
  const allTasks = generateAllTasks(wizardData.subsystems, wizardData.liniaKolejowa);

  const deliveryAddresses: DeliveryAddress[] = logistics.deliveryAddresses || [];

  const handleChange = (field: keyof LogisticsData, value: string) => {
    onUpdate({
      logistics: {
        ...logistics,
        [field]: value,
      },
    });
  };

  const handlePhoneBlur = () => {
    if (logistics.contactPhone) {
      const formatted = formatPhoneNumber(logistics.contactPhone);
      if (formatted !== logistics.contactPhone) {
        handleChange('contactPhone', formatted);
      }
    }
  };

  const updateDeliveryAddress = (idx: number, patch: Partial<DeliveryAddress>) => {
    const updated = deliveryAddresses.map((d, i) => (i === idx ? { ...d, ...patch } : d));
    onUpdate({ logistics: { ...logistics, deliveryAddresses: updated } });
  };

  const addDeliveryAddress = () => {
    const updated = [...deliveryAddresses, { address: '', taskIds: [] }];
    onUpdate({ logistics: { ...logistics, deliveryAddresses: updated } });
  };

  const removeDeliveryAddress = (idx: number) => {
    const updated = deliveryAddresses.filter((_, i) => i !== idx);
    onUpdate({ logistics: { ...logistics, deliveryAddresses: updated.length > 0 ? updated : undefined } });
  };

  const toggleTaskForDelivery = (addrIdx: number, taskKey: string, checked: boolean) => {
    const current = deliveryAddresses[addrIdx];
    const taskIds = checked
      ? [...current.taskIds, taskKey]
      : current.taskIds.filter((id) => id !== taskKey);
    updateDeliveryAddress(addrIdx, { taskIds });
  };

  const hasPhone = !!logistics.contactPhone?.trim();

  return (
    <div className="wizard-step-content logistics-step">
      <h3>Dane logistyczne</h3>
      <p className="step-description">
        Podaj adresy dostawy i dane kontaktowe odbiorcy. Pola oznaczone <span className="required-mark">*</span> są wymagane.
      </p>

      <div className="logistics-form">
        {/* Delivery addresses */}
        <div className="form-section">
          <h4>📦 Adresy dostawy</h4>

          {deliveryAddresses.length === 0 && (
            <p className="delivery-empty-hint">Brak adresów dostawy. Kliknij poniżej, aby dodać.</p>
          )}

          {deliveryAddresses.map((delivery, idx) => (
            <div key={idx} className="delivery-address-item">
              <div className="delivery-address-header">
                <strong>Adres dostawy #{idx + 1}</strong>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => removeDeliveryAddress(idx)}
                >
                  🗑️ Usuń adres
                </button>
              </div>

              <div className="form-group">
                <label>Adres</label>
                <textarea
                  value={delivery.address}
                  onChange={(e) => updateDeliveryAddress(idx, { address: e.target.value })}
                  placeholder="ul. Przykładowa 1, 00-001 Warszawa"
                  rows={3}
                />
              </div>

              {allTasks.length > 0 && (
                <div className="form-group">
                  <label>Dotyczy zadań:</label>
                  <div className="task-selection-grid">
                    {allTasks.map((task, taskIdx) => {
                      const taskKey = `${task.subsystemType}-${taskIdx}`;
                      return (
                        <label key={taskKey} className="checkbox-item">
                          <input
                            type="checkbox"
                            checked={delivery.taskIds.includes(taskKey)}
                            onChange={(e) => toggleTaskForDelivery(idx, taskKey, e.target.checked)}
                          />
                          <span>{task.type} – {task.name || `Zadanie #${taskIdx + 1}`}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={addDeliveryAddress}
          >
            ➕ Dodaj adres dostawy
          </button>
        </div>

        {/* Contact */}
        <div className="form-section">
          <h4>📞 Dane kontaktowe</h4>

          <div className="form-row">
            <div className="form-group">
              <label>
                Telefon kontaktowy <span className="required-mark">*</span>
              </label>
              <input
                type="tel"
                value={logistics.contactPhone || ''}
                onChange={(e) => handleChange('contactPhone', e.target.value)}
                onBlur={handlePhoneBlur}
                placeholder="np. 500 123 456 lub +48-500-123-456"
                className={!hasPhone ? 'input-invalid' : ''}
              />
              {!hasPhone && (
                <span className="field-error">Telefon kontaktowy jest wymagany</span>
              )}
              <span className="field-hint">
                9-cyfrowy numer zostanie automatycznie sformatowany do +48-XXX-XXX-XXX
              </span>
            </div>

            <div className="form-group">
              <label>Osoba kontaktowa</label>
              <input
                type="text"
                value={logistics.contactPerson || ''}
                onChange={(e) => handleChange('contactPerson', e.target.value)}
                placeholder="Imię i nazwisko"
              />
            </div>
          </div>
        </div>

        {/* Optional fields */}
        <div className="form-section">
          <h4>📅 Opcjonalne</h4>

          <div className="form-row">
            <div className="form-group">
              <label>Preferowana data dostawy</label>
              <input
                type="date"
                value={logistics.preferredDeliveryDate || ''}
                onChange={(e) => handleChange('preferredDeliveryDate', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Uwagi do wysyłki</label>
            <textarea
              value={logistics.shippingNotes || ''}
              onChange={(e) => handleChange('shippingNotes', e.target.value)}
              placeholder="Dodatkowe instrukcje, godziny dostaw, wymogi specjalne..."
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
