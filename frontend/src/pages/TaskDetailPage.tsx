import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { taskApi } from '../services/api';
import type { Task } from '../types';

const TaskDetailPage = () => {
  const { taskNumber } = useParams<{ taskNumber: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (taskNumber) {
      loadTask();
    }
  }, [taskNumber]);

  const loadTask = async () => {
    if (!taskNumber) return;

    try {
      setIsLoading(true);
      const response = await taskApi.getById(taskNumber);
      if (response.success && response.data) {
        setTask(response.data);
      }
    } catch (err) {
      console.error('Failed to load task:', err);
      setError('Nie udało się załadować zadania');
    } finally {
      setIsLoading(false);
    }
  };

  const statusLabels: Record<string, string> = {
    created: 'Utworzone',
    assigned: 'Przypisane',
    started: 'Rozpoczęte',
    in_progress: 'W trakcie',
    completed: 'Zakończone',
    cancelled: 'Anulowane',
  };

  const priorityLabels: Record<string, string> = {
    low: 'Niski',
    medium: 'Średni',
    high: 'Wysoki',
    urgent: 'Pilny',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Ładowanie...</div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div>
        <Link to="/tasks" className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block">
          ← Powrót do listy zadań
        </Link>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-red-800">{error || 'Zadanie nie znalezione'}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/tasks" className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block">
        ← Powrót do listy zadań
      </Link>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
              <p className="text-sm text-gray-500 mt-1">Numer zadania: {task.taskNumber}</p>
            </div>
            <span
              className={`px-3 py-1 text-sm font-semibold rounded-full ${
                task.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : task.status === 'in_progress'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {statusLabels[task.status] || task.status}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Typ zadania</h3>
              <p className="text-base text-gray-900">{task.taskType?.name}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Priorytet</h3>
              <p className="text-base text-gray-900">
                {priorityLabels[task.priority] || task.priority}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Lokalizacja</h3>
              <p className="text-base text-gray-900">{task.location || '-'}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Klient</h3>
              <p className="text-base text-gray-900">{task.client || '-'}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Planowany start</h3>
              <p className="text-base text-gray-900">
                {task.plannedStart
                  ? new Date(task.plannedStart).toLocaleDateString('pl-PL')
                  : '-'}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Planowane zakończenie</h3>
              <p className="text-base text-gray-900">
                {task.plannedEnd ? new Date(task.plannedEnd).toLocaleDateString('pl-PL') : '-'}
              </p>
            </div>

            {task.actualStart && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Faktyczny start</h3>
                <p className="text-base text-gray-900">
                  {new Date(task.actualStart).toLocaleDateString('pl-PL')}
                </p>
              </div>
            )}

            {task.actualEnd && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Faktyczne zakończenie
                </h3>
                <p className="text-base text-gray-900">
                  {new Date(task.actualEnd).toLocaleDateString('pl-PL')}
                </p>
              </div>
            )}
          </div>

          {task.description && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Opis</h3>
              <p className="text-base text-gray-900 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between text-sm text-gray-500">
              <div>
                Utworzono: {new Date(task.createdAt).toLocaleString('pl-PL')}
              </div>
              <div>
                Zaktualizowano: {new Date(task.updatedAt).toLocaleString('pl-PL')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailPage;
