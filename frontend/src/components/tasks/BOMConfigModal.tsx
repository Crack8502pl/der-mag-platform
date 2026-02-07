// src/components/tasks/BOMConfigModal.tsx
// Modal for configuring BOM for a task using subsystem templates

import React, { useState, useEffect } from 'react';
import bomSubsystemTemplateService from '../../services/bomSubsystemTemplate.service';
import { warehouseStockService } from '../../services/warehouseStock.service';
import type { BomSubsystemTemplate, BomSubsystemTemplateItem } from '../../services/bomSubsystemTemplate.service';
import type { WarehouseStock } from '../../types/warehouseStock.types';
import type { Task } from '../../types/task.types';

interface Props {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
}

interface ResolvedItem extends BomSubsystemTemplateItem {
  resolvedQuantity: number;
}

export const BOMConfigModal: React.FC<Props> = ({ task, onClose, onSuccess }) => {
  const [template, setTemplate] = useState<BomSubsystemTemplate | null>(null);
  const [resolvedItems, setResolvedItems] = useState<ResolvedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [configParams, setConfigParams] = useState<Record<string, any>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [additionalItems, setAdditionalItems] = useState<ResolvedItem[]>([]);

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      setError('');

      // Extract subsystem type and task variant from task metadata
      const subsystemType = task.metadata?.subsystemType || task.taskType?.code;
      const taskVariant = task.metadata?.taskVariant || null;

      if (!subsystemType) {
        setError('Brak informacji o typie podsystemu w zadaniu');
        setLoading(false);
        return;
      }

      // Load config params from task metadata
      if (task.metadata?.configParams) {
        setConfigParams(task.metadata.configParams);
      }

      // Load template
      const tmpl = await bomSubsystemTemplateService.getTemplateFor(subsystemType, taskVariant);
      
      if (!tmpl) {
        setError(`Nie znaleziono szablonu BOM dla ${subsystemType}${taskVariant ? ` - ${taskVariant}` : ''}`);
        setLoading(false);
        return;
      }

      setTemplate(tmpl);
      resolveQuantities(tmpl, task.metadata?.configParams || {});
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania szablonu');
    } finally {
      setLoading(false);
    }
  };

  const resolveQuantities = (tmpl: BomSubsystemTemplate, params: Record<string, any>) => {
    const itemQuantities = new Map<number, number>();
    const resolved: ResolvedItem[] = [];

    // Sort items to process dependencies correctly
    const sortedItems = [...tmpl.items].sort((a, b) => {
      if (a.quantitySource === 'DEPENDENT' && b.quantitySource !== 'DEPENDENT') return 1;
      if (a.quantitySource !== 'DEPENDENT' && b.quantitySource === 'DEPENDENT') return -1;
      return a.sortOrder - b.sortOrder;
    });

    for (const item of sortedItems) {
      let quantity = item.defaultQuantity;

      switch (item.quantitySource) {
        case 'FROM_CONFIG':
          if (item.configParamName && params[item.configParamName] !== undefined) {
            quantity = Number(params[item.configParamName]) || item.defaultQuantity;
          }
          break;

        case 'PER_UNIT':
          if (item.configParamName && params[item.configParamName] !== undefined) {
            quantity = item.defaultQuantity * Number(params[item.configParamName]);
          }
          break;

        case 'DEPENDENT':
          if (item.dependsOnItemId && itemQuantities.has(item.dependsOnItemId)) {
            const baseQuantity = itemQuantities.get(item.dependsOnItemId)!;
            quantity = evaluateFormula(baseQuantity, item.dependencyFormula || '* 1');
          }
          break;

        case 'FIXED':
        default:
          quantity = item.defaultQuantity;
          break;
      }

      if (item.id) {
        itemQuantities.set(item.id, quantity);
      }
      
      resolved.push({
        ...item,
        resolvedQuantity: quantity
      });
    }

    setResolvedItems(resolved);
  };

  const evaluateFormula = (base: number, formula: string): number => {
    try {
      const match = formula.match(/([*+\-/])\s*(\d+(?:\.\d+)?)/);
      if (match) {
        const [, operator, value] = match;
        const numValue = parseFloat(value);
        switch (operator) {
          case '*': return base * numValue;
          case '+': return base + numValue;
          case '-': return base - numValue;
          case '/': return base / numValue;
        }
      }
      return base;
    } catch {
      return base;
    }
  };

  const handleApply = async () => {
    if (!template) return;

    try {
      setApplying(true);
      setError('');

      await bomSubsystemTemplateService.applyToTask(
        template.id,
        task.id,
        configParams
      );

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd stosowania szablonu');
    } finally {
      setApplying(false);
    }
  };

  const getQuantitySourceBadge = (source: string) => {
    const badges = {
      FIXED: { text: '📌 STAŁA', color: '#10b981' },
      FROM_CONFIG: { text: '⚙️ KONFIG.', color: '#f59e0b' },
      PER_UNIT: { text: '🔄 PER UNIT', color: '#3b82f6' },
      DEPENDENT: { text: '🔗 ZALEŻNA', color: '#8b5cf6' }
    };
    const badge = badges[source as keyof typeof badges] || badges.FIXED;
    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: badge.color + '20',
        color: badge.color,
        whiteSpace: 'nowrap'
      }}>
        {badge.text}
      </span>
    );
  };

  const groupedItems = resolvedItems.reduce((groups, item) => {
    const group = item.groupName || 'Inne';
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, ResolvedItem[]>);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '1000px', maxHeight: '90vh', overflow: 'auto' }}
      >
        <div className="modal-header">
          <h2>🔧 Konfiguracja BOM</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {loading && (
          <div className="modal-form">
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
              Ładowanie szablonu BOM...
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
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: 'var(--primary-color)20',
                    color: 'var(--primary-color)'
                  }}>
                    v{template.version}
                  </span>
                </div>
              </div>

              {/* Material Groups */}
              {Object.entries(groupedItems).map(([groupName, items]) => (
                <div key={groupName} style={{ marginBottom: '20px' }}>
                  <h4 style={{ 
                    color: 'var(--text-primary)', 
                    marginBottom: '10px',
                    fontSize: '16px',
                    fontWeight: 600
                  }}>
                    {groupName} ({items.length})
                  </h4>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>Nr</th>
                          <th>Materiał</th>
                          <th style={{ width: '100px' }}>Ilość</th>
                          <th style={{ width: '80px' }}>Jedn.</th>
                          <th style={{ width: '140px' }}>Źródło</th>
                          <th style={{ width: '60px' }}>IP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={item.id || idx}>
                            <td>{idx + 1}</td>
                            <td>
                              <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                {item.materialName}
                              </div>
                              {item.catalogNumber && (
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  {item.catalogNumber}
                                </div>
                              )}
                            </td>
                            <td>
                              <strong style={{ color: 'var(--primary-color)' }}>
                                {item.resolvedQuantity}
                              </strong>
                            </td>
                            <td>{item.unit}</td>
                            <td>{getQuantitySourceBadge(item.quantitySource)}</td>
                            <td style={{ textAlign: 'center' }}>
                              {item.requiresIp && <span style={{ fontSize: '18px' }}>🌐</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div style={{ 
                padding: '15px', 
                background: 'var(--card-bg)', 
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                gap: '20px',
                flexWrap: 'wrap'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Łącznie pozycji</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {resolvedItems.length}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Wymaga IP</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--primary-color)' }}>
                    {resolvedItems.filter(i => i.requiresIp).length}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Stałe</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#10b981' }}>
                    {resolvedItems.filter(i => i.quantitySource === 'FIXED').length}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Z konfiguracji</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#f59e0b' }}>
                    {resolvedItems.filter(i => i.quantitySource === 'FROM_CONFIG').length}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={applying}
              >
                Anuluj
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleApply}
                disabled={applying}
              >
                {applying ? 'Stosowanie...' : '✅ Zastosuj do zadania'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
