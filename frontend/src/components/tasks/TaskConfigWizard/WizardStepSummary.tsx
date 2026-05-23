/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/components/tasks/TaskConfigWizard/WizardStepSummary.tsx
// Step 3: Summary before saving

import React from 'react';
import type { BomResolveResult } from '../../../services/bomResolver.service';
import type { Task } from '../../../types/task.types';

interface WizardStepSummaryProps {
  task: Task;
  resolvedBom: BomResolveResult;
  configValues: Record<string, any>;
  selectedModels: Record<string, { checked: boolean; quantity: number }>;
  retentionDays: number;
  selectedRecorderId: number | null;
}

export const WizardStepSummary: React.FC<WizardStepSummaryProps> = ({
  task,
  resolvedBom,
  retentionDays,
}) => {
  return (
    <div>
      {/* Task card */}
      <div className="wizard-section">
        <h3 className="wizard-section-title">📋 Zadanie</h3>
        <div className="wizard-stat-grid">
          <div className="wizard-stat-card">
            <div className="stat-label">Numer zadania</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>
              {task.taskNumber}
            </div>
          </div>
          {task.metadata?.subsystemType && (
            <div className="wizard-stat-card">
              <div className="stat-label">Typ podsystemu</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {task.metadata.subsystemType}
              </div>
            </div>
          )}
          {task.metadata?.taskVariant && (
            <div className="wizard-stat-card">
              <div className="stat-label">Wariant</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {task.metadata.taskVariant}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOM stats */}
      <div className="wizard-section">
        <h3 className="wizard-section-title">📦 BOM</h3>
        <div className="wizard-stat-grid">
          <div className="wizard-stat-card">
            <div className="stat-label">Pozycji BOM</div>
            <div className="stat-value orange">{resolvedBom.items.length}</div>
          </div>
          <div className="wizard-stat-card">
            <div className="stat-label">Kamery</div>
            <div className="stat-value orange">{resolvedBom.cameraCount}</div>
          </div>
          <div className="wizard-stat-card">
            <div className="stat-label">Szablon</div>
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
              {resolvedBom.templateName || '—'}
              {resolvedBom.templateVersion !== null && (
                <span style={{ color: 'var(--text-secondary)' }}>
                  {' '}v{Number(resolvedBom.templateVersion).toFixed(2)}
                </span>
              )}
            </div>
          </div>
          <div className="wizard-stat-card">
            <div className="stat-label">Retencja</div>
            <div className="stat-value blue">{retentionDays}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>dni</div>
          </div>
        </div>
      </div>

      {/* Recorder */}
      {resolvedBom.needsRecorder && resolvedBom.recorderRecommendation && (
        <div className="wizard-section">
          <h3 className="wizard-section-title">🖥️ Rejestrator</h3>
          <div className="wizard-recorder-card">
            <div className="recorder-header">
              <div>
                <div className="recorder-model">
                  {resolvedBom.recorderRecommendation.recorder.modelName}
                </div>
                <div className="recorder-meta">
                  {resolvedBom.recorderRecommendation.recorder.manufacturer} &bull;{' '}
                  {resolvedBom.recorderRecommendation.recorder.minCameras}–
                  {resolvedBom.recorderRecommendation.recorder.maxCameras} kamer
                </div>
              </div>
              <span className={`wizard-badge ${resolvedBom.recorderRecommendation.isRecommended ? 'recommended' : 'manual'}`}>
                {resolvedBom.recorderRecommendation.isRecommended ? '⭐ Rekomendowany' : '👤 Ręczny wybór'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Disks */}
      {resolvedBom.diskRecommendation && (
        <div className="wizard-section">
          <h3 className="wizard-section-title">💿 Dyski</h3>
          <div className="wizard-stat-grid">
            <div className="wizard-stat-card">
              <div className="stat-label">Model dysku</div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                {resolvedBom.diskRecommendation.diskSpecification.modelName}
              </div>
            </div>
            <div className="wizard-stat-card">
              <div className="stat-label">Ilość</div>
              <div className="stat-value orange">{resolvedBom.diskRecommendation.quantity}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>szt</div>
            </div>
            <div className="wizard-stat-card">
              <div className="stat-label">Pojemność</div>
              <div className="stat-value green">{resolvedBom.diskRecommendation.totalCapacityTb} TB</div>
            </div>
            <div className="wizard-stat-card">
              <div className="stat-label">Wymagana</div>
              <div
                className="stat-value"
                style={{
                  color: resolvedBom.diskRecommendation.isAdequate
                    ? 'var(--success, #48bb78)'
                    : 'var(--error, #f56565)',
                  fontSize: '18px',
                  fontWeight: 700,
                }}
              >
                {resolvedBom.diskRecommendation.requiredTb.toFixed(2)} TB
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {resolvedBom.warnings.length > 0 && (
        <div className="wizard-section">
          <h3 className="wizard-section-title" style={{ color: 'var(--warning, #ed8936)' }}>
            ⚠️ Ostrzeżenia
          </h3>
          {resolvedBom.warnings.map((w, i) => (
            <div key={i} className="wizard-warning">
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Confirm message */}
      <div className="wizard-info-msg">
        ✅ Kliknij <strong>Zatwierdź</strong> aby zapisać konfigurację i zastosować BOM do zadania
      </div>
    </div>
  );
};
