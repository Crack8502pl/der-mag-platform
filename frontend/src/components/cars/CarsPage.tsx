// src/components/cars/CarsPage.tsx
// Strona zarządzania samochodami firmowymi

import React, { useState, useEffect } from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import carsService, { type Car } from '../../services/cars.service';
import '../../styles/grover-theme.css';

export const CarsPage: React.FC = () => {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const loadCars = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await carsService.getAll();
      setCars(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Błąd ładowania listy samochodów');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCars();
  }, []);

  const handleToggleBrigade = async (car: Car) => {
    if (togglingId === car.id) return;
    setTogglingId(car.id);
    setError('');
    setSuccess('');
    try {
      const updatedCar = await carsService.toggleBrigade(car.id, !car.brigadeId);
      setCars(prev => prev.map(c => (c.id === car.id ? updatedCar : c)));
      setSuccess(
        updatedCar.brigadeId
          ? `✅ Utworzono brygadę: ${updatedCar.registration}`
          : `✅ Odłączono brygadę od samochodu: ${updatedCar.registration}`
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Błąd przy zmianie brygady');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <BackButton to="/dashboard" />
        <h1 className="page-title">
          <ModuleIcon name="cars" emoji={MODULE_ICONS.cars} size={28} />
          Samochody
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
          Lista samochodów firmowych zsynchronizowanych z Symfonii
        </p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          ❌ {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          {success}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Lista samochodów</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {!loading && `${cars.length} samochodów`}
          </span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <p style={{ padding: '1rem', color: 'var(--text-muted)' }}>Ładowanie...</p>
          ) : cars.length === 0 ? (
            <p style={{ padding: '1rem', color: 'var(--text-muted)' }}>
              Brak samochodów. Uruchom synchronizację z Symfonii w panelu administratora.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>LP</th>
                    <th>Rejestracja</th>
                    <th style={{ textAlign: 'center' }}>Brygada</th>
                  </tr>
                </thead>
                <tbody>
                  {cars.map(car => (
                    <tr key={car.id}>
                      <td>{car.symfoniaLp}</td>
                      <td style={{ textTransform: 'uppercase', fontWeight: 500 }}>
                        {car.registration}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!car.brigadeId}
                          onChange={() => handleToggleBrigade(car)}
                          disabled={togglingId === car.id}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                          title={
                            car.brigadeId
                              ? `Odłącz brygadę od ${car.registration}`
                              : `Utwórz brygadę dla ${car.registration}`
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
