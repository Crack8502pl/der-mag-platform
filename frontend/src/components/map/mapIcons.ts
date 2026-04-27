// src/components/map/mapIcons.ts
// Kolorowe ikony markerów mapy dla różnych typów obiektów

import L from 'leaflet';

const createCircleIcon = (color: string, pulse = false): L.DivIcon => {
  const html = `<div class="map-marker-dot${pulse ? ' marker-pulse' : ''}" style="background:${color};"></div>`;
  return L.divIcon({
    className: 'map-marker-container',
    html,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
};

export const taskIcon = createCircleIcon('#3b82f6');
export const serviceTaskIcon = createCircleIcon('#ff6b35');
export const highPriorityIcon = createCircleIcon('#ef4444', true);
export const assetIcon = createCircleIcon('#22c55e');

export interface MapMarker {
  id: number;
  markerType: 'task' | 'service_task' | 'asset';
  title: string;
  number: string;
  status: string;
  priority?: number;
  isHighPriority: boolean;
  gpsLatitude: number;
  gpsLongitude: number;
  location?: string;
  googleMapsUrl?: string;
  contractNumber?: string;
  assetType?: string;
}

export const getMarkerIcon = (marker: Pick<MapMarker, 'markerType' | 'isHighPriority'>) => {
  if (marker.isHighPriority) return highPriorityIcon;
  if (marker.markerType === 'task') return taskIcon;
  if (marker.markerType === 'service_task') return serviceTaskIcon;
  if (marker.markerType === 'asset') return assetIcon;
  return taskIcon;
};
