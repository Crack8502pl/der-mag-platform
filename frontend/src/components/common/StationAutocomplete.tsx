// frontend/src/components/common/StationAutocomplete.tsx
// Autocomplete input for railway stations (PKP PLK).
// Calls onSelect with full station data when user picks a suggestion.

import React, { useState, useRef } from 'react';
import { useStationSearch } from '../../hooks/useRailwayAutocomplete';
import type { RailwayStationDto } from '../../services/railway.service';

export type { RailwayStationDto };

interface StationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (station: RailwayStationDto) => void;
  onBlur?: () => void;
  lineCode?: string;
  filterType?: string[];
  placeholder?: string;
  required?: boolean;
}

export const StationAutocomplete: React.FC<StationAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  onBlur,
  lineCode,
  filterType,
  placeholder = 'Wpisz nazwę stacji…',
  required,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { stations: allStations, loading } = useStationSearch(open ? value : '', lineCode);

  const stations = filterType && filterType.length > 0
    ? allStations.filter(s => filterType.includes(s.type))
    : allStations;

  const handleSelect = (station: RailwayStationDto) => {
    onChange(station.name);
    onSelect?.(station);
    setOpen(false);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setOpen(false);
        onBlur?.();
      }
    }, 150);
  };

  return (
    <div className="station-autocomplete" ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        autoComplete="off"
      />

      {open && value.length > 0 && (
        <div className="railway-dropdown">
          {loading && (
            <div className="railway-dropdown-item railway-dropdown-loading">
              Wyszukiwanie…
            </div>
          )}
          {!loading && stations.length === 0 && (
            <div className="railway-dropdown-item railway-dropdown-empty">
              Brak wyników
            </div>
          )}
          {stations.map((station) => (
            <button
              key={station.id}
              type="button"
              className="railway-dropdown-item"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(station);
              }}
            >
              <span className="railway-line-code">{station.name}</span>
              {station.municipality && (
                <span className="railway-line-name"> — {station.municipality}</span>
              )}
              {station.kmPosition !== null && (
                <span className="railway-station-km"> km {station.kmPosition}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
