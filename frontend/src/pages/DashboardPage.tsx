import { useState, useEffect } from 'react';
import { metricsApi } from '../services/api';
import type { DashboardMetrics } from '../types';

const DashboardPage = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      const response = await metricsApi.getDashboard();
      if (response.success && response.data) {
        setMetrics(response.data);
      }
    } catch (err) {
      console.error('Failed to load metrics:', err);
      setError('Nie udało się załadować metryk');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Ładowanie...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500 mb-2">Wszystkie zadania</div>
          <div className="text-3xl font-bold text-gray-900">{metrics?.total || 0}</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500 mb-2">Aktywne</div>
          <div className="text-3xl font-bold text-blue-600">{metrics?.active || 0}</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500 mb-2">Zakończone</div>
          <div className="text-3xl font-bold text-green-600">{metrics?.completed || 0}</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500 mb-2">Dzisiaj</div>
          <div className="text-3xl font-bold text-purple-600">{metrics?.today || 0}</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks by Type */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Zadania według typu</h2>
          <div className="space-y-3">
            {metrics?.byType && metrics.byType.length > 0 ? (
              metrics.byType.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{item.taskType || 'Nieznany'}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Brak danych</p>
            )}
          </div>
        </div>

        {/* Tasks by Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Zadania według statusu</h2>
          <div className="space-y-3">
            {metrics?.byStatus && metrics.byStatus.length > 0 ? (
              metrics.byStatus.map((item, index) => {
                const statusLabels: Record<string, string> = {
                  created: 'Utworzone',
                  assigned: 'Przypisane',
                  started: 'Rozpoczęte',
                  in_progress: 'W trakcie',
                  completed: 'Zakończone',
                  cancelled: 'Anulowane',
                };
                
                return (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {statusLabels[item.status] || item.status}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-sm">Brak danych</p>
            )}
          </div>
        </div>
      </div>

      {/* Average Completion Time */}
      {metrics?.avgCompletionTime && metrics.avgCompletionTime > 0 && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Średni czas realizacji
          </h2>
          <p className="text-3xl font-bold text-indigo-600">
            {Math.round(metrics.avgCompletionTime / 3600)} godz.
          </p>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
