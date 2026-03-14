// src/components/tasks/SMOKConfigModal.tsx
// Modal for configuring SMOK-A system parameters

import React, { useState, useEffect } from 'react';
import bomSubsystemTemplateService from '../../services/bomSubsystemTemplate.service';
import bomGroupService, { type BomGroup } from '../../services/bomGroup.service';
import { warehouseStockService } from '../../services/warehouseStock.service';
import taskService from '../../services/task.service';
import type { BomSubsystemTemplate, BomSubsystemTemplateItem } from '../../services/bomSubsystemTemplate.service';
import type { Task } from '../../types/task.types';
import type { WarehouseStock } from '../../types/warehouseStock.types';
import '../../styles/grover-theme.css';

// Constants
const WAREHOUSE_STOCK_PAGE_SIZE = 50;

interface Props {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
}

interface ConfigField {
  paramName: string;
  label: string;
  type: 'number' | 'select' | 'model_picker';
  options?: Array<{ value: string; label: string }>;
  defaultValue?: any;
  materialItems?: BomSubsystemTemplateItem[]; // For model_picker type
  limitParamName?: string; // Reference to the associated number field for validation
}

interface ConfigGroup {
  groupName: string;
  fields: ConfigField[];
}

export const SMOKConfigModal: React.FC<Props> = ({ task, onClose, onSuccess }) => {
  const [template, setTemplate] = useState<BomSubsystemTemplate | null>(null);
  const [bomGroups, setBomGroups] = useState<BomGroup[]>([]);
  const [configGroups, setConfigGroups] = useState<ConfigGroup[]>([]);
  const [configValues, setConfigValues] = useState<Record<string, any>>({});
  const [selectedModels, setSelectedModels] = useState<Record<string, { checked: boolean; quantity: number }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Warehouse stock options (keep pole and battery options)
  const [poleOptions, setPoleOptions] = useState<WarehouseStock[]>([]);
  const [batteryOptions, setBatteryOptions] = useState<BomSubsystemTemplate[]>([]);

  useEffect(() => {
    loadConfiguration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      setError('');

      // Load existing config from task metadata
      const existingConfig = task.metadata?.configParams || {};
      setConfigValues(existingConfig);
      
      // Initialize selectedModels from saved config
      if (existingConfig.selectedModels) {
        // Handle backward compatibility: migrate boolean to new format
        const migrated: Record<string, { checked: boolean; quantity: number }> = {};
        for (const [key, val] of Object.entries(existingConfig.selectedModels)) {
          if (typeof val === 'boolean') {
            // Old format: migrate boolean to new format
            migrated[key] = { checked: val, quantity: 1 };
          } else if (typeof val === 'object' && val !== null && 'checked' in val && 'quantity' in val) {
            migrated[key] = val as { checked: boolean; quantity: number };
          } else {
            // Fallback for unexpected format
            migrated[key] = { checked: !!val, quantity: 1 };
          }
        }
        setSelectedModels(migrated);
      }

      // Extract subsystem type and task variant from task metadata
      const subsystemType = task.metadata?.subsystemType || task.taskType?.code;
      const taskVariant = task.metadata?.taskVariant || null;

      if (!subsystemType) {
        setError('Brak informacji o typie podsystemu w zadaniu');
        setLoading(false);
        return;
      }

      // Load BOM groups from database
      await loadBomGroups();

      // Load template
      const tmpl = await bomSubsystemTemplateService.getTemplateFor(subsystemType, taskVariant);
      
      if (!tmpl) {
        setError(`Nie znaleziono szablonu BOM dla ${subsystemType}${taskVariant ? ` - ${taskVariant}` : ''}`);
        setLoading(false);
        return;
      }

      setTemplate(tmpl);

      // Load warehouse stock options in parallel (only pole and battery, not cameras)
      await Promise.all([
        loadPoleOptions(),
        loadBatteryOptions()
      ]);

      // Analyze template and build config groups
      const groups = analyzeTemplate(tmpl);
      setConfigGroups(groups);

      // Initialize selectedModels defaults for model_picker fields that are not yet in state
      setSelectedModels(prev => {
        const defaults: Record<string, { checked: boolean; quantity: number }> = {};
        groups.forEach(group => {
          group.fields.forEach(field => {
            if (field.type === 'model_picker' && field.materialItems) {
              field.materialItems.forEach((matItem, matIdx) => {
                const modelKey = `${field.paramName}_${matItem.id || matIdx}`;
                if (!(modelKey in prev)) {
                  defaults[modelKey] = {
                    checked: false,
                    quantity: matItem.defaultQuantity || 1
                  };
                }
              });
            }
          });
        });
        return { ...defaults, ...prev };
      });

    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania konfiguracji');
    } finally {
      setLoading(false);
    }
  };

  const loadBomGroups = async () => {
    try {
      const groups = await bomGroupService.getAll();
      setBomGroups(groups);
    } catch (err) {
      console.error('Error loading BOM groups:', err);
    }
  };

  const loadPoleOptions = async () => {
    try {
      const response = await warehouseStockService.getAll({ search: 'słup' }, 1, WAREHOUSE_STOCK_PAGE_SIZE);
      setPoleOptions(response.data || []);
    } catch (err) {
      console.error('Error loading pole options:', err);
    }
  };

  const loadBatteryOptions = async () => {
    try {
      const templates = await bomSubsystemTemplateService.getAll({ subsystemType: 'AKUMULATOR' });
      setBatteryOptions(templates || []);
    } catch (err) {
      console.error('Error loading battery options:', err);
    }
  };

  const analyzeTemplate = (tmpl: BomSubsystemTemplate): ConfigGroup[] => {
    const groupsMap = new Map<string, ConfigField[]>();
    
    // Collect all unique configParamNames grouped by groupName
    for (const item of tmpl.items) {
      const groupName = item.groupName || 'Inne';
      
      if (!groupsMap.has(groupName)) {
        groupsMap.set(groupName, []);
      }
      
      const fields = groupsMap.get(groupName)!;
      
      // Add quantity field for FROM_CONFIG items
      // Fix Issue 3: Make paramName unique per group to avoid shared fields
      if (item.quantitySource === 'FROM_CONFIG' && item.configParamName) {
        const uniqueParamName = `${groupName}_${item.configParamName}`;
        const existingField = fields.find(f => f.paramName === uniqueParamName);
        if (!existingField) {
          fields.push({
            paramName: uniqueParamName,
            label: getFieldLabel(item.configParamName),
            type: 'number',
            defaultValue: item.defaultQuantity
          });
        }
      }
      
      // Add quantity field for PER_UNIT items
      // Fix Issue 3: Make paramName unique per group to avoid shared fields
      if (item.quantitySource === 'PER_UNIT' && item.configParamName) {
        const uniqueParamName = `${groupName}_${item.configParamName}`;
        const existingField = fields.find(f => f.paramName === uniqueParamName);
        if (!existingField) {
          fields.push({
            paramName: uniqueParamName,
            label: getFieldLabel(item.configParamName),
            type: 'number',
            defaultValue: item.defaultQuantity
          });
        }
      }
    }
    
    // Add model/type selection fields based on group
    groupsMap.forEach((fields, groupName) => {
      // Match groups dynamically based on group name patterns
      if (groupName.toLowerCase().includes('kamera') || groupName.toLowerCase().includes('lpr')) {
        // Get all material items from this group in the template
        const groupItems = tmpl.items.filter(i => (i.groupName || 'Inne') === groupName);
        if (groupItems.length > 0) {
          // Find the associated number field for validation (e.g., iloscKamerOgolnych)
          let limitParamName: string | undefined;
          
          // Look for a number field in this group that represents the total count
          const numberField = fields.find(f => f.type === 'number');
          if (numberField) {
            limitParamName = numberField.paramName;
          }
          
          fields.push({
            paramName: `${groupName}_selectedModels`,
            label: 'Wybierz modele',
            type: 'model_picker',
            materialItems: groupItems,
            limitParamName
          });
        }
      } else if (groupName.toLowerCase().includes('słup')) {
        fields.push({
          paramName: 'typSlupu',
          label: 'Typ słupa',
          type: 'select',
          options: poleOptions.map(pole => ({
            value: String(pole.id),
            label: pole.materialName
          }))
        });
      } else if (groupName.toLowerCase().includes('akumulator')) {
        fields.push({
          paramName: 'pojemnoscAkumulatora',
          label: 'Pojemność akumulatora',
          type: 'select',
          options: batteryOptions.map(bat => ({
            value: String(bat.id),
            label: bat.templateName
          }))
        });
      }
    });
    
    // Convert to array
    const groups: ConfigGroup[] = [];
    groupsMap.forEach((fields, groupName) => {
      groups.push({ groupName, fields });
    });
    
    return groups;
  };

  const getFieldLabel = (paramName: string): string => {
    const labels: Record<string, string> = {
      iloscKamerOgolnych: 'Ilość Kamer Ogólnych',
      iloscKamerLPR: 'Ilość Kamer LPR',
      iloscSlupow: 'Ilość Słupów',
      // Add more mappings as needed
    };
    return labels[paramName] || paramName;
  };

  const getGroupIcon = (groupName: string): string => {
    // Find the group in bomGroups by name
    const group = bomGroups.find(g => g.name === groupName);
    return group?.icon || '📦';
  };

  const getGroupStyle = (groupName: string): React.CSSProperties => {
    // Find the group in bomGroups by name
    const group = bomGroups.find(g => g.name === groupName);
    if (group?.color) {
      return {
        borderLeft: `4px solid ${group.color}`,
        background: 'var(--card-bg)'
      };
    }
    return {
      background: 'var(--card-bg)'
    };
  };

  const handleChange = (paramName: string, value: any) => {
    setConfigValues(prev => ({ ...prev, [paramName]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      // Validate all groups before saving
      let hasErrors = false;
      const errorMessages: string[] = [];
      
      for (const group of configGroups) {
        for (const field of group.fields) {
          if (field.type === 'model_picker' && field.limitParamName && field.materialItems) {
            const limit = configValues[field.limitParamName] ?? 0;
            const sum = field.materialItems.reduce((acc, matItem, matIdx) => {
              const key = `${field.paramName}_${matItem.id || matIdx}`;
              const state = selectedModels[key];
              return acc + (state?.checked ? (state.quantity || 0) : 0);
            }, 0);
            
            if (sum > limit) {
              hasErrors = true;
              errorMessages.push(`${group.groupName}: suma zaznaczonych (${sum}) przekracza limit (${limit})`);
            }
          }
        }
      }
      
      if (hasErrors) {
        setError(`Błędy walidacji:\n${errorMessages.join('\n')}`);
        setSaving(false);
        return;
      }

      // Update task metadata with new config params
      await taskService.update(task.taskNumber, {
        metadata: {
          ...task.metadata,
          configParams: {
            ...configValues,
            selectedModels
          }
        }
      });

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd zapisywania konfiguracji');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}
      >
        <div className="modal-header">
          <h2>⚙️ Konfiguracja SMOK-A</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {loading && (
          <div className="modal-form">
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
              Ładowanie konfiguracji...
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="modal-form">
            <div className="alert alert-error">{error}</div>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={onClose}>Zamknij</button>
            </div>
          </div>
        )}

        {!loading && !error && template && (
          <>
            <div className="modal-form">
              {/* Template Info */}
              <div style={{ 
                padding: '15px', 
                background: 'var(--card-bg)', 
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                      {template.subsystemType}
                      {template.taskVariant && <span style={{ color: 'var(--text-secondary)' }}> - {template.taskVariant}</span>}
                    </h3>
                    <p style={{ margin: '5px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      {template.templateName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Configuration Groups */}
              {configGroups.map((group, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    marginBottom: '20px',
                    padding: '15px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    ...getGroupStyle(group.groupName)
                  }}
                >
                  <h4 style={{ 
                    margin: '0 0 15px 0',
                    color: 'var(--text-primary)',
                    fontSize: '16px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
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
                            onChange={(e) => handleChange(field.paramName, Number(e.target.value))}
                            placeholder="0"
                            min="0"
                          />
                        )}
                        {field.type === 'select' && (
                          <select
                            value={configValues[field.paramName] ?? ''}
                            onChange={(e) => handleChange(field.paramName, e.target.value)}
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
                                    const modelState = selectedModels[modelKey] || { checked: false, quantity: matItem.defaultQuantity };
                                    const step = matItem.unit === 'szt' ? '1' : '0.01';
                                    return (
                                      <tr key={matIdx} style={{
                                        background: modelState.checked ? 'rgba(255, 107, 53, 0.08)' : 'transparent'
                                      }}>
                                        <td className="table-cell-center">
                                          <input 
                                            type="checkbox" 
                                            checked={modelState.checked}
                                            onChange={(e) => {
                                              setSelectedModels(prev => ({
                                                ...prev,
                                                [modelKey]: {
                                                  checked: e.target.checked,
                                                  quantity: modelState.quantity
                                                }
                                              }));
                                            }}
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
                                              backgroundColor: modelState.checked ? 'var(--bg-input)' : 'var(--bg-hover)',
                                              color: modelState.checked ? 'var(--text-primary)' : 'var(--text-muted)',
                                              border: '1px solid var(--border-color)',
                                              borderRadius: '4px'
                                            }}
                                            onChange={(e) => {
                                              const newQuantity = Number(e.target.value);
                                              setSelectedModels(prev => ({
                                                ...prev,
                                                [modelKey]: {
                                                  checked: modelState.checked,
                                                  quantity: newQuantity
                                                }
                                              }));
                                            }}
                                          />
                                        </td>
                                        <td className="table-cell-center">{matItem.unit}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            {/* Validation summary */}
                            {field.limitParamName && (() => {
                              const limit = configValues[field.limitParamName] ?? 0;
                              const sum = field.materialItems.reduce((acc, matItem, matIdx) => {
                                const key = `${field.paramName}_${matItem.id || matIdx}`;
                                const state = selectedModels[key];
                                return acc + (state?.checked ? (state.quantity || 0) : 0);
                              }, 0);
                              const isOver = sum > limit;
                              return (
                                <div style={{ 
                                  marginTop: '8px', 
                                  fontSize: '13px', 
                                  color: isOver ? 'var(--error)' : 'var(--text-secondary)',
                                  padding: '8px 12px',
                                  backgroundColor: isOver ? 'rgba(245, 101, 101, 0.1)' : 'rgba(72, 187, 120, 0.1)',
                                  borderRadius: '6px',
                                  border: `1px solid ${isOver ? 'var(--error)' : 'var(--success)'}`
                                }}>
                                  {isOver ? '⚠️' : '✅'} Suma zaznaczonych: <strong>{sum}</strong> / {limit}
                                  {isOver && <span style={{ marginLeft: '8px' }}> — przekroczono limit!</span>}
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={saving}
              >
                Anuluj
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || (() => {
                  // Check for validation errors in real-time
                  for (const group of configGroups) {
                    for (const field of group.fields) {
                      if (field.type === 'model_picker' && field.limitParamName && field.materialItems) {
                        const limit = configValues[field.limitParamName] ?? 0;
                        const sum = field.materialItems.reduce((acc, matItem, matIdx) => {
                          const key = `${field.paramName}_${matItem.id || matIdx}`;
                          const state = selectedModels[key];
                          return acc + (state?.checked ? (state.quantity || 0) : 0);
                        }, 0);
                        if (sum > limit) return true;
                      }
                    }
                  }
                  return false;
                })()}
                style={{ backgroundColor: '#10b981' }}
              >
                {saving ? 'Zapisywanie...' : '💾 Zapisz konfigurację'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
