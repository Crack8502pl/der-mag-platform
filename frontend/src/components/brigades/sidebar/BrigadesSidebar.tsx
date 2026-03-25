// src/components/brigades/sidebar/BrigadesSidebar.tsx
// Collapsible sidebar for brigades module

import React from 'react';

export type BrigadesTab = 'brigades' | 'workers' | 'schedule';

interface BrigadesSidebarProps {
  activeTab: BrigadesTab;
  onTabChange: (tab: BrigadesTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const TAB_ITEMS: { key: BrigadesTab; icon: string; label: string }[] = [
  { key: 'brigades', icon: '👥', label: 'Brygady' },
  { key: 'workers', icon: '👤', label: 'Pracownicy' },
  { key: 'schedule', icon: '📅', label: 'Harmonogram' },
];

export const BrigadesSidebar: React.FC<BrigadesSidebarProps> = ({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
}) => {
  return (
    <aside className={`brigades-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="brigades-sidebar-nav">
        {TAB_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`brigades-sidebar-item ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => onTabChange(item.key)}
            title={collapsed ? item.label : undefined}
          >
            <span className="brigades-sidebar-icon">{item.icon}</span>
            {!collapsed && <span className="brigades-sidebar-label">{item.label}</span>}
          </button>
        ))}
      </div>

      <button
        className="brigades-sidebar-toggle"
        onClick={onToggleCollapse}
        title={collapsed ? 'Rozwiń sidebar' : 'Zwiń sidebar'}
      >
        <span className="toggle-icon">{collapsed ? '▶' : '◀'}</span>
        {!collapsed && <span className="toggle-label">Zwiń</span>}
      </button>
    </aside>
  );
};
