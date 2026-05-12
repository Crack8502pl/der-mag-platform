// src/components/network-topology/TopologyToolbar.tsx
// Standalone toolbar for Network Topology Builder — auto-layout, save, optional PDF export

import React from 'react';
import './TopologyToolbar.css';

interface TopologyToolbarProps {
  onAutoLayout: () => void;
  onOptimizeLayout?: () => void;
  onSave: () => void;
  onExportPDF?: () => void;
  isExportingPDF?: boolean;
  isSaving?: boolean;
  isDirty?: boolean;
  version?: number;
  crossingCount?: number;
}

export const TopologyToolbar: React.FC<TopologyToolbarProps> = ({
  onAutoLayout,
  onOptimizeLayout,
  onSave,
  onExportPDF,
  isExportingPDF = false,
  isSaving = false,
  isDirty = false,
  version,
  crossingCount = 0,
}) => {
  const saveLabel = isSaving
    ? '⏳ Zapisywanie...'
    : version
      ? `💾 Zapisz (v${version})`
      : '💾 Zapisz';

  return (
    <div className="topology-toolbar-new">
      <button className="btn btn-secondary btn-sm" onClick={onAutoLayout}>
        📊 Auto-układ
      </button>

      {onOptimizeLayout && (
        <button
          className={`btn btn-sm ${crossingCount > 0 ? 'btn-warning' : 'btn-secondary'}`}
          onClick={onOptimizeLayout}
          title="Optymalizuj układ - usuń krzyżowania linii (force-directed)"
        >
          ⚡ Optymalizuj{crossingCount > 0 ? ` (${crossingCount})` : ''}
        </button>
      )}

      {onExportPDF && (
        <button
          className="btn btn-secondary btn-sm"
          onClick={onExportPDF}
          disabled={isExportingPDF}
        >
          {isExportingPDF ? '📄 Generowanie...' : '📄 Export PDF'}
        </button>
      )}

      {crossingCount > 0 && (
        <div className="topology-toolbar-warning">
          ⚠️ Wykryto {crossingCount}{' '}
          {crossingCount === 1 ? 'krzyżujące się połączenie' : 'krzyżujących się połączeń'}
        </div>
      )}

      <div className="topology-toolbar-spacer" />

      <button
        className="btn btn-primary btn-sm"
        onClick={onSave}
        disabled={!isDirty || isSaving}
      >
        {saveLabel}
      </button>
    </div>
  );
};
