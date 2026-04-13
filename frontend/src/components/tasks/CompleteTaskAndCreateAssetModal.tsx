// src/components/tasks/CompleteTaskAndCreateAssetModal.tsx
// Modal for completing an installation task and creating an asset

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocationPicker } from '../common/LocationPicker';
import taskService from '../../services/task.service';
import type { Task } from '../../types/task.types';
import type { GPSCoordinates } from '../../hooks/useGoogleMaps';
import './CompleteTaskAndCreateAssetModal.css';

interface Props {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
}

interface BomMaterial {
  materialName: string;
  catalogNumber?: string;
  plannedQuantity?: number;
  quantity?: number;
  unit?: string;
  category?: string;
  serialNumbers?: string[];
}

const PRZEJAZD_CATEGORIES = ['KAT A', 'KAT B', 'KAT C', 'KAT D'];

function buildDefaultName(task: Task): string {
  const linia = task.metadata?.liniaKolejowa || '';
  const km = task.metadata?.kilometraz || '';
  const typeCode = task.taskType?.code || '';
  if (linia && km) {
    return `${typeCode} ${linia} km ${km}`.trim();
  }
  return task.title || '';
}

export const CompleteTaskAndCreateAssetModal: React.FC<Props> = ({ task, onClose, onSuccess }) => {
  const navigate = useNavigate();

  const taskTypeCode = task.taskType?.code || '';
  const isPrzejazd = taskTypeCode === 'PRZEJAZD';

  const [formData, setFormData] = useState({
    name: buildDefaultName(task),
    category: isPrzejazd ? 'KAT A' : '',
    liniaKolejowa: task.metadata?.liniaKolejowa || '',
    kilometraz: task.metadata?.kilometraz || '',
    miejscowosc: '',
    notes: '',
    actualInstallationDate: new Date().toISOString().split('T')[0],
    warrantyExpiryDate: '',
    googleMapsUrl: task.googleMapsUrl || '',
  });

  const [gpsCoords, setGpsCoords] = useState<GPSCoordinates | null>(
    task.gpsLatitude != null && task.gpsLongitude != null
      ? { lat: Number(task.gpsLatitude), lon: Number(task.gpsLongitude) }
      : null
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Success state
  const [successData, setSuccessData] = useState<{
    assetId: number;
    assetNumber: string;
    taskNumber: string;
  } | null>(null);

  const bomMaterials: BomMaterial[] = task.metadata?.bomMaterials || [];

  // Group BOM by category
  const bomByCategory = bomMaterials.reduce<Record<string, BomMaterial[]>>((acc, mat) => {
    const cat = mat.category || 'Inne';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(mat);
    return acc;
  }, {});

  const deviceSerialNumbers: string[] = bomMaterials
    .flatMap((m) => (Array.isArray(m.serialNumbers) ? m.serialNumbers : []))
    .filter(Boolean);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validate = (): string | null => {
    if (!formData.name.trim()) return 'Nazwa obiektu jest wymagana';
    if (isPrzejazd && !formData.category) return 'Kategoria jest wymagana dla przejazdów';
    if (
      gpsCoords !== null &&
      (isNaN(gpsCoords.lat) || isNaN(gpsCoords.lon) ||
        gpsCoords.lat < -90 || gpsCoords.lat > 90 ||
        gpsCoords.lon < -180 || gpsCoords.lon > 180)
    ) {
      return 'Nieprawidłowe współrzędne GPS';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload: Parameters<typeof taskService.completeAndCreateAsset>[1] = {
        assetData: {
          name: formData.name.trim(),
          liniaKolejowa: formData.liniaKolejowa || undefined,
          kilometraz: formData.kilometraz || undefined,
          gpsLatitude: gpsCoords?.lat ?? null,
          gpsLongitude: gpsCoords?.lon ?? null,
          googleMapsUrl: formData.googleMapsUrl || undefined,
          miejscowosc: formData.miejscowosc || undefined,
          notes: formData.notes || undefined,
          actualInstallationDate: formData.actualInstallationDate || undefined,
          warrantyExpiryDate: formData.warrantyExpiryDate || undefined,
          category: isPrzejazd && formData.category ? formData.category : undefined,
        },
        deviceSerialNumbers: deviceSerialNumbers.length > 0 ? deviceSerialNumbers : undefined,
      };

      const result = await taskService.completeAndCreateAsset(task.taskNumber, payload);

      setSuccessData({
        assetId: result.asset.id,
        assetNumber: result.asset.assetNumber,
        taskNumber: result.task.taskNumber,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd podczas zakończenia zadania');
    } finally {
      setLoading(false);
    }
  };

  // --- Success dialog ---
  if (successData) {
    return (
      <div className="complete-task-modal modal-overlay" onClick={onSuccess}>
        <div className="modal-content complete-task-success-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>✅ Zadanie zakończone!</h2>
            <button className="modal-close" onClick={onSuccess} aria-label="Zamknij">✕</button>
          </div>
          <div className="modal-form">
            <div className="complete-task-success-info">
              <p>
                Zadanie <strong>{successData.taskNumber}</strong> zostało oznaczone jako zakończone.
              </p>
              <p>
                Utworzono nowy obiekt infrastruktury:{' '}
                <strong className="asset-number-highlight">{successData.assetNumber}</strong>
              </p>
            </div>
          </div>
          <div className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={() => {
                onSuccess();
              }}
            >
              OK
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                onSuccess();
                navigate(`/assets/${successData.assetId}`);
              }}
            >
              👁️ Zobacz obiekt
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Main form ---
  return (
    <div className="complete-task-modal modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🏁 Zakończ zadanie: {task.taskNumber}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Zamknij">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-form">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="complete-task-info-bar">
              <span>✅ Zadanie zostanie oznaczone jako zakończone</span>
              <span>🏗️ Zostanie utworzony nowy obiekt infrastruktury</span>
            </div>

            <div className="form-section-title">─── Dane obiektu ───</div>

            {/* Name */}
            <div className="form-group">
              <label>
                Nazwa obiektu <span className="required">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Np. Przejazd LK-123 km 45,678"
                required
              />
            </div>

            {/* Category - only for PRZEJAZD */}
            {isPrzejazd && (
              <div className="form-group">
                <label>
                  Kategoria <span className="required">*</span>{' '}
                  <span className="form-label-hint">(tylko dla przejazdów)</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  required
                >
                  {PRZEJAZD_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Linia kolejowa + kilometraz */}
            <div className="form-row-2">
              <div className="form-group">
                <label>Linia kolejowa</label>
                <input
                  type="text"
                  value={formData.liniaKolejowa}
                  onChange={(e) => handleChange('liniaKolejowa', e.target.value)}
                  placeholder="Np. LK-123"
                />
              </div>
              <div className="form-group">
                <label>Kilometraż</label>
                <input
                  type="text"
                  value={formData.kilometraz}
                  onChange={(e) => handleChange('kilometraz', e.target.value)}
                  placeholder="Np. 45,678"
                />
              </div>
            </div>

            {/* GPS */}
            <div className="form-group">
              <label>GPS (opcjonalne)</label>
              <LocationPicker
                value={gpsCoords}
                googleMapsUrl={formData.googleMapsUrl}
                onChange={(coords) => setGpsCoords(coords)}
                onGoogleMapsUrlChange={(url) => handleChange('googleMapsUrl', url)}
                placeholder="Wklej link Google Maps lub współrzędne GPS"
                showNavigationButton={false}
              />
            </div>

            {/* Miejscowość */}
            <div className="form-group">
              <label>Miejscowość</label>
              <input
                type="text"
                value={formData.miejscowosc}
                onChange={(e) => handleChange('miejscowosc', e.target.value)}
                placeholder="Np. Warszawa"
              />
            </div>

            {/* Dates */}
            <div className="form-row-2">
              <div className="form-group">
                <label>Data instalacji</label>
                <input
                  type="date"
                  value={formData.actualInstallationDate}
                  onChange={(e) => handleChange('actualInstallationDate', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Data wygaśnięcia gwarancji</label>
                <input
                  type="date"
                  value={formData.warrantyExpiryDate}
                  onChange={(e) => handleChange('warrantyExpiryDate', e.target.value)}
                />
              </div>
            </div>

            {/* BOM Preview */}
            {bomMaterials.length > 0 && (
              <>
                <div className="form-section-title">─── BOM zainstalowane ───</div>
                <div className="bom-preview-section">
                  <p className="bom-preview-hint">
                    System automatycznie połączy urządzenia po numerach seryjnych:
                  </p>
                  {Object.entries(bomByCategory).map(([cat, materials]) => (
                    <div key={cat} className="bom-category-group">
                      <div className="bom-category-label">{cat}</div>
                      {materials.map((mat, idx) => (
                        <div key={idx} className="bom-material-row">
                          <span className="bom-material-name">{mat.materialName}</span>
                          <span className="bom-material-qty">
                            × {mat.plannedQuantity || mat.quantity} {mat.unit || ''}
                          </span>
                          {Array.isArray(mat.serialNumbers) && mat.serialNumbers.length > 0 && (
                            <div className="bom-serial-numbers">
                              {mat.serialNumbers.map((sn, snIdx) => (
                                <span key={snIdx} className="bom-serial-badge">
                                  {sn}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Notes */}
            <div className="form-group">
              <label>Notatki</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Opcjonalne uwagi do instalacji..."
                rows={3}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="btn btn-success"
              disabled={loading}
            >
              {loading ? '⏳ Zapisywanie...' : '✅ Zakończ i utwórz obiekt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
