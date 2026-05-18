// frontend/src/components/tasks/TaskConfigWizard/WizardStepBom.tsx
// Step 1: BOM items preview (read-only)

import React from 'react';
import type { BomResolveResult, ResolvedBomItem } from '../../../services/bomResolver.service';
import type { BomGroup } from '../../../services/bomGroup.service';

interface WizardStepBomProps {
  resolvedBom: BomResolveResult;
  bomGroups: BomGroup[];
}

export const WizardStepBom: React.FC<WizardStepBomProps> = ({ resolvedBom, bomGroups }) => {
  const getGroupStyle = (groupName: string) => {
    const group = bomGroups.find(g => g.name === groupName);
    return {
      color: group?.color || 'var(--text-primary)',
      icon: group?.icon || '📦',
      backgroundColor: group?.color ? `${group.color}15` : 'var(--bg-secondary)',
      borderColor: group?.color || 'var(--border-color)',
    };
  };

  const getQuantitySourceBadge = (source: string) => {
    const badges: Record<string, { text: string; color: string }> = {
      FIXED: { text: '📌 STAŁA', color: '#10b981' },
      FROM_CONFIG: { text: '⚙️ KONFIG.', color: '#f59e0b' },
      PER_UNIT: { text: '🔄 PER UNIT', color: '#3b82f6' },
      DEPENDENT: { text: '🔗 ZALEŻNA', color: '#8b5cf6' },
    };
    const badge = badges[source] || badges.FIXED;
    return (
      <span
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 600,
          backgroundColor: badge.color + '20',
          color: badge.color,
          whiteSpace: 'nowrap',
        }}
      >
        {badge.text}
      </span>
    );
  };

  // Group items by groupName
  const groupedItems = resolvedBom.items.reduce(
    (acc, item) => {
      const key = item.groupName || 'Inne';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, ResolvedBomItem[]>
  );

  return (
    <div>
      {/* Template info */}
      <div
        style={{
          padding: '14px',
          background: 'var(--card-bg)',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>
            {resolvedBom.templateName || 'Nieznany szablon'}
          </div>
          {resolvedBom.templateVersion !== null && (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              v{Number(resolvedBom.templateVersion).toFixed(2)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'rgba(255, 107, 53, 0.15)',
              color: 'var(--primary-color)',
            }}
          >
            📷 Wykryte kamery: {resolvedBom.cameraCount}
          </div>
          {resolvedBom.needsRecorder && (
            <div
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: 'rgba(66, 153, 225, 0.15)',
                color: 'var(--info, #4299e1)',
              }}
            >
              🖥️ Wymaga rejestratora
            </div>
          )}
        </div>
      </div>

      {/* Warnings */}
      {resolvedBom.warnings.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          {resolvedBom.warnings.map((w, i) => (
            <div key={i} className="wizard-warning">
              ⚠️ {w}
            </div>
          ))}
        </div>
      )}

      {/* BOM groups */}
      {Object.entries(groupedItems).map(([groupName, items]) => {
        const groupStyle = getGroupStyle(groupName);
        return (
          <div key={groupName} style={{ marginBottom: '20px' }}>
            <h4
              style={{
                color: groupStyle.color,
                marginBottom: '10px',
                fontSize: '16px',
                fontWeight: 600,
                padding: '10px 15px',
                backgroundColor: groupStyle.backgroundColor,
                borderRadius: '8px',
                border: `2px solid ${groupStyle.borderColor}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '20px' }}>{groupStyle.icon}</span>
              {groupName} ({items.length})
            </h4>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center', verticalAlign: 'middle' }}>Nr</th>
                    <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>Materiał</th>
                    <th style={{ width: '100px', textAlign: 'center', verticalAlign: 'middle' }}>Ilość</th>
                    <th style={{ width: '80px', textAlign: 'center', verticalAlign: 'middle' }}>Jedn.</th>
                    <th style={{ width: '140px', textAlign: 'center', verticalAlign: 'middle' }}>Źródło</th>
                    <th style={{ width: '60px', textAlign: 'center', verticalAlign: 'middle' }}>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{idx + 1}</td>
                      <td style={{ textAlign: 'left', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {item.materialName}
                        </div>
                        {item.catalogNumber && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {item.catalogNumber}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <strong style={{ color: 'var(--primary-color)' }}>
                          {item.resolvedQuantity}
                        </strong>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{item.unit}</td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        {getQuantitySourceBadge(item.quantitySource)}
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        {item.requiresIp && <span style={{ fontSize: '18px' }}>🌐</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Summary stats */}
      <div
        style={{
          padding: '15px',
          background: 'var(--card-bg)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Łącznie pozycji</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {resolvedBom.items.length}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Wymaga IP</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--primary-color)' }}>
            {resolvedBom.items.filter(i => i.requiresIp).length}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Stałe</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#10b981' }}>
            {resolvedBom.items.filter(i => i.quantitySource === 'FIXED').length}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Z konfiguracji</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#f59e0b' }}>
            {resolvedBom.items.filter(i => i.quantitySource === 'FROM_CONFIG').length}
          </div>
        </div>
      </div>
    </div>
  );
};
