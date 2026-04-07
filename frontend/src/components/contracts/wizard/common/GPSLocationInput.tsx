// GPSLocationInput.tsx
// GPS location input with 3 modes: Google Maps link, decimal coordinates, angular (DMS)

import React, { useState } from 'react';
import { useGoogleMaps } from '../../../../hooks/useGoogleMaps';

type LocationMode = 'googleMaps' | 'coordinates' | 'angular';

interface GPSLocationInputProps {
  gpsLatitude?: string;
  gpsLongitude?: string;
  googleMapsUrl?: string;
  onUpdate: (updates: { gpsLatitude?: string; gpsLongitude?: string; googleMapsUrl?: string }) => void;
}

interface DmsValue {
  degrees: string;
  minutes: string;
  seconds: string;
}

const parseDms = (dms: DmsValue): number | null => {
  const d = parseFloat(dms.degrees);
  const m = parseFloat(dms.minutes || '0');
  const s = parseFloat(dms.seconds || '0');
  if (isNaN(d)) return null;
  // Validate minutes and seconds are within valid ranges
  if (m < 0 || m >= 60) return null;
  if (s < 0 || s >= 60) return null;
  // For negative degrees, minutes and seconds reduce the absolute value
  const sign = d < 0 ? -1 : 1;
  return d + sign * (m / 60 + s / 3600);
};

const isValidLatitude = (v: number): boolean => v >= -90 && v <= 90;
const isValidLongitude = (v: number): boolean => v >= -180 && v <= 180;

