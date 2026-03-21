// src/components/dashboard/TasksMapTile.tsx
// Kafelek mapy zadań z lokalizacjami GPS - Leaflet + OpenStreetMap

import React, { useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../../services/api';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
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

interface TaskWithGps {
  id: number;
  taskNumber: string;
  title: string;
  status: string;
  location: string;
  gpsLatitude: number;
  gpsLongitude: number;
  taskType?: string;
  contractNumber?: string;
}

// Centrum Polski jako domyślna pozycja mapy
const POLAND_CENTER: [number, number] = [52.0693, 19.4803];
const DEFAULT_ZOOM = 6;

// Komponent do auto-centrowania mapy na wszystkich markerach
const FitBounds: React.FC<{ tasks: TaskWithGps[] }> = ({ tasks }) => {
  const map = useMap();

  useEffect(() => {
    if (tasks.length > 0) {
      const bounds = L.latLngBounds(
        tasks.map(t => [t.gpsLatitude, t.gpsLongitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [tasks, map]);

  return null;
};

export const TasksMapTile: React.FC = () => {
  const [tasks, setTasks] = useState<TaskWithGps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const { openNavigation, openLocation } = useGoogleMaps();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; data: TaskWithGps[] }>('/tasks/with-gps');
      if (response.data.success) {
        setTasks(response.data.data.map(t => ({
          ...t,
          gpsLatitude: Number(t.gpsLatitude),
          gpsLongitude: Number(t.gpsLongitude),
        })));
      } else {
        setError('Nie udało się pobrać zadań z GPS');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania zadań z GPS');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleNavigate = (task: TaskWithGps) => {
    openNavigation({ lat: task.gpsLatitude, lon: task.gpsLongitude });
  };

  const handleView = (task: TaskWithGps) => {
    openLocation({ lat: task.gpsLatitude, lon: task.gpsLongitude });
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
        <span className="tile-icon">🗺️</span>
        <span className="tile-title">Mapa Zadań</span>
        {!loading && !error && (
          <span className="tile-count">{tasks.length} lokalizacji</span>
        )}
        <button
          className="btn-expand"
          onClick={() => setExpanded(prev => !prev)}
          title={expanded ? 'Zwiń mapę' : 'Rozwiń mapę'}
        >
          {expanded ? '⬇️' : '⬆️'}
        </button>
      </div>

      <div className="tile-map-container">
        {loading && (
          <div className="tile-content tile-state">
            <span>Ładowanie mapy…</span>
          </div>
        )}

        {!loading && error && (
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

        {!loading && !error && tasks.length === 0 && (
          <div className="tile-content tile-state no-tasks">
            <span>Brak zadań z lokalizacją GPS</span>
          </div>
        )}

        {!loading && !error && tasks.length > 0 && (
          <MapContainer
            className="leaflet-map"
            center={POLAND_CENTER}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom={expanded}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds tasks={tasks} />
            {tasks.map(task => (
              <Marker
                key={task.id}
                position={[task.gpsLatitude, task.gpsLongitude]}
              >
                <Tooltip>{task.title}</Tooltip>
                <Popup>
                  <div className="task-popup">
                    <h4>{task.title}</h4>
                    <p className="task-number">{task.taskNumber}</p>
                    {task.location && (
                      <p className="task-location">📍 {task.location}</p>
                    )}
                    {task.taskType && (
                      <p className="task-type">🔧 {task.taskType}</p>
                    )}
                    {task.contractNumber && (
                      <p className="task-contract">📋 {task.contractNumber}</p>
                    )}
                    <div className="popup-actions">
                      <button
                        className="btn btn-primary"
                        onClick={() => handleNavigate(task)}
                      >
                        🧭 Nawiguj
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleView(task)}
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
