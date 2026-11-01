// src/components/users/UserRoleAndFunctions.tsx
// „Rola: X” oraz funkcje osoby jako etykiety

import React from 'react';

interface Props {
  roleName?: string | null;
  functionGroups?: Array<{ key: string; name: string }> | null;
  roleClassName?: string;
}

export const UserRoleAndFunctions: React.FC<Props> = ({ roleName, functionGroups, roleClassName = 'badge' }) => (
  <div className="user-role-functions" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
    <span className={roleClassName}>Rola: {roleName || 'N/A'}</span>
    {(functionGroups ?? []).map((group) => (
      <span
        key={group.key}
        className="function-group-label"
        title={`Funkcja: ${group.name}`}
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '999px',
          border: '1px solid currentColor',
          fontSize: '0.8em',
          opacity: 0.85,
        }}
      >
        {group.name}
      </span>
    ))}
  </div>
);
