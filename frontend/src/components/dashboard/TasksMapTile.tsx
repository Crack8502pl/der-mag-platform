// src/components/dashboard/TasksMapTile.tsx
// Kafelek mapy zadań z lokalizacjami GPS - Leaflet + OpenStreetMap

import React, { useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../../services/api';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import { usePermissions } from '../../hooks/usePermissions';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import { getTileProvider } from '../../config/mapConfig';
import { MapMarker, getMarkerIcon } from '../map/mapIcons';
import './TasksMapTile.css';

// Fix dla ikon Leaflet (znany problem z bundlerami webpack/vite)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Centrum Polski jako domyślna pozycja mapy
const POLAND_CENTER: [number, number] = [52.0693, 19.4803];
const DEFAULT_ZOOM = 6;

// Komponent do auto-centrowania mapy na wszystkich markerach
const FitBounds: React.FC<{ markers: MapMarker[] }> = ({ markers }) => {
  const map = useMap();

  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(
        markers.map(m => [m.gpsLatitude, m.gpsLongitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, map]);

  return null;
};

export const TasksMapTile: React.FC = () => {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const { openNavigation, openLocation } = useGoogleMaps();
  const { hasPermission, isAdmin } = usePermissions();
  const tileProvider = getTileProvider();

  const canSeeAll = isAdmin() || hasPermission('tasks', 'assign');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; data: MapMarker[] }>('/map/markers');
      if (response.data.success) {
        setMarkers(response.data.data.map(m => ({
          ...m,
          gpsLatitude: Number(m.gpsLatitude),
          gpsLongitude: Number(m.gpsLongitude),
        })));
      } else {
        setError('Nie udało się pobrać markerów mapy');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania markerów mapy');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (expanded) {
      fetchTasks();
    }
  }, [expanded, fetchTasks]);

  const handleNavigate = (marker: MapMarker) => {
    openNavigation({ lat: marker.gpsLatitude, lon: marker.gpsLongitude });
  };

  const handleView = (marker: MapMarker) => {
    openLocation({ lat: marker.gpsLatitude, lon: marker.gpsLongitude });
  };

  const tileClassNames = [
    'tasks-map-tile',
    expanded ? 'expanded' : '',
    loading ? 'loading' : '',
    error ? 'error' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={tileClassNames}>
      <div className="tile-header">
        <ModuleIcon name="mapa" emoji={MODULE_ICONS.mapa} size={24} alt="Mapa Zadań" />
        <span className="tile-title">Mapa Zadań</span>
        {expanded && !loading && !error && (
          <span className="tile-count">{markers.length} lokalizacji</span>
        )}
        <span className="map-scope-label" style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
          {canSeeAll ? '🌐 Wszystkie zadania' : '👤 Moje zadania'}
        </span>
        <button
          className="btn-expand"
          onClick={() => setExpanded(prev => !prev)}
          title={expanded ? 'Zwiń mapę' : 'Rozwiń mapę'}
        >
          {expanded ? '⬇️' : '⬆️'}
        </button>
      </div>

      <div className="tile-map-container">
        {!expanded && (
          <div className="tile-map-collapsed" onClick={() => setExpanded(true)}>
            <span>🗺️</span>
            <span>Kliknij aby rozwinąć mapę</span>
          </div>
        )}

        {expanded && loading && (
          <div className="tile-content tile-state">
            <span>Ładowanie mapy…</span>
          </div>
        )}

        {expanded && !loading && error && (
          <div className="tile-content tile-state">
            <p className="error-text">{error}</p>
            <button
              className="btn btn-secondary"
              onClick={fetchTasks}
            >
              Spróbuj ponownie
            </button>
          </div>
        )}

        {expanded && !loading && !error && markers.length === 0 && (
          <div className="tile-content tile-state no-tasks">
            <span>Brak obiektów z lokalizacją GPS</span>
          </div>
        )}

        {expanded && !loading && !error && markers.length > 0 && (
          <MapContainer
            className="leaflet-map"
            center={POLAND_CENTER}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom={expanded}
          >
            <TileLayer
              attribution={tileProvider.attribution}
              url={tileProvider.url}
              maxZoom={tileProvider.maxZoom}
            />
            <FitBounds markers={markers} />
            {markers.map(marker => (
              <Marker
                key={`${marker.markerType}-${marker.id}`}
                position={[marker.gpsLatitude, marker.gpsLongitude]}
                icon={getMarkerIcon(marker)}
              >
                <Tooltip>{marker.title}</Tooltip>
                <Popup>
                  <div className="task-popup">
                    <h4>{marker.title}</h4>
                    <p className="task-number">{marker.number}</p>
                    {marker.location && (
                      <p className="task-location">📍 {marker.location}</p>
                    )}
                    {marker.assetType && (
                      <p className="task-type">🔧 {marker.assetType}</p>
                    )}
                    {marker.contractNumber && (
                      <p className="task-contract">📋 {marker.contractNumber}</p>
                    )}
                    <div className="popup-actions">
                      <button
                        className="btn btn-primary"
                        onClick={() => handleNavigate(marker)}
                      >
                        🧭 Nawiguj
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleView(marker)}
                      >
                        🗺️ Zobacz
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
};
