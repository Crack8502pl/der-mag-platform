// src/components/brigades/BrigadesPage.tsx
// Main brigades page with collapsible sidebar and three tabs

import React, { useState } from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import { BrigadesSidebar, type BrigadesTab } from './sidebar/BrigadesSidebar';
import { BrigadesTab as BrigadesTabContent } from './tabs/BrigadesTab';
import { WorkersTab } from './tabs/WorkersTab';
import { ScheduleTab } from './tabs/ScheduleTab';
import '../../styles/grover-theme.css';
import './BrigadesPage.css';

const TAB_TITLES: Record<BrigadesTab, string> = {
  brigades: 'Brygady',
  workers: 'Pracownicy',
  schedule: 'Harmonogram',
};

export const BrigadesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<BrigadesTab>('brigades');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="brigades-page">
      <div className="brigades-page-header">
        <BackButton to="/dashboard" />
        <div className="module-header-inline">
          <ModuleIcon name="brigades" emoji={MODULE_ICONS.brigades} size={32} />
          <h1>👷 {TAB_TITLES[activeTab]}</h1>
        </div>
      </div>

      <div className="brigades-layout">
        <BrigadesSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />

        <main className="brigades-main">
          {activeTab === 'brigades' && <BrigadesTabContent />}
          {activeTab === 'workers' && <WorkersTab />}
          {activeTab === 'schedule' && <ScheduleTab />}
        </main>
      </div>
    </div>
  );
};
