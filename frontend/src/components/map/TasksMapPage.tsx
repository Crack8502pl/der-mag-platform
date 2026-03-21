// src/components/map/TasksMapPage.tsx
// Main map page - sidebar with task list + OpenStreetMap view

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import { api } from '../../services/api';
import './TasksMapPage.css';

// Fix Leaflet default icons (known bundler issue)
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

const POLAND_CENTER: [number, number] = [52.0693, 19.4803];
const DEFAULT_ZOOM = 6;

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

// Component to fly to selected task
const FlyToTask: React.FC<{ task: TaskWithGps | null }> = ({ task }) => {
  const map = useMap();
  useEffect(() => {
    if (task) {
      map.flyTo([task.gpsLatitude, task.gpsLongitude], 16, { duration: 1.5 });
    }
  }, [task, map]);
  return null;
};

// Component to fit all markers in view
const FitAllMarkers: React.FC<{ tasks: TaskWithGps[]; selectedTask: TaskWithGps | null }> = ({ tasks, selectedTask }) => {
  const map = useMap();
  useEffect(() => {
    if (!selectedTask && tasks.length > 0) {
      const bounds = L.latLngBounds(tasks.map(t => [t.gpsLatitude, t.gpsLongitude] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [tasks, selectedTask, map]);
  return null;
};

const openNavigation = (lat: number, lon: number) => {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
};

const openLocation = (lat: number, lon: number) => {
  window.open(`https://www.google.com/maps/@${lat},${lon},17z`, '_blank');
};

export const TasksMapPage: React.FC = () => {
  const [tasks, setTasks] = useState<TaskWithGps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile());
  const [selectedTask, setSelectedTask] = useState<TaskWithGps | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<{ success: boolean; data: TaskWithGps[] }>('/tasks/with-gps');
        if (response.data.success) {
          setTasks(
            response.data.data.map(t => ({
              ...t,
              gpsLatitude: Number(t.gpsLatitude),
              gpsLongitude: Number(t.gpsLongitude),
            }))
          );
        } else {
          setError('Nie udało się pobrać zadań z GPS');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Błąd pobierania zadań z GPS');
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const handleTaskClick = (task: TaskWithGps) => {
    setSelectedTask(task);
    if (isMobile()) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="map-page">
      {/* Header */}
      <header className="map-header">
        <div className="map-header-left">
          <button
            className="btn sidebar-toggle"
            onClick={() => setSidebarOpen(prev => !prev)}
            aria-label={sidebarOpen ? 'Ukryj sidebar' : 'Pokaż sidebar'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <BackButton />
          <div className="map-header-title">
            <ModuleIcon name="map" emoji={MODULE_ICONS.map} size={24} alt="Mapa zadań" />
            <h1>MAPA ZADAŃ</h1>
          </div>
        </div>
        {!loading && !error && (
          <span className="map-count-badge">{tasks.length} lokalizacji</span>
        )}
      </header>

      {/* Body */}
      <div className="map-layout">
        {/* Mobile overlay */}
        {sidebarOpen && isMobile() && (
          <div
            className="map-sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`map-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="sidebar-header">
            <h2>📋 ZADANIA Z GPS</h2>
          </div>
          <div className="sidebar-body">
            {loading && (
              <div className="sidebar-loading">Ładowanie zadań…</div>
            )}
            {!loading && error && (
              <div className="sidebar-error">{error}</div>
            )}
            {!loading && !error && tasks.length === 0 && (
              <div className="sidebar-empty">Brak zadań z lokalizacją GPS</div>
            )}
            {!loading && !error && tasks.map(task => (
              <button
                key={task.id}
                className={`sidebar-task-card${selectedTask?.id === task.id ? ' selected' : ''}`}
                onClick={() => handleTaskClick(task)}
              >
                <div className="task-card-header">
                  <span className="task-card-number">{task.taskNumber}</span>
                </div>
                <div className="task-card-title">{task.title}</div>
                {task.location && (
                  <div className="task-card-location">📍 {task.location}</div>
                )}
                {task.taskType && (
                  <span className="task-card-type">🏷️ {task.taskType}</span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Map */}
        <main className="map-main">
          <div className="map-container">
            {!loading && !error && tasks.length === 0 && (
              <div className="map-empty-state">
                <ModuleIcon name="map" emoji={MODULE_ICONS.map} size={64} alt="Mapa" />
                <h2>Brak zadań z GPS</h2>
                <p>Dodaj współrzędne GPS do zadań, aby zobaczyć je na mapie.</p>
              </div>
            )}
            {!loading && (error || tasks.length > 0) && (
              <MapContainer
                className="leaflet-map"
                center={POLAND_CENTER}
                zoom={DEFAULT_ZOOM}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FlyToTask task={selectedTask} />
                <FitAllMarkers tasks={tasks} selectedTask={selectedTask} />
                {tasks.map(task => (
                  <Marker
                    key={task.id}
                    position={[task.gpsLatitude, task.gpsLongitude]}
                  >
                    <Tooltip>{task.title}</Tooltip>
                    <Popup>
                      <div className="task-popup">
                        <p className="popup-task-number">{task.taskNumber}</p>
                        <h4>{task.title}</h4>
                        {task.location && (
                          <p className="popup-info">📍 {task.location}</p>
                        )}
                        {task.taskType && (
                          <p className="popup-info">🏷️ {task.taskType}</p>
                        )}
                        {task.contractNumber && (
                          <p className="popup-info">📋 {task.contractNumber}</p>
                        )}
                        <div className="popup-actions">
                          <button
                            className="btn btn-primary"
                            onClick={() => openNavigation(task.gpsLatitude, task.gpsLongitude)}
                          >
                            🧭 Nawiguj
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => openLocation(task.gpsLatitude, task.gpsLongitude)}
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
        </main>
      </div>
    </div>
  );
};
