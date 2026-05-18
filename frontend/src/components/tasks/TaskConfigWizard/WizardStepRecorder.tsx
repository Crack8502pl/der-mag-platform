// frontend/src/components/tasks/TaskConfigWizard/WizardStepRecorder.tsx
// Step 2: Recorder and disk selection

import React, { useRef } from 'react';
import type { BomResolveResult } from '../../../services/bomResolver.service';

interface WizardStepRecorderProps {
  resolvedBom: BomResolveResult;
  selectedRecorderId: number | null;
  retentionDays: number;
  onRecorderChange: (recorderId: number | null) => void;
  onRetentionDaysChange: (days: number) => void;
  onReResolve: () => void;
}

export const WizardStepRecorder: React.FC<WizardStepRecorderProps> = ({
  resolvedBom,
  selectedRecorderId,
  retentionDays,
  onRecorderChange,
  onRetentionDaysChange,
  onReResolve,
}) => {
  const retentionDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRetentionChange = (days: number) => {
    onRetentionDaysChange(days);
    if (retentionDebounce.current) clearTimeout(retentionDebounce.current);
    retentionDebounce.current = setTimeout(() => {
      onReResolve();
    }, 500);
  };

  const handleRecorderSelect = (value: string) => {
    const id = value === '' ? null : Number(value);
    onRecorderChange(id);
    onReResolve();
  };

  const { recorderRecommendation, diskRecommendation, cameraCount } = resolvedBom;
  const maxCameras = recorderRecommendation?.recorder.maxCameras ?? cameraCount;

  const BITRATE_MBPS = 4;
  const TB_PER_MBPS_PER_DAY = 0.0108;

  const diskPercent = diskRecommendation
    ? Math.min(100, (diskRecommendation.requiredTb / diskRecommendation.totalCapacityTb) * 100)
    : 0;

  const cameraPercent = recorderRecommendation
    ? Math.min(100, (cameraCount / (recorderRecommendation.recorder.maxCameras || 1)) * 100)
    : 0;

  return (
    <div>
      {/* Camera section */}
      <div className="wizard-section">
        <h3 className="wizard-section-title">📷 Kamery</h3>
        <div style={{ color: 'var(--text-primary)', fontSize: '15px', marginBottom: '8px' }}>
          <strong>{cameraCount}</strong> kamer wykrytych
          {recorderRecommendation && (
            <span style={{ color: 'var(--text-secondary)', marginLeft: '8px', fontSize: '13px' }}>
              (maks. {recorderRecommendation.recorder.maxCameras} dla tego rejestratora)
            </span>
          )}
        </div>
        {recorderRecommendation && (
          <>
            <div className="wizard-camera-bar-wrap">
              <div
                className="wizard-camera-bar"
                style={{ width: `${cameraPercent}%` }}
              />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {cameraCount} / {maxCameras} kanałów
            </div>
          </>
        )}
      </div>

      {/* Recorder section */}
      <div className="wizard-section">
        <h3 className="wizard-section-title">🖥️ Rejestrator</h3>

        {recorderRecommendation ? (
          <>
            {/* Recommended recorder card */}
            <div className="wizard-recorder-card">
              <div className="recorder-header">
                <div>
                  <div className="recorder-model">
                    {recorderRecommendation.recorder.modelName}
                  </div>
                  <div className="recorder-meta">
                    {recorderRecommendation.recorder.manufacturer} &bull;{' '}
                    {recorderRecommendation.recorder.minCameras}–{recorderRecommendation.recorder.maxCameras} kamer &bull;{' '}
                    {recorderRecommendation.recorder.diskSlots} slotów HDD
                  </div>
                  {recorderRecommendation.recorder.catalogNumber && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'monospace' }}>
                      {recorderRecommendation.recorder.catalogNumber}
                    </div>
                  )}
                </div>
                <span
                  className={`wizard-badge ${recorderRecommendation.isRecommended ? 'recommended' : 'manual'}`}
                >
                  {recorderRecommendation.isRecommended ? '⭐ Rekomendowany' : '👤 Ręczny wybór'}
                </span>
              </div>
            </div>

            {/* Alternatives dropdown */}
            {recorderRecommendation.alternatives.length > 0 && (
              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label>Alternatywne rejestratory</label>
                <select
                  value={selectedRecorderId ?? ''}
                  onChange={e => handleRecorderSelect(e.target.value)}
                >
                  <option value="">Auto (rekomendowany)</option>
                  {recorderRecommendation.alternatives.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.modelName} — {r.manufacturer} ({r.minCameras}–{r.maxCameras} kamer)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        ) : (
          <div className="wizard-warning">
            ⚠️ Brak rejestratora dla {cameraCount} kamer
          </div>
        )}
      </div>

      {/* Disk section */}
      {diskRecommendation && (
        <div className="wizard-section">
          <h3 className="wizard-section-title">💿 Dyski</h3>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
            {diskRecommendation.diskSpecification.modelName}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            {diskRecommendation.diskSpecification.manufacturer} &bull;{' '}
            {diskRecommendation.diskSpecification.capacityTb} TB / szt &bull;{' '}
            {diskRecommendation.quantity} szt
          </div>

          <div className="wizard-stat-grid" style={{ marginBottom: '10px' }}>
            <div className="wizard-stat-card">
              <div className="stat-label">Pojemność całkowita</div>
              <div className="stat-value green">{diskRecommendation.totalCapacityTb} TB</div>
            </div>
            <div className="wizard-stat-card">
              <div className="stat-label">Wymagana</div>
              <div className={`stat-value ${diskRecommendation.isAdequate ? 'green' : 'stat-value'}`}
                   style={!diskRecommendation.isAdequate ? { color: 'var(--error, #f56565)' } : {}}>
                {diskRecommendation.requiredTb.toFixed(2)} TB
              </div>
            </div>
          </div>

          <div className="wizard-disk-bar-wrap">
            <div
              className={`wizard-disk-bar ${diskRecommendation.isAdequate ? 'adequate' : 'inadequate'}`}
              style={{ width: `${diskPercent}%` }}
            />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {diskRecommendation.requiredTb.toFixed(2)} TB wymagane / {diskRecommendation.totalCapacityTb} TB dostępne
            {!diskRecommendation.isAdequate && (
              <span style={{ color: 'var(--error, #f56565)', marginLeft: '8px' }}>
                ⚠️ Niewystarczająca pojemność
              </span>
            )}
          </div>

          <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Wzór: {retentionDays} dni × {cameraCount} kamer × {BITRATE_MBPS} Mbps × {TB_PER_MBPS_PER_DAY} TB/Mbps/dzień ={' '}
            {(retentionDays * cameraCount * BITRATE_MBPS * TB_PER_MBPS_PER_DAY).toFixed(2)} TB
          </div>
        </div>
      )}

      {/* Retention days */}
      <div className="wizard-section">
        <h3 className="wizard-section-title">💾 Retencja nagrań</h3>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Retencja [dni]</label>
          <input
            type="number"
            value={retentionDays}
            min={1}
            max={365}
            style={{ maxWidth: '160px' }}
            onChange={e => handleRetentionChange(Number(e.target.value))}
          />
          <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
            Zmiana retencji przelicza wymagania dysków (z 500 ms opóźnieniem)
          </small>
        </div>
      </div>
    </div>
  );
};
