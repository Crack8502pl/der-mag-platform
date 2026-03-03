// src/components/users/UserStatusBadge.tsx
// Status badge component for users

import React from 'react';

interface User {
  active: boolean;
  forcePasswordChange?: boolean;
  deletedAt?: string | null;
}

interface UserStatusBadgeProps {
  user: User;
}

export const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({ user }) => {
  if (user.deletedAt) {
    return (
      <div className="status-badges">
        <span className="status-badge status-deleted">
          🗑️ Usunięty
        </span>
      </div>
    );
  }

  return (
    <div className="status-badges">
      <span className={`status-badge ${user.active ? 'status-active' : 'status-inactive'}`}>
        {user.active ? '✓ Aktywny' : '✕ Nieaktywny'}
      </span>
      {user.forcePasswordChange && (
        <span className="status-badge status-warning" title="Wymaga zmiany hasła">
          🔑 Zmiana hasła
        </span>
      )}
    </div>
  );
};
