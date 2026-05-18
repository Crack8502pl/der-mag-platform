// src/components/admin/RuleFormulaPreview.tsx
// Live preview component for BOM dependency rule formulas

import React from 'react';
import type { BomSubsystemTemplateItem } from '../../services/bomSubsystemTemplate.service';
import type {
  BomTemplateDependencyRule,
  BomTemplateDependencyRuleInput,
  BomTemplateDependencyRuleCondition
} from '../../services/bomTemplateDependencyRule.service';
import {
  generateHumanReadableFormula,
  calculateStoragePreviewTable,
  detectCircularReference
} from '../../utils/ruleFormulaGenerator';

interface RuleFormulaPreviewProps {
  inputs: BomTemplateDependencyRuleInput[];
  aggregationType: string;
  mathOperation: string;
  mathOperand: number | '';
  conditions: BomTemplateDependencyRuleCondition[];
  targetItemId: number | '';
  templateItems: BomSubsystemTemplateItem[];
  existingRules: BomTemplateDependencyRule[];
  storageDaysParam?: string;
  storageBitrateMbps?: number | '';
  ruleId?: number; // present id when editing
}

export const RuleFormulaPreview: React.FC<RuleFormulaPreviewProps> = ({
  inputs,
  aggregationType,
  mathOperation,
  mathOperand,
  conditions,
  targetItemId,
  templateItems,
  existingRules,
  storageDaysParam,
  storageBitrateMbps,
  ruleId
}) => {
  // Generate formula
  const formula = React.useMemo(() => {
    try {
      return generateHumanReadableFormula(
        {
          aggregationType,
          mathOperation,
          mathOperand,
          inputs,
          conditions,
          targetItemId,
          storageDaysParam,
          storageBitrateMbps
        },
        templateItems,
        existingRules
      );
    } catch (error) {
      return 'Błąd generowania formuły';
    }
  }, [aggregationType, mathOperation, mathOperand, inputs, conditions, targetItemId, templateItems, existingRules, storageDaysParam, storageBitrateMbps]);

  // Check for circular references
  const circularError = React.useMemo(() => {
    return detectCircularReference(ruleId, inputs, existingRules);
  }, [ruleId, inputs, existingRules]);

  // Calculate storage preview table if needed
  const storageTable = React.useMemo(() => {
    if (mathOperation === 'CALCULATE_STORAGE') {
      const bitrate = typeof storageBitrateMbps === 'number' ? storageBitrateMbps : 4;
      return calculateStoragePreviewTable(bitrate);
    }
    return null;
  }, [mathOperation, storageBitrateMbps]);

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Formula Banner */}
      <div
        style={{
          padding: '15px 20px',
          background: 'rgba(var(--primary-rgb, 59, 130, 246), 0.07)',
          borderLeft: '3px solid var(--primary-color)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '15px'
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
          💡 Co oblicza ta reguła
        </div>
        <div style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: '1.5' }}>
          {formula}
        </div>
      </div>

      {/* Storage Preview Table */}
      {storageTable && (
        <div
          style={{
            padding: '15px 20px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '15px'
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
            💾 Tabela podglądu pojemności (bitrate: {typeof storageBitrateMbps === 'number' ? storageBitrateMbps : 4} Mbps/kamerę)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-primary)' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500, borderBottom: '1px solid var(--border-color)' }}>
                    Kamery
                  </th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 500, borderBottom: '1px solid var(--border-color)' }}>
                    7 dni
                  </th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 500, borderBottom: '1px solid var(--border-color)' }}>
                    14 dni
                  </th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 500, borderBottom: '1px solid var(--border-color)' }}>
                    30 dni
                  </th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 500, borderBottom: '1px solid var(--border-color)' }}>
                    60 dni
                  </th>
                </tr>
              </thead>
              <tbody>
                {storageTable.map(row => (
                  <tr key={row.cameras} style={{ borderTop: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '5px 10px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {row.cameras} 📹
                    </td>
                    <td style={{ padding: '5px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {row.days7} TB
                    </td>
                    <td style={{ padding: '5px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {row.days14} TB
                    </td>
                    <td style={{ padding: '5px 10px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {row.days30} TB
                    </td>
                    <td style={{ padding: '5px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {row.days60} TB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Circular Reference Warning */}
      {circularError && (
        <div
          style={{
            padding: '12px 15px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 'var(--radius-md)',
            color: '#ef4444',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}
        >
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span>{circularError}</span>
        </div>
      )}
    </div>
  );
};
