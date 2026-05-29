// src/components/network-topology/TopologyToolbar.tsx
// Standalone toolbar for Network Topology Builder — auto-layout, save, optional PDF export

import React from 'react';
import './TopologyToolbar.css';

interface TopologyToolbarProps {
  onAutoLayout: () => void;
  onOptimizeLayout?: () => void;
  onSave: () => void;
  onExportPDF?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  isExportingPdf?: boolean;
  version?: number;
  crossingCount?: number;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onFitView?: () => void;
}

export const TopologyToolbar: React.FC<TopologyToolbarProps> = ({
  onAutoLayout,
  onOptimizeLayout,
  onSave,
  onExportPDF,
  isSaving = false,
  isDirty = false,
  isExportingPdf = false,
  version,
  crossingCount = 0,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitView,
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
          disabled={isExportingPdf}
          title="Eksportuj topologię do PDF (A3 poziomo, wysoka rozdzielczość)"
        >
          {isExportingPdf ? '⏳ Eksport...' : '📄 PDF'}
        </button>
      )}

      {crossingCount > 0 && (
        <div className="topology-toolbar-warning">
          ⚠️ Wykryto {crossingCount}{' '}
          {crossingCount === 1 ? 'krzyżujące się połączenie' : 'krzyżujących się połączeń'}
        </div>
      )}

      <div className="topology-toolbar-spacer" />

      {onZoomOut && (
        <button className="btn btn-secondary btn-sm" onClick={onZoomOut} title="Oddal (Ctrl+Scroll)">
          🔍−
        </button>
      )}
      {zoom !== undefined && <span className="topology-zoom-label">{Math.round(zoom * 100)}%</span>}
      {onZoomIn && (
        <button className="btn btn-secondary btn-sm" onClick={onZoomIn} title="Przybliż (Ctrl+Scroll)">
          🔍+
        </button>
      )}
      {onZoomReset && (
        <button className="btn btn-secondary btn-sm" onClick={onZoomReset} title="Resetuj zoom (100%)">
          1:1
        </button>
      )}
      {onFitView && (
        <button className="btn btn-secondary btn-sm" onClick={onFitView} title="Dopasuj widok do wszystkich węzłów">
          ⊡ Fit
        </button>
      )}

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
