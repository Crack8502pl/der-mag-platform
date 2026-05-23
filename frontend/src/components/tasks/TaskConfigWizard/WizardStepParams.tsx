/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/components/tasks/TaskConfigWizard/WizardStepParams.tsx
// Step 0: Configuration parameters form

import React from 'react';
import type { BomGroup } from '../../../services/bomGroup.service';
import type { ConfigGroup } from './TaskConfigWizard';

interface WizardStepParamsProps {
  configGroups: ConfigGroup[];
  configValues: Record<string, any>;
  selectedModels: Record<string, { checked: boolean; quantity: number }>;
  retentionDays: number;
  bomGroups: BomGroup[];
  onConfigChange: (paramName: string, value: any) => void;
  onSelectedModelsChange: (models: Record<string, { checked: boolean; quantity: number }>) => void;
  onRetentionDaysChange: (days: number) => void;
}

export const WizardStepParams: React.FC<WizardStepParamsProps> = ({
  configGroups,
  configValues,
  selectedModels,
  retentionDays,
  bomGroups,
  onConfigChange,
  onSelectedModelsChange,
  onRetentionDaysChange,
}) => {
  const getGroupIcon = (groupName: string): string => {
    const group = bomGroups.find(g => g.name === groupName);
    return group?.icon || '📦';
  };

  const getGroupStyle = (groupName: string): React.CSSProperties => {
    const group = bomGroups.find(g => g.name === groupName);
    if (group?.color) {
      return { borderLeft: `4px solid ${group.color}`, background: 'var(--card-bg)' };
    }
    return { background: 'var(--card-bg)' };
  };

  if (configGroups.length === 0) {
    return (
      <div>
        <div className="wizard-section">
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Brak pól konfiguracyjnych dla tego szablonu. Przejdź dalej, aby obliczyć BOM.
          </p>
        </div>

        {/* Retention days always visible */}
        <RetentionSection retentionDays={retentionDays} onRetentionDaysChange={onRetentionDaysChange} />
      </div>
    );
  }

  return (
    <div>
      {configGroups.map((group, idx) => (
        <div
          key={idx}
          style={{
            marginBottom: '20px',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            ...getGroupStyle(group.groupName),
          }}
        >
          <h4
            style={{
              margin: '0 0 15px 0',
              color: 'var(--text-primary)',
              fontSize: '16px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '20px' }}>{getGroupIcon(group.groupName)}</span>
            {group.groupName}
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {group.fields.map((field, fieldIdx) => (
              <div key={fieldIdx} className="form-group" style={{ marginBottom: 0 }}>
                <label>{field.label}</label>

                {field.type === 'number' && (
                  <input
                    type="number"
                    value={configValues[field.paramName] ?? field.defaultValue ?? 0}
                    onChange={e => onConfigChange(field.paramName, Number(e.target.value))}
                    placeholder="0"
                    min="0"
                  />
                )}

                {field.type === 'select' && (
                  <select
                    value={configValues[field.paramName] ?? ''}
                    onChange={e => onConfigChange(field.paramName, e.target.value)}
                  >
                    <option value="">Wybierz...</option>
                    {field.options?.map((opt, optIdx) => (
                      <option key={optIdx} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === 'model_picker' && field.materialItems && (
                  <>
                    <div className="data-table-container" style={{ marginTop: '8px' }}>
                      <table className="data-table data-table--compact">
                        <thead>
                          <tr>
                            <th className="table-cell-center" style={{ width: '50px' }}>✅</th>
                            <th>Materiał</th>
                            <th style={{ width: '140px' }}>Nr katalogowy</th>
                            <th className="table-cell-center" style={{ width: '100px' }}>Ilość</th>
                            <th className="table-cell-center" style={{ width: '80px' }}>Jedn.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {field.materialItems.map((matItem, matIdx) => {
                            const modelKey = `${field.paramName}_${matItem.id || matIdx}`;
                            const modelState = selectedModels[modelKey] || {
                              checked: false,
                              quantity: matItem.defaultQuantity,
                            };
                            const step = matItem.unit === 'szt' ? '1' : '0.01';
                            return (
                              <tr
                                key={matIdx}
                                style={{
                                  background: modelState.checked
                                    ? 'rgba(255, 107, 53, 0.08)'
                                    : 'transparent',
                                }}
                              >
                                <td className="table-cell-center">
                                  <input
                                    type="checkbox"
                                    checked={modelState.checked}
                                    onChange={e =>
                                      onSelectedModelsChange({
                                        ...selectedModels,
                                        [modelKey]: {
                                          checked: e.target.checked,
                                          quantity: modelState.quantity,
                                        },
                                      })
                                    }
                                  />
                                </td>
                                <td style={{ fontWeight: 500 }}>{matItem.materialName}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                  {matItem.catalogNumber || '-'}
                                </td>
                                <td className="table-cell-center">
                                  <input
                                    type="number"
                                    value={modelState.quantity}
                                    disabled={!modelState.checked}
                                    min="0"
                                    step={step}
                                    style={{
                                      width: '70px',
                                      textAlign: 'center',
                                      padding: '4px',
                                      backgroundColor: modelState.checked
                                        ? 'var(--bg-input)'
                                        : 'var(--bg-hover)',
                                      color: modelState.checked
                                        ? 'var(--text-primary)'
                                        : 'var(--text-muted)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '4px',
                                    }}
                                    onChange={e =>
                                      onSelectedModelsChange({
                                        ...selectedModels,
                                        [modelKey]: {
                                          checked: modelState.checked,
                                          quantity: Number(e.target.value),
                                        },
                                      })
                                    }
                                  />
                                </td>
                                <td className="table-cell-center" style={{ fontSize: '12px' }}>
                                  {matItem.unit}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Validation summary for model_picker */}
                    {field.limitParamName && (
                      <ModelPickerSummary
                        field={field}
                        configValues={configValues}
                        selectedModels={selectedModels}
                        groupName={group.groupName}
                      />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Retention days */}
      <RetentionSection retentionDays={retentionDays} onRetentionDaysChange={onRetentionDaysChange} />
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────

interface ModelPickerSummaryProps {
  field: ConfigGroup['fields'][number];
  configValues: Record<string, any>;
  selectedModels: Record<string, { checked: boolean; quantity: number }>;
  groupName: string;
}

const ModelPickerSummary: React.FC<ModelPickerSummaryProps> = ({
  field,
  configValues,
  selectedModels,
  groupName,
}) => {
  if (!field.limitParamName || !field.materialItems) return null;

  const limit = Number(configValues[field.limitParamName] ?? 0);
  const sum = field.materialItems.reduce((acc, matItem, matIdx) => {
    const key = `${field.paramName}_${matItem.id || matIdx}`;
    const state = selectedModels[key];
    return acc + (state?.checked ? state.quantity || 0 : 0);
  }, 0);

  const isOver = sum > limit;

  return (
    <div
      style={{
        marginTop: '8px',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '13px',
        backgroundColor: isOver ? 'rgba(245, 101, 101, 0.1)' : 'rgba(72, 187, 120, 0.1)',
        color: isOver ? 'var(--error, #f56565)' : 'var(--success, #48bb78)',
        border: `1px solid ${isOver ? 'rgba(245,101,101,0.3)' : 'rgba(72,187,120,0.3)'}`,
      }}
    >
      {groupName}: suma zaznaczonych <strong>{sum}</strong> / limit <strong>{limit}</strong>
      {isOver && <span style={{ marginLeft: '8px' }}>⚠️ Przekroczono limit!</span>}
    </div>
  );
};

interface RetentionSectionProps {
  retentionDays: number;
  onRetentionDaysChange: (days: number) => void;
}

const RETENTION_PRESETS = [7, 14, 21, 30, 60] as const;

const RetentionSection: React.FC<RetentionSectionProps> = ({ retentionDays, onRetentionDaysChange }) => (
  <div style={{
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    background: 'var(--card-bg)',
    marginBottom: '16px',
  }}>
    <h4 style={{
      margin: '0 0 12px 0',
      color: 'var(--text-primary)',
      fontSize: '16px',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      <span style={{ fontSize: '20px' }}>💾</span>
      Parametry zapisu
    </h4>
    <div>
      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
        Retencja nagrań
      </label>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {RETENTION_PRESETS.map(days => (
          <button
            key={days}
            type="button"
            onClick={() => onRetentionDaysChange(days)}
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: retentionDays === days ? 700 : 400,
              border: retentionDays === days
                ? '2px solid var(--primary-color)'
                : '1px solid var(--border-color)',
              background: retentionDays === days
                ? 'rgba(var(--primary-rgb, 59,130,246), 0.12)'
                : 'var(--bg-secondary)',
              color: retentionDays === days
                ? 'var(--primary-color)'
                : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {days} dni
          </button>
        ))}
      </div>
      {!RETENTION_PRESETS.includes(retentionDays as (typeof RETENTION_PRESETS)[number]) && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Wartość niestandardowa: <strong>{retentionDays} dni</strong>
        </div>
      )}
      <small style={{ display: 'block', marginTop: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
        Ile dni nagrań ma przechowywać rejestrator
      </small>
    </div>
  </div>
);
