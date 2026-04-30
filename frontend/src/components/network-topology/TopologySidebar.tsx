// src/components/network-topology/TopologySidebar.tsx
// Sidebar panel for Network Topology Builder — task list with drag & drop, actions, legend

import React, { useState } from 'react';
import type { ConnectionTechnology } from '../../types/network-topology.types';
import { NODE_ICONS, TECHNOLOGY_COLORS, TECHNOLOGY_LABELS } from '../../types/network-topology.types';
import './TopologySidebar.css';

export interface SidebarTask {
  id: number;
  name: string;
  km?: number;
  technology?: ConnectionTechnology;
}

interface TopologySidebarProps {
  tasks: SidebarTask[];
  onAddAuxiliary: () => void;
  onAddExternal: () => void;
}

export const TopologySidebar: React.FC<TopologySidebarProps> = ({
  tasks,
  onAddAuxiliary,
  onAddExternal,
}) => {
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: SidebarTask) => {
    setDraggingId(task.id);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'task',
        taskId: task.id,
        label: task.name,
        km: task.km,
      }),
    );
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  return (
    <aside className="topology-sidebar">
      <div className="topology-sidebar-header">
        <span className="topology-sidebar-header-icon">📋</span>
        <span className="topology-sidebar-header-title">Zadania</span>
      </div>

      <div className="topology-sidebar-tasks">
        {tasks.length === 0 ? (
          <div className="topology-sidebar-empty">Brak zadań w kontrakcie</div>
        ) : (
          tasks.map(task => (
            <div
              key={task.id}
              className={`topology-sidebar-item${draggingId === task.id ? ' topology-sidebar-item--dragging' : ''}`}
              draggable
              onDragStart={e => handleDragStart(e, task)}
              onDragEnd={handleDragEnd}
              title={task.name}
            >
              <span className="topology-sidebar-item-icon">{NODE_ICONS.task}</span>
              <div className="topology-sidebar-item-info">
                <span className="topology-sidebar-item-name">{task.name}</span>
                {task.km !== undefined && (
                  <span className="topology-sidebar-item-km">km {task.km.toFixed(2)}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="topology-sidebar-actions">
        <button className="btn btn-secondary btn-sm topology-sidebar-action-btn" onClick={onAddAuxiliary}>
          {NODE_ICONS.auxiliary} Dodaj obiekt pomocniczy
        </button>
        <button className="btn btn-secondary btn-sm topology-sidebar-action-btn" onClick={onAddExternal}>
          {NODE_ICONS.external} Dodaj zewnętrzny
        </button>
      </div>

      <div className="topology-sidebar-legend">
        <div className="topology-sidebar-legend-title">Technologie</div>
        {(Object.keys(TECHNOLOGY_COLORS) as ConnectionTechnology[]).map(tech => (
          <div key={tech} className="topology-sidebar-legend-item">
            <span
              className="topology-sidebar-legend-dot"
              style={{ background: TECHNOLOGY_COLORS[tech] }}
            />
            <span className="topology-sidebar-legend-label">{TECHNOLOGY_LABELS[tech]}</span>
          </div>
        ))}
      </div>
    </aside>
  );
};
