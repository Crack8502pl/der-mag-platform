// src/components/tasks/SMOKConfigModal.tsx
// Modal for configuring SMOK-A system parameters

import React, { useState, useEffect } from 'react';
import bomSubsystemTemplateService from '../../services/bomSubsystemTemplate.service';
import { warehouseStockService } from '../../services/warehouseStock.service';
import taskService from '../../services/task.service';
import type { BomSubsystemTemplate } from '../../services/bomSubsystemTemplate.service';
import type { Task } from '../../types/task.types';
import type { WarehouseStock } from '../../types/warehouseStock.types';

// Constants
const GROUP_NAMES = {
  CAMERA_GENERAL: 'Kamera Ogólna',
  CAMERA_LPR: 'Kamera LPR',
  POLES: 'Słupy',
  BATTERY: 'Akumulator',
  OTHER: 'Inne'
} as const;

const WAREHOUSE_STOCK_PAGE_SIZE = 50;

interface Props {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
}

interface ConfigField {
  paramName: string;
  label: string;
  type: 'number' | 'select';
  options?: Array<{ value: string; label: string }>;
  defaultValue?: any;
}

interface ConfigGroup {
  groupName: string;
  fields: ConfigField[];
}

export const SMOKConfigModal: React.FC<Props> = ({ task, onClose, onSuccess }) => {
  const [template, setTemplate] = useState<BomSubsystemTemplate | null>(null);
  const [configGroups, setConfigGroups] = useState<ConfigGroup[]>([]);
  const [configValues, setConfigValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Warehouse stock options
  const [cameraOptions, setCameraOptions] = useState<WarehouseStock[]>([]);
  const [cameraLPROptions, setCameraLPROptions] = useState<WarehouseStock[]>([]);
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

      // Extract subsystem type and task variant from task metadata
      const subsystemType = task.metadata?.subsystemType || task.taskType?.code;
      const taskVariant = task.metadata?.taskVariant || null;

      if (!subsystemType) {
        setError('Brak informacji o typie podsystemu w zadaniu');
        setLoading(false);
        return;
      }

      // Load template
      const tmpl = await bomSubsystemTemplateService.getTemplateFor(subsystemType, taskVariant);
      
      if (!tmpl) {
        setError(`Nie znaleziono szablonu BOM dla ${subsystemType}${taskVariant ? ` - ${taskVariant}` : ''}`);
        setLoading(false);
        return;
      }

      setTemplate(tmpl);

      // Load warehouse stock options in parallel
      await Promise.all([
        loadCameraOptions(),
        loadCameraLPROptions(),
        loadPoleOptions(),
        loadBatteryOptions()
      ]);

      // Analyze template and build config groups
      const groups = analyzeTemplate(tmpl);
      setConfigGroups(groups);

    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania konfiguracji');
    } finally {
      setLoading(false);
    }
  };

  const loadCameraOptions = async () => {
    try {
      const response = await warehouseStockService.getAll({ search: 'kamera' }, 1, WAREHOUSE_STOCK_PAGE_SIZE);
      setCameraOptions(response.data || []);
    } catch (err) {
      console.error('Error loading camera options:', err);
    }
  };

  const loadCameraLPROptions = async () => {
    try {
      const response = await warehouseStockService.getAll({ search: 'kamera LPR' }, 1, WAREHOUSE_STOCK_PAGE_SIZE);
      setCameraLPROptions(response.data || []);
    } catch (err) {
      console.error('Error loading camera LPR options:', err);
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
      const groupName = item.groupName || GROUP_NAMES.OTHER;
      
      if (!groupsMap.has(groupName)) {
        groupsMap.set(groupName, []);
      }
      
      const fields = groupsMap.get(groupName)!;
      
      // Add quantity field for FROM_CONFIG items
      if (item.quantitySource === 'FROM_CONFIG' && item.configParamName) {
        const existingField = fields.find(f => f.paramName === item.configParamName);
        if (!existingField) {
          fields.push({
            paramName: item.configParamName,
            label: getFieldLabel(item.configParamName),
            type: 'number',
            defaultValue: item.defaultQuantity
          });
        }
      }
      
      // Add quantity field for PER_UNIT items
      if (item.quantitySource === 'PER_UNIT' && item.configParamName) {
        const existingField = fields.find(f => f.paramName === item.configParamName);
        if (!existingField) {
          fields.push({
            paramName: item.configParamName,
            label: getFieldLabel(item.configParamName),
            type: 'number',
            defaultValue: item.defaultQuantity
          });
        }
      }
    }
    
    // Add model/type selection fields based on group
    groupsMap.forEach((fields, groupName) => {
      if (groupName === GROUP_NAMES.CAMERA_GENERAL) {
        fields.push({
          paramName: 'modelKameryOgolnej',
          label: 'Model kamery',
          type: 'select',
          options: cameraOptions.map(cam => ({
            value: String(cam.id),
            label: `${cam.materialName} (${cam.catalogNumber})`
          }))
        });
      } else if (groupName === GROUP_NAMES.CAMERA_LPR) {
        fields.push({
          paramName: 'modelKameryLPR',
          label: 'Model Kamery LPR',
          type: 'select',
          options: cameraLPROptions.map(cam => ({
            value: String(cam.id),
            label: `${cam.materialName} (${cam.catalogNumber})`
          }))
        });
      } else if (groupName === GROUP_NAMES.POLES) {
        fields.push({
          paramName: 'typSlupu',
          label: 'Typ słupa',
          type: 'select',
          options: poleOptions.map(pole => ({
            value: String(pole.id),
            label: pole.materialName
          }))
        });
      } else if (groupName === GROUP_NAMES.BATTERY) {
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
    const icons: Record<string, string> = {
      [GROUP_NAMES.CAMERA_GENERAL]: '📹',
      [GROUP_NAMES.CAMERA_LPR]: '🚗',
      [GROUP_NAMES.POLES]: '🏗️',
      [GROUP_NAMES.BATTERY]: '🔋',
      [GROUP_NAMES.OTHER]: '📦'
    };
    return icons[groupName] || '📦';
  };

  const handleChange = (paramName: string, value: any) => {
    setConfigValues(prev => ({ ...prev, [paramName]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      // Update task metadata with new config params
      await taskService.update(task.taskNumber, {
        metadata: {
          ...task.metadata,
          configParams: configValues
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
    <div className="modal-overlay" onClick={onClose}>
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
                    background: 'var(--card-bg)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
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
                disabled={saving}
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
