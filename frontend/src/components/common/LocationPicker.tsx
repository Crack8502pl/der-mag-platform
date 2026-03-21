// src/components/common/LocationPicker.tsx
// Komponent do wprowadzania i wyświetlania lokalizacji GPS

import React, { useState, useCallback, useEffect } from 'react';
import { useGoogleMaps, GPSCoordinates } from '../../hooks/useGoogleMaps';
import './LocationPicker.css';

interface LocationPickerProps {
  value?: GPSCoordinates | null;
  googleMapsUrl?: string;
  onChange?: (coordinates: GPSCoordinates | null) => void;
  onGoogleMapsUrlChange?: (url: string) => void;
  readOnly?: boolean;
  showNavigationButton?: boolean;
  placeholder?: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  googleMapsUrl = '',
  onChange,
  onGoogleMapsUrlChange,
  readOnly = false,
  showNavigationButton = true,
  placeholder = 'Wklej link Google Maps lub współrzędne GPS',
}) => {
  const [inputValue, setInputValue] = useState(googleMapsUrl);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(googleMapsUrl);
  }, [googleMapsUrl]);

  const {
    loading,
    error: hookError,
    parseUrl,
    parseUrlLocal,
    isShortUrl,
    openNavigation,
    openLocation,
    formatCoordinates,
    validateCoordinates,
  } = useGoogleMaps();

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      setLocalError(null);
      if (onGoogleMapsUrlChange) {
        onGoogleMapsUrlChange(newValue);
      }
    },
    [onGoogleMapsUrlChange]
  );

  const handleParseClick = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setLocalError('Wpisz link Google Maps lub współrzędne GPS');
      return;
    }

    setLocalError(null);

    // Try local parsing first for full links
    if (!isShortUrl(trimmed)) {
      const coords = parseUrlLocal(trimmed);
      if (coords) {
        if (!validateCoordinates(coords.lat, coords.lon)) {
          setLocalError('Nieprawidłowe współrzędne GPS');
          return;
        }
        if (onChange) {
          onChange(coords);
        }
        return;
      }
    }

    // Fall back to backend (handles shortened links and complex URLs)
    const result = await parseUrl(trimmed);
    if (result) {
      if (result.coordinates) {
        if (!validateCoordinates(result.coordinates.lat, result.coordinates.lon)) {
          setLocalError('Nieprawidłowe współrzędne GPS');
          return;
        }
        if (onChange) {
          onChange(result.coordinates);
        }
      } else {
        setLocalError('Nie udało się wyciągnąć współrzędnych GPS z podanego linku');
      }
    }
  }, [inputValue, isShortUrl, parseUrlLocal, parseUrl, validateCoordinates, onChange]);

  const handleClear = useCallback(() => {
    setInputValue('');
    setLocalError(null);
    if (onChange) {
      onChange(null);
    }
    if (onGoogleMapsUrlChange) {
      onGoogleMapsUrlChange('');
    }
  }, [onChange, onGoogleMapsUrlChange]);

  const displayError = localError || hookError;

  return (
    <div className="location-picker">
      {!readOnly && (
        <div className="location-input-row">
          <input
            type="text"
            className="location-input"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={loading}
          />
          <button
            type="button"
            className="btn btn-secondary location-parse-btn"
            onClick={handleParseClick}
            disabled={loading || !inputValue.trim()}
            title="Pobierz współrzędne GPS z linku"
          >
            {loading ? '⏳' : '📍'} {loading ? 'Pobieranie...' : 'Pobierz GPS'}
          </button>
          {(value || inputValue) && (
            <button
              type="button"
              className="btn btn-secondary location-clear-btn"
              onClick={handleClear}
              disabled={loading}
              title="Wyczyść lokalizację"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {displayError && (
        <div className="location-error">{displayError}</div>
      )}

      {value && (
        <div className="location-result">
          <div className="location-coords">
            <span className="coords-label">📍 GPS:</span>
            <span className="coords-value">{formatCoordinates(value)}</span>
          </div>

          <div className="location-actions">
            {showNavigationButton && (
              <button
                type="button"
                className="btn btn-secondary location-action-btn"
                onClick={() => openNavigation(value)}
                title="Otwórz nawigację w Google Maps"
              >
                🧭 Nawiguj
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary location-action-btn"
              onClick={() => openLocation(value)}
              title="Zobacz lokalizację w Google Maps"
            >
              🗺️ Zobacz na mapie
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
