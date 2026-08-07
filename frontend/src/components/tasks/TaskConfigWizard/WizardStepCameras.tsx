import React from 'react';
import type { CameraRow } from '../../../types/cameraBreakdown';

interface WizardStepCamerasProps {
  cameraRows: CameraRow[];
  retentionDays: number;
  userEditedRows?: boolean;
  onCameraRowsChange: (rows: CameraRow[]) => void;
  onRetentionDaysChange: (days: number) => void;
}

const CAMERA_META: Record<CameraRow['type'], { icon: string; color: string }> = {
  Ogólna: { icon: '📷', color: '#3b82f6' },
  LPR: { icon: '🚗', color: '#f59e0b' },
  SKP: { icon: '🚦', color: '#10b981' },
};

const BITRATE_MBPS = 4;
const BITS_PER_MEGABIT = 1_000_000;
const SECONDS_PER_DAY = 86_400;
const BITS_PER_BYTE = 8;
const BYTES_PER_TERABYTE = 1e12;

export const WizardStepCameras: React.FC<WizardStepCamerasProps> = ({
  cameraRows,
  retentionDays,
  userEditedRows = false,
  onCameraRowsChange,
  onRetentionDaysChange,
}) => {
  const updateRow = (
    index: number,
    key: 'quantity' | 'quantityPerPole',
    value: number
  ) => {
    onCameraRowsChange(
      cameraRows.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [key]: Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)),
            }
          : row
      )
    );
  };

  const totalCameras = cameraRows.reduce((sum, row) => sum + Math.max(0, row.quantity || 0), 0);
  const estimatedPoles = cameraRows.reduce((sum, row) => {
    const quantity = Math.max(0, row.quantity || 0);
    const quantityPerPole = Math.max(1, row.quantityPerPole || 1);
    return sum + (quantity > 0 ? Math.ceil(quantity / quantityPerPole) : 0);
  }, 0);
  const estimatedStorageTb = (
    totalCameras *
    retentionDays *
    BITRATE_MBPS *
    BITS_PER_MEGABIT *
    SECONDS_PER_DAY
  ) / (BITS_PER_BYTE * BYTES_PER_TERABYTE);

  return (
    <div className="wizard-section">
      <h3 className="wizard-section-title">📷 Konfiguracja kamer</h3>

      {totalCameras > 0 && !userEditedRows && (
        <div className="alert alert-info" style={{ marginBottom: '16px' }}>
          ℹ️ Liczba kamer wczytana automatycznie z konfiguracji. Sprawdź i ewentualnie skoryguj podział przed obliczeniem BOM.
        </div>
      )}

      <div className="data-table-container" style={{ marginBottom: '16px' }}>
        <table className="data-table data-table--compact">
          <thead>
            <tr>
              <th>Typ kamery</th>
              <th className="table-cell-center" style={{ width: '140px' }}>Ilość</th>
              <th className="table-cell-center" style={{ width: '220px' }}>Ilość na słupie</th>
            </tr>
          </thead>
          <tbody>
            {cameraRows.map((row, index) => {
              const meta = CAMERA_META[row.type];
              return (
                <tr key={row.type}>
                  <td style={{ fontWeight: 600 }}>
                    <span style={{ color: meta.color, marginRight: '8px' }}>{meta.icon}</span>
                    {row.type}
                  </td>
                  <td className="table-cell-center">
                    <input
                      className="input"
                      type="number"
                      min="0"
                      aria-label={`${row.type} ilość`}
                      value={row.quantity}
                      style={{ width: '90px', textAlign: 'center' }}
                      onChange={e => updateRow(index, 'quantity', Number(e.target.value))}
                    />
                  </td>
                  <td className="table-cell-center">
                    <input
                      className="input"
                      type="number"
                      min="1"
                      aria-label={`${row.type} ilość na słupie`}
                      value={row.quantityPerPole}
                      style={{ width: '120px', textAlign: 'center' }}
                      onChange={e => updateRow(index, 'quantityPerPole', Number(e.target.value))}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="wizard-stat-grid" style={{ marginBottom: '20px' }}>
        <div className="wizard-stat-card">
          <div className="stat-label">Łącznie kamer</div>
          <div className="stat-value orange">{totalCameras}</div>
        </div>
        <div className="wizard-stat-card">
          <div className="stat-label">Szacowana ilość słupów</div>
          <div className="stat-value blue">{estimatedPoles}</div>
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div>
          <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>🗓️ Dni retencji</h4>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="label" htmlFor="camera-retention-days">Retencja nagrań</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              id="camera-retention-days"
              className="input"
              type="number"
              min="1"
              max="365"
              aria-label="Dni retencji"
              value={retentionDays}
              style={{ width: '120px' }}
              onChange={e => onRetentionDaysChange(Math.min(365, Math.max(1, Number(e.target.value) || 1)))}
            />
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>dni</span>
          </div>
        </div>

        <div className="wizard-stat-card">
          <div className="stat-label">⚡ Szacowane zapotrzebowanie na storage</div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {totalCameras} kamer × {retentionDays} dni × {BITRATE_MBPS} Mbps = ~{estimatedStorageTb.toFixed(1)} TB
          </div>
        </div>
      </div>
    </div>
  );
};
