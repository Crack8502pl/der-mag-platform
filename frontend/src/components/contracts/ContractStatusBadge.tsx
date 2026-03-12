// src/components/contracts/ContractStatusBadge.tsx
// Status badge component for contract statuses

import React from 'react';

interface Props {
  status: string;
}

const statusConfig: Record<string, { label: string; className: string; icon: string }> = {
  CREATED: { label: 'Utworzony', className: 'status-created', icon: '📝' },
  PENDING_CONFIGURATION: { label: 'Do konfiguracji', className: 'status-pending-config', icon: '⚠️' },
  APPROVED: { label: 'Zatwierdzony', className: 'status-approved', icon: '✅' },
  IN_PROGRESS: { label: 'W realizacji', className: 'status-in-progress', icon: '🔄' },
  COMPLETED: { label: 'Zakończony', className: 'status-completed', icon: '🏁' },
  CANCELLED: { label: 'Anulowany', className: 'status-cancelled', icon: '❌' },
  ACTIVE: { label: 'Aktywny', className: 'status-active', icon: '🟢' },
  INACTIVE: { label: 'Nieaktywny', className: 'status-inactive', icon: '⚪' }
};

export const ContractStatusBadge: React.FC<Props> = ({ status }) => {
  const config = statusConfig[status] || { label: status, className: 'status-unknown', icon: '❓' };
  
  return (
    <span className={`status-badge ${config.className}`}>
      {config.icon} {config.label}
    </span>
  );
};
