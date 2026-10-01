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
  if (resolvedBom.templateMissing) {
    return (
      <div className="alert alert-error">
        ⚠️ <strong>Brak szablonu BOM dla tego zadania</strong>
        <p>Nie znaleziono aktywnego szablonu dla podsystemu <code>{resolvedBom.subsystemType}</code>.</p>
        <p>Skontaktuj się z administratorem systemu.</p>
      </div>
    );
  }

  const cameraBreakdownTotal =
    (resolvedBom.cameraBreakdown?.ogolna ?? 0) +
    (resolvedBom.cameraBreakdown?.lpr ?? 0) +
    (resolvedBom.cameraBreakdown?.skp ?? 0);
  const audioBreakdown = resolvedBom.audioBreakdown;
  const audioTotal = audioBreakdown
    ? audioBreakdown.dphIpDevices + audioBreakdown.audioIpDevices + audioBreakdown.cts220IpDevices +
      audioBreakdown.ivrChannels + audioBreakdown.conferenceChannels
    : 0;

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
          {resolvedBom.cameraBreakdown && cameraBreakdownTotal > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
              {resolvedBom.cameraBreakdown.ogolna > 0 && (
                <span style={{ fontSize: '12px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '2px 8px', borderRadius: '4px' }}>
                  Ogólna: {resolvedBom.cameraBreakdown.ogolna}
                </span>
              )}
              {resolvedBom.cameraBreakdown.lpr > 0 && (
                <span style={{ fontSize: '12px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '2px 8px', borderRadius: '4px' }}>
                  LPR: {resolvedBom.cameraBreakdown.lpr}
                </span>
              )}
              {resolvedBom.cameraBreakdown.skp > 0 && (
                <span style={{ fontSize: '12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '4px' }}>
                  SKP: {resolvedBom.cameraBreakdown.skp}
                </span>
              )}
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

      {audioBreakdown && (
        <section aria-label="Audio / Slican" style={{
          marginBottom: '16px',
          padding: '14px',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          background: 'var(--card-bg)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>🔊 Audio / Slican</h4>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span className="wizard-badge">AGGREGATED</span>
              <span className="wizard-badge">
                {audioTotal === 0
                  ? 'MISSING'
                  : (resolvedBom.audioAggregationWarnings?.length || resolvedBom.audioWarnings?.length)
                    ? 'WARNING'
                    : 'VALID'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            {[
              ['DPH.IP', audioBreakdown.dphIpDevices],
              ['Audio.IP', audioBreakdown.audioIpDevices],
              ['CTS220.IP', audioBreakdown.cts220IpDevices],
              ['IVR', audioBreakdown.ivrChannels],
              ['Konferencje', audioBreakdown.conferenceChannels],
            ].map(([label, quantity]) => (
              <span key={label} style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', background: 'var(--bg-secondary)' }}>
                {label}: {quantity}
              </span>
            ))}
            <strong style={{ padding: '3px 8px' }}>Razem: {audioTotal}</strong>
          </div>
          {resolvedBom.audioHierarchySummary && resolvedBom.audioHierarchySummary.length > 0 && (
            <div className="table-container" style={{ marginTop: '12px' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Hierarchia</th>
                    <th>DPH.IP</th>
                    <th>Audio.IP</th>
                    <th>CTS220.IP</th>
                    <th>IVR</th>
                    <th>Konferencje</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedBom.audioHierarchySummary.map(node => (
                    <tr key={node.nodeId}>
                      <td>{node.nodeType} ({node.nodeId})</td>
                      <td>{node.aggregate.dphIpDevices}</td>
                      <td>{node.aggregate.audioIpDevices}</td>
                      <td>{node.aggregate.cts220IpDevices}</td>
                      <td>{node.aggregate.ivrChannels}</td>
                      <td>{node.aggregate.conferenceChannels}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {resolvedBom.centralRecommendation && (
            <div style={{ marginTop: '10px' }}>
              Centrala: <strong>{resolvedBom.centralRecommendation.modelName}</strong>
            </div>
          )}
          {(resolvedBom.licenses || []).some(license => license.items.length > 0) && (
            <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
              {resolvedBom.licenses?.flatMap(license => license.items.map(item => (
                <li key={`${license.type}-${item.warehouseStockId}`}>
                  {license.type}: {item.quantity} × {item.warehouseStockId}
                </li>
              )))}
            </ul>
          )}
        </section>
      )}

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
