// src/components/network-topology/ConnectionModal.tsx
// Modal for creating a connection between two topology nodes

import React, { useState, useEffect } from 'react';
import type { TopologyNode, ConnectionTechnology } from '../../types/network-topology.types';
import { NODE_ICONS, TECHNOLOGY_COLORS } from '../../types/network-topology.types';
import { calculateDistance, formatDistance } from './utils/distanceCalculator';
import './ConnectionModal.css';

interface ConnectionModalProps {
  sourceNode: TopologyNode;
  targetNode: TopologyNode;
  onClose: () => void;
  onConfirm: (connection: {
    technology: ConnectionTechnology;
    distance?: number;
    notes?: string;
  }) => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  sourceNode,
  targetNode,
  onClose,
  onConfirm,
}) => {
  const [technology, setTechnology] = useState<ConnectionTechnology>('fiber');
  const [manualDistance, setManualDistance] = useState('');
  const [notes, setNotes] = useState('');
  const [distanceError, setDistanceError] = useState('');

  const autoDistance = calculateDistance(sourceNode.data.km, targetNode.data.km);
  const hasAutoDistance = autoDistance !== undefined;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleConfirm = () => {
    let distance: number | undefined;

    if (hasAutoDistance) {
      distance = autoDistance;
    } else {
      const parsed = parseFloat(manualDistance);
      if (!manualDistance || isNaN(parsed) || parsed <= 0) {
        setDistanceError('Odległość musi być większa niż 0');
        return;
      }
      distance = parsed;
    }

    onConfirm({
      technology,
      distance,
      notes: notes.trim() || undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="connection-modal-overlay" onClick={onClose}>
      <div
        className="connection-modal"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="connection-modal-header">
          <h2>🔗 Nowe połączenie</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Connection preview */}
        <div className="connection-preview">
          <div className="connection-preview-node">
            <span className="connection-preview-icon">{NODE_ICONS[sourceNode.type]}</span>
            <span className="connection-preview-label">{sourceNode.label}</span>
          </div>
          <div className="connection-preview-arrow">→</div>
          <div className="connection-preview-node">
            <span className="connection-preview-icon">{NODE_ICONS[targetNode.type]}</span>
            <span className="connection-preview-label">{targetNode.label}</span>
          </div>
        </div>

        {/* Form */}
        <div className="connection-modal-form">
          {/* Technology */}
          <div className="form-group">
            <label>Technologia połączenia</label>
            <div className="connection-tech-options">
              {(['fiber', 'lan'] as ConnectionTechnology[]).map(tech => (
                <label
                  key={tech}
                  className={`connection-tech-option${technology === tech ? ' connection-tech-option--selected' : ''}`}
                  style={
                    technology === tech
                      ? { borderColor: TECHNOLOGY_COLORS[tech], backgroundColor: `${TECHNOLOGY_COLORS[tech]}22` }
                      : {}
                  }
                >
                  <input
                    type="radio"
                    name="technology"
                    value={tech}
                    checked={technology === tech}
                    onChange={() => setTechnology(tech)}
                  />
                  <span
                    className="connection-tech-dot"
                    style={{ backgroundColor: TECHNOLOGY_COLORS[tech] }}
                  />
                  {tech === 'fiber' ? 'FIBER' : 'LAN'}
                </label>
              ))}
            </div>
          </div>

          {/* Distance */}
          <div className="form-group">
            <label>Odległość</label>
            {hasAutoDistance ? (
              <div className="connection-distance-auto">
                <span className="connection-distance-auto-badge">
                  {formatDistance(autoDistance)}
                </span>
                <span className="connection-distance-auto-info">obliczona automatycznie</span>
              </div>
            ) : (
              <>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="np. 1.25"
                  value={manualDistance}
                  onChange={e => {
                    setManualDistance(e.target.value);
                    if (distanceError) setDistanceError('');
                  }}
                />
                {distanceError
                  ? <span className="error-text">{distanceError}</span>
                  : <span className="connection-distance-unit">km</span>
                }
              </>
            )}
          </div>

          {/* Notes */}
          <div className="form-group">
            <label>Notatka (opcjonalna)</label>
            <textarea
              placeholder="Dodatkowe informacje o połączeniu..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="connection-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Anuluj
          </button>
          <button className="btn btn-primary" onClick={handleConfirm}>
            Potwierdź
          </button>
        </div>
      </div>
    </div>
  );
};