export const GPSLocationInput: React.FC<GPSLocationInputProps> = ({
  gpsLatitude,
  gpsLongitude,
  googleMapsUrl,
  onUpdate,
}) => {
  const [mode, setMode] = useState<LocationMode>('googleMaps');
  const [mapsInput, setMapsInput] = useState(googleMapsUrl || '');
  const [latInput, setLatInput] = useState(gpsLatitude || '');
  const [lonInput, setLonInput] = useState(gpsLongitude || '');
  const [latDms, setLatDms] = useState<DmsValue>({ degrees: '', minutes: '', seconds: '' });
  const [lonDms, setLonDms] = useState<DmsValue>({ degrees: '', minutes: '', seconds: '' });
  const [mapsError, setMapsError] = useState('');
  const [dmsError, setDmsError] = useState('');

  const { parseUrl, parseUrlLocal, loading: gpsLoading } = useGoogleMaps();

  const handleConvertGoogleMaps = async () => {
    setMapsError('');
    if (!mapsInput) return;

    const local = parseUrlLocal(mapsInput);
    if (local) {
      const lat = local.lat.toFixed(6);
      const lon = local.lon.toFixed(6);
      setLatInput(lat);
      setLonInput(lon);
      onUpdate({ gpsLatitude: lat, gpsLongitude: lon, googleMapsUrl: mapsInput });
      return;
    }

    try {
      const result = await parseUrl(mapsInput);
      if (result?.coordinates) {
        const lat = result.coordinates.lat.toFixed(6);
        const lon = result.coordinates.lon.toFixed(6);
        setLatInput(lat);
        setLonInput(lon);
        onUpdate({ gpsLatitude: lat, gpsLongitude: lon, googleMapsUrl: mapsInput });
      } else {
        setMapsError('Nie udało się wyodrębnić współrzędnych z podanego linku.');
      }
    } catch {
      setMapsError('Błąd podczas parsowania linku Google Maps.');
    }
  };

  const handleCoordinatesChange = (field: 'lat' | 'lon', value: string) => {
    if (field === 'lat') {
      setLatInput(value);
      const lon = lonInput;
      if (value && lon) {
        // Clear stale Google Maps URL since the user is now entering coordinates directly
        onUpdate({ gpsLatitude: value, gpsLongitude: lon, googleMapsUrl: undefined });
      }
    } else {
      setLonInput(value);
      const lat = latInput;
      if (lat && value) {
        onUpdate({ gpsLatitude: lat, gpsLongitude: value, googleMapsUrl: undefined });
      }
    }
  };

  const handleConvertAngular = () => {
    setDmsError('');
    const lat = parseDms(latDms);
    const lon = parseDms(lonDms);
    if (lat === null || lon === null) {
      setDmsError('Nieprawidłowe wartości DMS (minuty i sekundy muszą być w zakresie 0–59).');
      return;
    }
    if (!isValidLatitude(lat)) {
      setDmsError('Szerokość geograficzna musi być w zakresie -90°..90°.');
      return;
    }
    if (!isValidLongitude(lon)) {
      setDmsError('Długość geograficzna musi być w zakresie -180°..180°.');
      return;
    }
    const latStr = lat.toFixed(6);
    const lonStr = lon.toFixed(6);
    setLatInput(latStr);
    setLonInput(lonStr);
    // Clear stale Google Maps URL when converting from DMS
    onUpdate({ gpsLatitude: latStr, gpsLongitude: lonStr, googleMapsUrl: undefined });
  };

  const openInGoogleMaps = () => {
    if (gpsLatitude && gpsLongitude) {
      window.open(`https://www.google.com/maps?q=${gpsLatitude},${gpsLongitude}`, '_blank');
    }
  };

  const handleClearLocation = () => {
    setLatInput('');
    setLonInput('');
    setMapsInput('');
    onUpdate({ gpsLatitude: undefined, gpsLongitude: undefined, googleMapsUrl: undefined });
  };

  return (
    <div className="gps-location-input">
      <div className="location-mode-switcher" style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        <button
          type="button"
          className={`btn btn-sm ${mode === 'googleMaps' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMode('googleMaps')}
        >
          🗺️ Link Google Maps
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === 'coordinates' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMode('coordinates')}
        >
          🎯 Współrzędne
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === 'angular' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMode('angular')}
        >
          📐 Kątowa
        </button>
      </div>

      {mode === 'googleMaps' && (
        <div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={mapsInput}
              onChange={(e) => setMapsInput(e.target.value)}
              placeholder="Wklej link z Google Maps"
              className="gps-url-input"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleConvertGoogleMaps}
              disabled={gpsLoading || !mapsInput}
            >
              {gpsLoading ? '...' : 'Konwertuj'}
            </button>
          </div>
          {mapsError && <small className="error-text">{mapsError}</small>}
          <small className="form-help">Obsługiwane: pełne linki Google Maps oraz skrócone (goo.gl, maps.app)</small>
        </div>
      )}

      {mode === 'coordinates' && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={latInput}
              onChange={(e) => handleCoordinatesChange('lat', e.target.value)}
              placeholder="Szerokość (lat)"
            />
          </div>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={lonInput}
              onChange={(e) => handleCoordinatesChange('lon', e.target.value)}
              placeholder="Długość (lon)"
            />
          </div>
        </div>
      )}

      {mode === 'angular' && (
        <div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', marginBottom: '4px', flexWrap: 'wrap' }}>
            <div>
              <small>Szer. °</small>
              <input
                type="number"
                value={latDms.degrees}
                onChange={(e) => setLatDms(prev => ({ ...prev, degrees: e.target.value }))}
                placeholder="°"
                style={{ width: '60px' }}
              />
            </div>
            <div>
              <small>′</small>
              <input
                type="number"
                value={latDms.minutes}
                onChange={(e) => setLatDms(prev => ({ ...prev, minutes: e.target.value }))}
                placeholder="′"
                style={{ width: '55px' }}
              />
            </div>
            <div>
              <small>″</small>
              <input
                type="number"
                value={latDms.seconds}
                onChange={(e) => setLatDms(prev => ({ ...prev, seconds: e.target.value }))}
                placeholder="″"
                style={{ width: '55px' }}
              />
            </div>
            <span style={{ padding: '0 4px', alignSelf: 'center' }}>|</span>
            <div>
              <small>Dług. °</small>
              <input
                type="number"
                value={lonDms.degrees}
                onChange={(e) => setLonDms(prev => ({ ...prev, degrees: e.target.value }))}
                placeholder="°"
                style={{ width: '60px' }}
              />
            </div>
            <div>
              <small>′</small>
              <input
                type="number"
                value={lonDms.minutes}
                onChange={(e) => setLonDms(prev => ({ ...prev, minutes: e.target.value }))}
                placeholder="′"
                style={{ width: '55px' }}
              />
            </div>
            <div>
              <small>″</small>
              <input
                type="number"
                value={lonDms.seconds}
                onChange={(e) => setLonDms(prev => ({ ...prev, seconds: e.target.value }))}
                placeholder="″"
                style={{ width: '55px' }}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleConvertAngular}
              style={{ alignSelf: 'flex-end' }}
            >
              Konwertuj
            </button>
          </div>
          <small className="form-help">Format: DD°MM′SS″ (stopnie, minuty, sekundy)</small>
          {dmsError && <small className="error-text">{dmsError}</small>}
        </div>
      )}

      {(gpsLatitude || gpsLongitude) && (
        <div className="gps-coordinates-display" style={{ marginTop: '6px' }}>
          <span className="gps-coords">
            📌 {gpsLatitude}, {gpsLongitude}
          </span>
          <button
            type="button"
            className="btn-link"
            onClick={openInGoogleMaps}
            title="Otwórz w Google Maps"
          >
            🗺️ Otwórz mapę
          </button>
          <button
            type="button"
            className="btn-link btn-danger-link"
            onClick={handleClearLocation}
            title="Usuń lokalizację"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
