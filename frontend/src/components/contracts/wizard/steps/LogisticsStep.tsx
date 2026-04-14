// src/components/contracts/wizard/steps/LogisticsStep.tsx
// Step: Logistics/shipping data collection

import React from 'react';
import type { WizardData, LogisticsData } from '../types/wizard.types';
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

  const handleChange = (field: keyof LogisticsData, value: string) => {
    onUpdate({
      logistics: {
        ...logistics,
        [field]: value,
      } as LogisticsData,
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

  const hasAddress = !!logistics.deliveryAddress?.trim();
  const hasPhone = !!logistics.contactPhone?.trim();

  return (
    <div className="wizard-step-content logistics-step">
      <h3>Dane logistyczne</h3>
      <p className="step-description">
        Podaj adres dostawy i dane kontaktowe odbiorcy. Pola oznaczone <span className="required-mark">*</span> są wymagane.
      </p>

      <div className="logistics-form">
        {/* Required fields */}
        <div className="form-section">
          <h4>📦 Adres i kontakt</h4>

          <div className="form-group">
            <label>
              Adres dostawy <span className="required-mark">*</span>
            </label>
            <textarea
              value={logistics.deliveryAddress || ''}
              onChange={(e) => handleChange('deliveryAddress', e.target.value)}
              placeholder="ul. Przykładowa 1, 00-001 Warszawa"
              rows={3}
              className={!hasAddress ? 'input-invalid' : ''}
            />
            {!hasAddress && (
              <span className="field-error">Adres dostawy jest wymagany</span>
            )}
          </div>

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

        {/* Preview */}
        {(hasAddress || hasPhone) && (
          <div className="logistics-preview">
            <h4>📋 Podgląd danych logistycznych</h4>
            <table className="preview-table">
              <tbody>
                {hasAddress && (
                  <tr>
                    <td className="preview-label">Adres dostawy</td>
                    <td>{logistics.deliveryAddress}</td>
                  </tr>
                )}
                {hasPhone && (
                  <tr>
                    <td className="preview-label">Telefon</td>
                    <td>{logistics.contactPhone}</td>
                  </tr>
                )}
                {logistics.contactPerson && (
                  <tr>
                    <td className="preview-label">Osoba kontaktowa</td>
                    <td>{logistics.contactPerson}</td>
                  </tr>
                )}
                {logistics.preferredDeliveryDate && (
                  <tr>
                    <td className="preview-label">Data dostawy</td>
                    <td>{new Date(logistics.preferredDeliveryDate).toLocaleDateString('pl-PL')}</td>
                  </tr>
                )}
                {logistics.shippingNotes && (
                  <tr>
                    <td className="preview-label">Uwagi</td>
                    <td>{logistics.shippingNotes}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
