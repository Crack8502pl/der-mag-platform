// src/components/common/RestoreDraftModal.tsx
// Modal do przywracania zapisanego draftu wizarda

import React from 'react';

interface RestoreDraftModalProps {
  visible: boolean;
  wizardName: string;
  savedAt: Date | string;
  expiresAt: Date | string;
  metadata?: any;
  onRestore: () => void;
  onDiscard: () => void;
}

const formatTimeAgo = (date: Date | string): string => {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days} ${days === 1 ? 'dzień' : 'dni'} temu`;
  if (hours > 0) return `${hours} ${hours === 1 ? 'godzinę' : 'godziny'} temu`;
  if (minutes > 0) return `${minutes} ${minutes === 1 ? 'minutę' : 'minut'} temu`;
  return 'przed chwilą';
};

export const RestoreDraftModal: React.FC<RestoreDraftModalProps> = ({
  visible,
  wizardName,
  savedAt,
  expiresAt,
  metadata,
  onRestore,
  onDiscard,
}) => {
  if (!visible) return null;

  const hoursSinceSave = (Date.now() - new Date(savedAt).getTime()) / (1000 * 60 * 60);
  const hoursUntilExpiry = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
  const isOld = hoursSinceSave > 24;

  return (
    <div className="modal-overlay">
      <div className="modal-content restore-draft-modal" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>🔄 Znaleziono zapisany postęp</h2>
        </div>
        <div className="modal-body">
          <div className="draft-info">
            <p>
              <strong>Kreator:</strong> {wizardName}
            </p>
            <p>
              <strong>Ostatni zapis:</strong> {formatTimeAgo(savedAt)}
            </p>
            <p>
              <strong>Wygasa:</strong> za {Math.round(hoursUntilExpiry)} godzin
            </p>

            {metadata?.contractName && (
              <p>
                <strong>Nazwa kontraktu:</strong> {metadata.contractName}
              </p>
            )}

            {metadata?.currentStep && (
              <p>
                <strong>Krok:</strong> {metadata.currentStep}
              </p>
            )}
          </div>

          {isOld && (
            <div className="alert alert-warning" style={{ marginTop: '16px' }}>
              ⚠️ Ten zapis ma ponad 24h - może być nieaktualny
            </div>
          )}
        </div>
        <div className="modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px' }}>
          <button className="btn btn-secondary" onClick={onDiscard}>
            🆕 Zacznij od nowa
          </button>
          <button className="btn btn-primary" onClick={onRestore}>
            ✅ Kontynuuj
          </button>
        </div>
      </div>
    </div>
  );
};
