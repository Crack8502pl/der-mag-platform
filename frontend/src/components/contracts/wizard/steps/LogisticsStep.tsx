// src/components/contracts/wizard/steps/LogisticsStep.tsx
// Step: Logistics/shipping data collection – multiple delivery addresses

import React from 'react';
import type { WizardData, LogisticsData, DeliveryAddress, OrderEmailsConfig } from '../types/wizard.types';
import { generateAllTasks } from '../utils/taskGenerator';
import './LogisticsStep.css';

interface Props {
  wizardData: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
}

/**
 * Auto-format Polish phone number to +48-XXX-XXX-XXX on blur.
 * Accepts 9 raw digits or 11 digits starting with "48".
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

  // Collect all task keys already assigned in addresses BEFORE the given index
  const getAssignedBefore = (addrIdx: number): Set<string> => {
    const assigned = new Set<string>();
    deliveryAddresses.slice(0, addrIdx).forEach((addr) => {
      addr.taskIds.forEach((id) => assigned.add(id));
    });
    return assigned;
  };

  const updateAddress = (idx: number, patch: Partial<DeliveryAddress>) => {
    const updated = deliveryAddresses.map((d, i) => (i === idx ? { ...d, ...patch } : d));
    onUpdate({ logistics: { ...logistics, deliveryAddresses: updated } });
  };

  const addDeliveryAddress = () => {
    const newAddr: DeliveryAddress = {
      id: crypto.randomUUID(),
      address: '',
      contactPhone: '',
      contactPerson: '',
      taskIds: [],
    };
    onUpdate({ logistics: { ...logistics, deliveryAddresses: [...deliveryAddresses, newAddr] } });
  };

  const removeDeliveryAddress = (idx: number) => {
    const updated = deliveryAddresses.filter((_, i) => i !== idx);
    onUpdate({ logistics: { ...logistics, deliveryAddresses: updated } });
  };

  const toggleTask = (addrIdx: number, taskKey: string, checked: boolean) => {
    const current = deliveryAddresses[addrIdx];
    const taskIds = checked
      ? [...current.taskIds, taskKey]
      : current.taskIds.filter((id) => id !== taskKey);
    updateAddress(addrIdx, { taskIds });
  };

  const handlePhoneBlur = (addrIdx: number, raw: string) => {
    const formatted = formatPhoneNumber(raw);
    if (formatted !== raw) {
      updateAddress(addrIdx, { contactPhone: formatted });
    }
  };

  const handleLogisticsField = (
    field: keyof Pick<LogisticsData, 'shippingNotes' | 'preferredDeliveryDate'>,
    value: string
  ) => {
    onUpdate({ logistics: { ...logistics, [field]: value } });
  };

  const handleEmailField = (field: keyof OrderEmailsConfig, value: string) => {
    onUpdate({
      logistics: {
        ...logistics,
        orderEmails: { ...logistics.orderEmails, [field]: value } as OrderEmailsConfig,
      },
    });
  };

  return (
    <div className="wizard-step-content logistics-step">
      <h3>📦 Dane logistyczne</h3>
      <p className="step-description">
        Podaj adresy dostawy i dane kontaktowe odbiorcy. Pola oznaczone{' '}
        <span className="required-mark">*</span> są wymagane.
      </p>

      <div className="logistics-form">
        {/* Delivery addresses */}
        <div className="form-section">
          <div className="delivery-section-header">
            <h4>📍 Adresy dostawy</h4>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addDeliveryAddress}>
              ➕ Dodaj adres
            </button>
          </div>

          {deliveryAddresses.length === 0 && (
            <p className="delivery-empty-hint">Brak adresów dostawy. Kliknij powyżej, aby dodać.</p>
          )}

          {deliveryAddresses.map((delivery, idx) => {
            const assignedBefore = getAssignedBefore(idx);
            const availableTasks = allTasks.filter((_task, taskIdx) => {
              const key = `${allTasks[taskIdx].subsystemType}-${taskIdx}`;
              return !assignedBefore.has(key);
            });

            return (
              <div key={delivery.id || idx} className="delivery-address-card">
                <div className="delivery-address-header">
                  <span className="delivery-address-title">Adres {idx + 1}</span>
                  <button
                    type="button"
                    className="remove-address-btn"
                    onClick={() => removeDeliveryAddress(idx)}
                    title="Usuń adres"
                  >
                    ✕ Usuń
                  </button>
                </div>

                {/* Contact info per address */}
                <div className="form-subsection">
                  <div className="form-subsection-title">📞 Dane kontaktowe</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>
                        Telefon kontaktowy <span className="required-mark">*</span>
                      </label>
                      <input
                        type="tel"
                        value={delivery.contactPhone}
                        onChange={(e) => updateAddress(idx, { contactPhone: e.target.value })}
                        onBlur={(e) => handlePhoneBlur(idx, e.target.value)}
                        placeholder="+48-XXX-XXX-XXX"
                        className={!delivery.contactPhone.trim() ? 'input-invalid' : ''}
                      />
                      {!delivery.contactPhone.trim() && (
                        <span className="field-error">Telefon jest wymagany</span>
                      )}
                      <span className="field-hint">9-cyfrowy numer → auto-format +48-XXX-XXX-XXX</span>
                    </div>

                    <div className="form-group">
                      <label>Osoba kontaktowa</label>
                      <input
                        type="text"
                        value={delivery.contactPerson}
                        onChange={(e) => updateAddress(idx, { contactPerson: e.target.value })}
                        placeholder="Imię i nazwisko"
                      />
                    </div>
                  </div>
                </div>

                {/* Address field */}
                <div className="form-group">
                  <label>Adres</label>
                  <textarea
                    value={delivery.address}
                    onChange={(e) => updateAddress(idx, { address: e.target.value })}
                    placeholder="ul. Przykładowa 1, 00-001 Warszawa"
                    rows={3}
                  />
                </div>

                {/* Task assignment */}
                {allTasks.length > 0 && (
                  <div className="task-list-section">
                    <div className="task-list-hint">
                      Lista Zadań: do zaznaczenia
                      {idx > 0 && '. Nie wyświetlamy wyżej zaznaczonych'}
                    </div>
                    {availableTasks.length === 0 ? (
                      <p className="task-list-empty">
                        Wszystkie zadania są już przypisane do wcześniejszych adresów.
                      </p>
                    ) : (
                      availableTasks.map((task) => {
                        const globalTaskIdx = allTasks.indexOf(task);
                        const taskKey = `${task.subsystemType}-${globalTaskIdx}`;
                        return (
                          <label key={taskKey} className="task-checkbox-item">
                            <input
                              type="checkbox"
                              checked={delivery.taskIds.includes(taskKey)}
                              onChange={(e) => toggleTask(idx, taskKey, e.target.checked)}
                            />
                            <span>
                              {task.number && task.number !== task.name ? `${task.number} – ` : ''}
                              {task.name || `Zadanie #${globalTaskIdx + 1}`}
                              {task.subsystemType ? ` (${task.subsystemType})` : ''}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
                onChange={(e) => handleLogisticsField('preferredDeliveryDate', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Uwagi do wysyłki</label>
            <textarea
              value={logistics.shippingNotes || ''}
              onChange={(e) => handleLogisticsField('shippingNotes', e.target.value)}
              placeholder="Dodatkowe instrukcje, godziny dostaw, wymogi specjalne..."
              rows={3}
            />
          </div>
        </div>

        {/* Email configuration for orders */}
        <div className="form-section">
          <h4>📧 Adresy e-mail dla zamówień</h4>
          <p className="step-description" style={{ fontSize: '13px', marginBottom: '16px' }}>
            Opcjonalnie: Określ adresy e-mail dla automatycznych powiadomień o zamówieniach
          </p>

          <div className="form-row">
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📹</span> Zamówienia kamer
              </label>
              <input
                type="email"
                value={logistics.orderEmails?.cameras || ''}
                onChange={(e) => handleEmailField('cameras', e.target.value)}
                placeholder="kamery@firma.pl"
              />
              <span className="field-hint">Kamery IP, analogowe, akcesoria kamerowe</span>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🔌</span> Switche / urządzenia sieciowe
              </label>
              <input
                type="email"
                value={logistics.orderEmails?.switches || ''}
                onChange={(e) => handleEmailField('switches', e.target.value)}
                placeholder="siec@firma.pl"
              />
              <span className="field-hint">Switche, routery, konwertery, moduły SFP</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>💾</span> Rejestratory
              </label>
              <input
                type="email"
                value={logistics.orderEmails?.recorders || ''}
                onChange={(e) => handleEmailField('recorders', e.target.value)}
                placeholder="rejestratory@firma.pl"
              />
              <span className="field-hint">Rejestratory NVR, DVR, dyski HDD</span>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📦</span> Zamówienia ogólne
              </label>
              <input
                type="email"
                value={logistics.orderEmails?.general || ''}
                onChange={(e) => handleEmailField('general', e.target.value)}
                placeholder="zamowienia@firma.pl"
              />
              <span className="field-hint">Kable, akcesoria, elementy montażowe</span>
            </div>
          </div>

          <div
            className="form-group"
            style={{
              padding: '12px 16px',
              background: 'rgba(255, 193, 7, 0.08)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              borderRadius: '8px',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🏭</span> Osoba obsługująca magazyn
            </label>
            <input
              type="email"
              value={logistics.orderEmails?.warehouse || ''}
              onChange={(e) => handleEmailField('warehouse', e.target.value)}
              placeholder="magazyn@firma.pl"
            />
            <span className="field-hint">
              ⚠️ <strong>Uwaga:</strong> Osoba nie występuje w systemie – otrzyma tylko powiadomienia
              e-mail o wydaniach i rezerwacjach
            </span>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📝</span> Uwagi dotyczące powiadomień
            </label>
            <textarea
              value={logistics.orderEmails?.notes || ''}
              onChange={(e) => handleEmailField('notes', e.target.value)}
              placeholder="Dodatkowe informacje o harmonogramach powiadomień, preferencjach kontaktu..."
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
