// src/components/tasks/TaskListPage.tsx
// Main tasks list page with CRUD operations

import React, { useState, useEffect } from 'react';
import { BackButton } from '../common/BackButton';
import { TaskCreateModal } from './TaskCreateModal';
import { TaskEditModal } from './TaskEditModal';
import { TaskDetailModal } from './TaskDetailModal';
import { TaskStatusBadge } from './TaskStatusBadge';
import { useAuth } from '../../hooks/useAuth';
import taskService from '../../services/task.service';
import type { Task, TaskType } from '../../types/task.types';
import './TaskListPage.css';

export const TaskListPage: React.FC = () => {
  const { hasPermission } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTaskType, setFilterTaskType] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const itemsPerPage = 20;
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTaskNumber, setViewingTaskNumber] = useState<string | null>(null);

  // Permission checks
  const canCreate = hasPermission('tasks', 'create');
  const canUpdate = hasPermission('tasks', 'update');
  const canDelete = hasPermission('tasks', 'delete');

  useEffect(() => {
    loadTaskTypes();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [searchTerm, filterStatus, filterTaskType, sortBy, sortOrder, currentPage]);

  const loadTaskTypes = async () => {
    try {
      const types = await taskService.getTaskTypes();
      setTaskTypes(types.filter(t => t.active));
    } catch (err: any) {
      console.error('Error loading task types:', err);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy,
        sortOrder
      };
      
      if (searchTerm) params.search = searchTerm;
      if (filterStatus) params.status = filterStatus;
      if (filterTaskType) params.taskTypeId = filterTaskType;
      
      const response = await taskService.getAll(params);
      
      setTasks(response.data);
      setTotalTasks(response.pagination.total);
      setTotalPages(response.pagination.pages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania zadań');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (taskNumber: string, title: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć zadanie "${title}"?`)) return;
    
    try {
      await taskService.delete(taskNumber);
      setSuccess('Zadanie usunięte pomyślnie');
      loadTasks();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd usuwania zadania');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'ASC' ? '↑' : '↓';
  };

  const handleTaskCreated = () => {
    setShowCreateModal(false);
    setSuccess('Zadanie utworzone pomyślnie');
    loadTasks();
    setTimeout(() => setSuccess(''), 5000);
  };

  const handleTaskUpdated = () => {
    setEditingTask(null);
    setSuccess('Zadanie zaktualizowane pomyślnie');
    loadTasks();
    setTimeout(() => setSuccess(''), 5000);
  };

  const getPriorityDisplay = (priority: number) => {
    if (priority === 0) return 'Normalny';
    return '⭐'.repeat(priority);
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="module-page">
        <BackButton to="/dashboard" />
        <div className="loading">Ładowanie...</div>
      </div>
    );
  }

  return (
    <div className="module-page">
      <BackButton to="/dashboard" />
      
      <div className="module-header">
        <div className="module-icon">📋</div>
        <h1>Zadania</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Toolbar */}
      <div className="tasks-toolbar card">
        <div className="toolbar-row">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Szukaj po numerze, tytule lub opisie..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          <div className="toolbar-buttons">
            {canCreate && (
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                + Nowe zadanie
              </button>
            )}
          </div>
        </div>
        
        <div className="toolbar-filters">
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Wszystkie statusy</option>
            <option value="created">Utworzone</option>
            <option value="assigned">Przypisane</option>
            <option value="in_progress">W realizacji</option>
            <option value="on_hold">Wstrzymane</option>
            <option value="completed">Zakończone</option>
            <option value="cancelled">Anulowane</option>
          </select>

          <select
            className="filter-select"
            value={filterTaskType}
            onChange={(e) => {
              setFilterTaskType(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Wszystkie typy</option>
            {taskTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          
          <div className="tasks-count">
            Znaleziono: <strong>{totalTasks}</strong> {totalTasks === 1 ? 'zadanie' : 'zadań'}
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="tasks-table-container card">
        <table className="tasks-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('taskNumber')} className="sortable">
                Numer {getSortIcon('taskNumber')}
              </th>
              <th onClick={() => handleSort('title')} className="sortable">
                Tytuł {getSortIcon('title')}
              </th>
              <th onClick={() => handleSort('taskType')} className="sortable">
                Typ {getSortIcon('taskType')}
              </th>
              <th onClick={() => handleSort('status')} className="sortable">
                Status {getSortIcon('status')}
              </th>
              <th onClick={() => handleSort('priority')} className="sortable">
                Priorytet {getSortIcon('priority')}
              </th>
              <th>Kontrakt</th>
              <th onClick={() => handleSort('createdAt')} className="sortable">
                Data utworzenia {getSortIcon('createdAt')}
              </th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  Brak zadań do wyświetlenia
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <code className="task-number">{task.taskNumber}</code>
                  </td>
                  <td>
                    <span 
                      className="task-title clickable"
                      onClick={() => setViewingTaskNumber(task.taskNumber)}
                    >
                      {task.title}
                    </span>
                  </td>
                  <td>{task.taskType?.name || 'N/A'}</td>
                  <td>
                    <TaskStatusBadge status={task.status} />
                  </td>
                  <td>{getPriorityDisplay(task.priority)}</td>
                  <td>
                    {task.contractNumber ? (
                      <code className="contract-number">{task.contractNumber}</code>
                    ) : (
                      <span style={{ color: '#999' }}>—</span>
                    )}
                  </td>
                  <td>
                    {new Date(task.createdAt).toLocaleDateString('pl-PL')}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn btn-icon" 
                        title="Podgląd"
                        onClick={() => setViewingTaskNumber(task.taskNumber)}
                      >
                        👁️
                      </button>
                      {canUpdate && (
                        <button 
                          className="btn btn-icon" 
                          title="Edytuj"
                          onClick={() => setEditingTask(task)}
                        >
                          ✏️
                        </button>
                      )}
                      {canDelete && (
                        <button 
                          className="btn btn-icon btn-danger" 
                          title="Usuń"
                          onClick={() => handleDelete(task.taskNumber, task.title)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-secondary"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            ← Poprzednia
          </button>
          <span className="page-info">
            Strona {currentPage} z {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Następna →
          </button>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <TaskCreateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleTaskCreated}
        />
      )}

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSuccess={handleTaskUpdated}
        />
      )}

      {viewingTaskNumber && (
        <TaskDetailModal
          taskNumber={viewingTaskNumber}
          onClose={() => setViewingTaskNumber(null)}
        />
      )}
    </div>
  );
};
