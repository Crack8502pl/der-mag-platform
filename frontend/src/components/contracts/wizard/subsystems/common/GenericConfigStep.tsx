import React from 'react';
import type { SubsystemConfigStepProps } from '../../types/wizard.types';
import { SUBSYSTEM_WIZARD_CONFIG } from '../../../../../config/subsystemWizardConfig';

export const GenericConfigStep: React.FC<SubsystemConfigStepProps> = ({
  subsystem,
  subsystemIndex,
  onUpdate
}) => {
  const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];

  const updateParams = (paramName: string, value: number | boolean | string) => {
    const params = (subsystem.params || {}) as Record<string, number | boolean | string>;
    const newParams = { ...params, [paramName]: value };
    onUpdate(subsystemIndex, { params: newParams as any });
  };

  const updateIpPool = (value: string) => {
    onUpdate(subsystemIndex, { ipPool: value.trim() });
  };

  const params = (subsystem.params || {}) as Record<string, number | boolean | string>;

  return (
    <div className="wizard-step-content">
      <h3>
        Konfiguracja: {config.label}
        {subsystem.isExisting && (
          <span className="badge badge-info" style={{ marginLeft: '10px', fontSize: '0.85em' }}>
            Istniejący podsystem
          </span>
        )}
      </h3>

      {subsystem.isExisting && (
        <div className="alert alert-warning">
          ⚠️ Typ podsystemu nie może być zmieniony. Możesz tylko edytować parametry i dodawać nowe zadania.
        </div>
      )}

      {/* IP Pool Field */}
      <div className="form-group">
        <label>Pula adresowa IP (opcjonalnie)</label>
        <input
          type="text"
          value={subsystem.ipPool || ''}
          onChange={(e) => updateIpPool(e.target.value)}
          placeholder="np. 192.168.1.0/24"
        />
        <small className="form-help">
          Format CIDR (np. 192.168.1.0/24). Każdy podsystem musi mieć unikalną pulę.
        </small>
      </div>

      {/* Dynamic Fields from Config */}
      {config.fields.map((field) => {
        const paramValue = params[field.name];

        // Check dependency - hide if dependsOn field is not checked
        if (field.dependsOn && !params[field.dependsOn]) {
          return null;
        }

        return (
          <div className="form-group" key={field.name}>
            {field.type === 'number' && (
              <>
                <label>{field.label}</label>
                <input
                  type="number"
                  min={0}
                  value={typeof paramValue === 'number' ? paramValue : 0}
                  onChange={(e) => updateParams(field.name, parseInt(e.target.value) || 0)}
                />
              </>
            )}
            
            {field.type === 'checkbox' && (
              <label className="checkbox-inline-group" htmlFor={`checkbox-${field.name}`}>
                <input
                  type="checkbox"
                  id={`checkbox-${field.name}`}
                  checked={typeof paramValue === 'boolean' ? paramValue : false}
                  onChange={(e) => updateParams(field.name, e.target.checked)}
                />
                <span>{field.label}</span>
              </label>
            )}
            
            {field.type === 'text' && (
              <>
                <label>{field.label}</label>
                <input
                  type="text"
                  value={typeof paramValue === 'string' ? paramValue : ''}
                  onChange={(e) => updateParams(field.name, e.target.value)}
                  placeholder={field.label}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
