// src/components/admin/RulePipelineView.tsx
// Visual pipeline view for BOM dependency rule flow: Inputs → Aggregation → Math → Conditions → Target

import React, { useState } from 'react';
import type { BomSubsystemTemplateItem } from '../../services/bomSubsystemTemplate.service';
import type {
  BomTemplateDependencyRule,
  BomTemplateDependencyRuleInput,
} from '../../services/bomTemplateDependencyRule.service';
import { AGGREGATION_DESCRIPTIONS, MATH_DESCRIPTIONS } from '../../utils/ruleFormulaGenerator';

const MAX_ITEM_LABEL_LENGTH = 22;
const MAX_RULE_LABEL_LENGTH = 18;

interface RulePipelineViewProps {
  rule: BomTemplateDependencyRule;
  templateItems: BomSubsystemTemplateItem[];
  existingRules: BomTemplateDependencyRule[];
}

export const RulePipelineView: React.FC<RulePipelineViewProps> = ({
  rule,
  templateItems,
  existingRules,
}) => {
  const [expanded, setExpanded] = useState(false);

  const getInputLabel = (input: BomTemplateDependencyRuleInput): string => {
    if (input.inputType === 'ITEM' && input.sourceItemId) {
      const item = templateItems.find(i => i.id === input.sourceItemId);
      return item
        ? item.materialName.substring(0, MAX_ITEM_LABEL_LENGTH) + (item.materialName.length > MAX_ITEM_LABEL_LENGTH ? '…' : '')
        : `ID:${input.sourceItemId}`;
    }
    if (input.inputType === 'RULE_RESULT' && input.sourceRuleId) {
      const sourceRule = existingRules.find(existingRule => existingRule.id === input.sourceRuleId);
      return sourceRule ? `⇒ ${sourceRule.ruleName.substring(0, MAX_RULE_LABEL_LENGTH)}` : `Reguła #${input.sourceRuleId}`;
    }
    return '?';
  };

  const aggDesc = AGGREGATION_DESCRIPTIONS[rule.aggregationType];
  const mathDesc = MATH_DESCRIPTIONS[rule.mathOperation];
  const targetItem = templateItems.find(i => i.id === rule.targetItemId);

  const blockStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-secondary)',
    fontSize: '12px',
    color: 'var(--text-primary)',
    minWidth: '110px',
    maxWidth: '170px',
    textAlign: 'center' as const,
  };

  const arrowStyle: React.CSSProperties = {
    color: 'var(--text-muted)',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    userSelect: 'none',
  };

  return (
    <div style={{ marginTop: '8px' }}>
      <button
        type="button"
        onClick={() => setExpanded(previousExpanded => !previousExpanded)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '12px',
          color: 'var(--primary-color)',
          padding: '2px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {expanded ? '▾' : '▸'} Pokaż przepływ reguły
      </button>

      {expanded && (
        <div style={{
          marginTop: '10px',
          padding: '14px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          overflowX: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 'max-content' }}>

            {/* Inputs block */}
            <div style={{ ...blockStyle, borderColor: '#3b82f6', minWidth: '140px' }}>
              <div style={{ fontWeight: 600, fontSize: '11px', color: '#3b82f6', marginBottom: '6px' }}>
                📥 WEJŚCIA
              </div>
              {(rule.inputs ?? []).length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>brak</div>
              ) : (
                (rule.inputs ?? []).map((input, index) => (
                  <div key={index} style={{ marginBottom: '3px', fontSize: '11px' }}>
                    {getInputLabel(input)}
                    {input.inputMultiplier !== 1 && (
                      <span style={{ color: 'var(--text-muted)' }}> ×{input.inputMultiplier}</span>
                    )}
                  </div>
                ))
              )}
            </div>

            <div style={arrowStyle}>→</div>

            {/* Aggregation block */}
            <div style={{ ...blockStyle, borderColor: '#8b5cf6' }}>
              <div style={{ fontWeight: 600, fontSize: '11px', color: '#8b5cf6', marginBottom: '4px' }}>
                🧮 AGREGACJA
              </div>
              <div>
                {aggDesc ? `${aggDesc.icon} ${aggDesc.label}` : rule.aggregationType}
              </div>
            </div>

            {rule.mathOperation && rule.mathOperation !== 'NONE' && (
              <>
                <div style={arrowStyle}>→</div>
                {/* Math block */}
                <div style={{ ...blockStyle, borderColor: '#f59e0b' }}>
                  <div style={{ fontWeight: 600, fontSize: '11px', color: '#f59e0b', marginBottom: '4px' }}>
                    🔢 MATH
                  </div>
                  <div>
                    {mathDesc ? `${mathDesc.icon} ${mathDesc.label}` : rule.mathOperation}
                  </div>
                  {rule.mathOperand != null && rule.mathOperation !== 'CALCULATE_STORAGE' && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      arg: {rule.mathOperand}
                    </div>
                  )}
                </div>
              </>
            )}

            {(rule.conditions ?? []).length > 0 && (
              <>
                <div style={arrowStyle}>→</div>
                {/* Conditions block */}
                <div style={{ ...blockStyle, borderColor: '#10b981' }}>
                  <div style={{ fontWeight: 600, fontSize: '11px', color: '#10b981', marginBottom: '4px' }}>
                    ⚖️ WARUNKI
                  </div>
                  {(rule.conditions ?? []).map((condition, index) => (
                    <div key={index} style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                      {condition.comparisonOperator} {condition.compareValue} → {condition.resultValue}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={arrowStyle}>→</div>

            {/* Target block */}
            <div style={{ ...blockStyle, borderColor: '#ef4444', background: 'rgba(239,68,68,0.05)' }}>
              <div style={{ fontWeight: 600, fontSize: '11px', color: '#ef4444', marginBottom: '4px' }}>
                🎯 CEL
              </div>
              <div style={{ fontSize: '11px' }}>
                {targetItem ? targetItem.materialName.substring(0, 25) + (targetItem.materialName.length > 25 ? '…' : '') : '—'}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
