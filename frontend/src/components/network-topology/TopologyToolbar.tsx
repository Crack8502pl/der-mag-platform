// src/components/network-topology/TopologyToolbar.tsx
// Standalone toolbar for Network Topology Builder — auto-layout, save, optional PDF export

import React from 'react';
import './TopologyToolbar.css';

interface TopologyToolbarProps {
  onAutoLayout: () => void;
  onSave: () => void;
  onExportPDF?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  version?: number;
}

export const TopologyToolbar: React.FC<TopologyToolbarProps> = ({
  onAutoLayout,
  onSave,
  onExportPDF,
  isSaving = false,
  isDirty = false,
  version,
}) => {
  const saveLabel = isSaving
    ? '⏳ Zapisywanie...'
    : version
      ? `💾 Zapisz (v${version})`
      : '💾 Zapisz';

  return (
    <div className="topology-toolbar-new">
      <button className="btn btn-secondary btn-sm" onClick={onAutoLayout}>
        ⚡ Auto-Layout
      </button>

      {onExportPDF && (
        <button className="btn btn-secondary btn-sm" onClick={onExportPDF}>
          📄 PDF
        </button>
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
