// src/components/tasks/TaskStatusBadge.tsx
// Status badge component for task statuses

import React from 'react';

interface Props {
  status: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  created: { label: 'Utworzone', color: '#6c757d', icon: '📝' },
  assigned: { label: 'Przypisane', color: '#17a2b8', icon: '👤' },
  in_progress: { label: 'W realizacji', color: '#ffc107', icon: '🔄' },
  on_hold: { label: 'Wstrzymane', color: '#dc3545', icon: '⏸️' },
  completed: { label: 'Zakończone', color: '#28a745', icon: '✅' },
  cancelled: { label: 'Anulowane', color: '#6c757d', icon: '❌' },
  configured: { label: 'Skonfigurowane', color: '#8b5cf6', icon: '⚙️' },
  ready_for_completion: { label: 'Do kompletacji', color: '#06b6d4', icon: '📦' }
};

export const TaskStatusBadge: React.FC<Props> = ({ status }) => {
  const config = statusConfig[status] || { label: status, color: '#6c757d', icon: '❓' };
  
  return (
    <span 
      className="status-badge" 
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
        border: `1px solid ${config.color}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap'
      }}
    >
      {config.icon} {config.label}
    </span>
  );
};
