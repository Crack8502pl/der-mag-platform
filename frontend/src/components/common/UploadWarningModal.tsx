// src/components/common/UploadWarningModal.tsx
import React from 'react';
import { useConnectionQuality } from '../../hooks/useConnectionQuality';
import './UploadWarningModal.css';

interface Props {
  isOpen: boolean;
  fileSizeBytes: number;
  onProceed: () => void;
  onCancel: () => void;
}

export const UploadWarningModal: React.FC<Props> = ({
  isOpen,
  fileSizeBytes,
  onProceed,
  onCancel,
}) => {
  const { getUploadRecommendation, quality } = useConnectionQuality();

  if (!isOpen) return null;

  const recommendation = getUploadRecommendation(fileSizeBytes);

  const qualitySymbol =
    quality === 'poor' ? '🔴' :
    quality === 'good' ? '🟡' :
    quality === 'offline' ? '⚪' : '🟢';

  return (
    <div className="upload-warning-modal-overlay">
      <div className="upload-warning-modal">
        <div className="upload-warning-modal__header">
          <span className="upload-warning-modal__icon">
            {qualitySymbol}
          </span>
          <h3>Ostrzeżenie o jakości połączenia</h3>
        </div>

        <div className="upload-warning-modal__body">
          <p className="upload-warning-modal__message">{recommendation.warning}</p>

          {recommendation.estimatedTime > 0 && (
            <div className="upload-warning-modal__estimate">
              <strong>Szacowany czas uploadu:</strong>{' '}
              {recommendation.estimatedTime < 60
                ? `${recommendation.estimatedTime}s`
                : `${Math.ceil(recommendation.estimatedTime / 60)}min`}
            </div>
          )}

          <div className="upload-warning-modal__tips">
            <h4>💡 Wskazówki:</h4>
            <ul>
              {quality === 'poor' && (
                <>
                  <li>Znajdź miejsce z lepszym zasięgiem</li>
                  <li>Połącz się z WiFi jeśli to możliwe</li>
                  <li>Poczekaj na lepsze warunki sieciowe</li>
                </>
              )}
              {quality === 'good' && (
                <>
                  <li>Nie zamykaj karty podczas uploadu</li>
                  <li>Unikaj innych aktywności sieciowych</li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="upload-warning-modal__footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            ❌ Anuluj
          </button>
          <button
            className={`btn ${quality === 'poor' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onProceed}
          >
            {quality === 'poor' ? '⚠️ Kontynuuj mimo ryzyka' : '✅ Kontynuuj upload'}
          </button>
        </div>
      </div>
    </div>
  );
};
