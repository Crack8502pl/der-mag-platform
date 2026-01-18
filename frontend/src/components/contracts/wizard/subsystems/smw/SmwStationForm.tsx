import React from 'react';
import { SmwStation } from '../../../../../config/subsystemWizardConfig';

interface SmwStationFormProps {
  station: SmwStation;
  stationIndex: number;
  onUpdate: (updates: Partial<SmwStation>) => void;
}

export const SmwStationForm: React.FC<SmwStationFormProps> = ({
  station,
  stationIndex,
  onUpdate
}) => {
  return (
    <div className="smw-section" style={{ padding: '15px', border: '2px solid #4CAF50', borderRadius: '4px' }}>
      <h4>Stacja {stationIndex + 1}</h4>
      
      <div className="form-group">
        <label>Nazwa Stacji *</label>
        <input
          type="text"
          value={station.name || ''}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder={`Stacja ${stationIndex + 1}`}
        />
      </div>

      <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Ilość Peronów *</label>
          <input
            type="number"
            min={0}
            value={station.platforms || 0}
            onChange={(e) => {
              const count = parseInt(e.target.value) || 0;
              const platformCabinets = Array.from({ length: count }, (_, i) => ({
                platformNumber: i + 1,
                cabinets: []
              }));
              onUpdate({ platforms: count, platformCabinets });
            }}
          />
        </div>

        <div className="form-group" style={{ flex: 1 }}>
          <label>Ilość Wind *</label>
          <input
            type="number"
            min={0}
            value={station.elevators || 0}
            onChange={(e) => onUpdate({ elevators: parseInt(e.target.value) || 0 })}
          />
        </div>

        <div className="form-group" style={{ flex: 1 }}>
          <label>Ilość Tuneli *</label>
          <input
            type="number"
            min={0}
            value={station.tunnels || 0}
            onChange={(e) => onUpdate({ tunnels: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
    </div>
  );
};
