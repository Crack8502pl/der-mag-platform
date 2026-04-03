// src/components/layout/Dashboard.tsx
// Main dashboard with module tiles

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import { TasksMapTile } from '../dashboard';
import { PendingDraftsButton } from '../common/PendingDraftsButton';
import './Dashboard.css';

interface ModuleCard {
  title: string;
  path: string;
  icon: React.ReactNode;
  module?: string;
  action?: string;
  adminOnly?: boolean;
  description: string;
  group: string;
}

interface DashboardPreferences {
  grouped: boolean;
  cardOrder: string[];
}

const GROUP_LABELS: Record<string, string> = {
  planning: '📐 Projekty i planowanie',
  execution: '⚙️ Realizacja',
  resources: '📦 Zasoby',
  docs: '📁 Dokumentacja',
  system: '🔧 System',
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();

  // Load preferences from localStorage
  const loadPreferences = (): DashboardPreferences => {
    const saved = localStorage.getItem('dashboard_preferences');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse dashboard preferences:', e);
      }
    }
    return { grouped: false, cardOrder: [] };
  };

  const [preferences, setPreferences] = React.useState<DashboardPreferences>(loadPreferences);
  const [isPersonalizeMode, setIsPersonalizeMode] = React.useState(false);

  const moduleCards: ModuleCard[] = [
    { title: 'Kontrakty', path: '/contracts', icon: <ModuleIcon name="contracts" emoji={MODULE_ICONS.contracts} size={48} />, module: 'contracts', action: 'read', description: 'Zarządzanie kontraktami', group: 'planning' },
    { title: 'Podsystemy', path: '/subsystems', icon: <ModuleIcon name="subsystems" emoji={MODULE_ICONS.subsystems} size={48} />, module: 'subsystems', action: 'read', description: 'Zarządzanie podsystemami', group: 'planning' },
    { title: 'Zadania', path: '/tasks', icon: <ModuleIcon name="tasks" emoji={MODULE_ICONS.tasks} size={48} />, module: 'tasks', action: 'read', description: 'Zarządzanie zadaniami', group: 'planning' },
    { title: 'Mapa Zadań', path: '/map', icon: <ModuleIcon name="mapa" emoji={MODULE_ICONS.mapa} size={48} />, module: 'tasks', action: 'read', description: 'Lokalizacje zadań na mapie', group: 'planning' },
    { title: 'Brygady', path: '/brigades', icon: <ModuleIcon name="brigades" emoji={MODULE_ICONS.brigades} size={48} />, module: 'brigades', action: 'read', description: 'Zarządzanie brygadami', group: 'planning' },
    { title: 'Kompletacja', path: '/completion', icon: <ModuleIcon name="completion" emoji={MODULE_ICONS.completion} size={48} />, module: 'completion', action: 'read', description: 'Skanowanie i kompletacja', group: 'execution' },
    { title: 'Prefabrykacja', path: '/prefabrication', icon: <ModuleIcon name="prefabrication" emoji={MODULE_ICONS.prefabrication} size={48} />, module: 'prefabrication', action: 'read', description: 'Prefabrykacja urządzeń', group: 'execution' },
    { title: 'Sieć/IP', path: '/network', icon: <ModuleIcon name="network" emoji={MODULE_ICONS.network} size={48} />, module: 'network', action: 'read', description: 'Zarządzanie adresacją IP', group: 'resources' },
    { title: 'Magazyn', path: '/warehouse-stock', icon: <ModuleIcon name="warehouse" emoji={MODULE_ICONS.warehouse} size={48} />, module: 'warehouse_stock', action: 'read', description: 'Stany magazynowe', group: 'resources' },
    { title: 'Samochody', path: '/cars', icon: <ModuleIcon name="cars" emoji={MODULE_ICONS.cars} size={48} />, module: 'cars', action: 'read', description: 'Lista samochodów firmowych', group: 'resources' },
    { title: 'Materiały BOM', path: '/bom', icon: <ModuleIcon name="bom" emoji={MODULE_ICONS.bom} size={48} />, module: 'bom', action: 'read', description: 'Szablony i materiały', group: 'resources' },
    { title: 'Urządzenia', path: '/devices', icon: <ModuleIcon name="devices" emoji={MODULE_ICONS.devices} size={48} />, module: 'devices', action: 'read', description: 'Rejestracja urządzeń', group: 'resources' },
    { title: 'Raporty', path: '/reports', icon: <ModuleIcon name="reports" emoji={MODULE_ICONS.reports} size={48} />, module: 'reports', action: 'read', description: 'Generowanie raportów', group: 'docs' },
    { title: 'Dokumenty', path: '/documents', icon: <ModuleIcon name="documents" emoji={MODULE_ICONS.documents} size={48} />, module: 'documents', action: 'read', description: 'Zarządzanie dokumentami', group: 'docs' },
    { title: 'Zdjęcia', path: '/photos', icon: <ModuleIcon name="photos" emoji={MODULE_ICONS.photos} size={48} />, module: 'photos', action: 'read', description: 'Upload i zatwierdzanie', group: 'docs' },
    { title: 'Użytkownicy', path: '/users', icon: <ModuleIcon name="users" emoji={MODULE_ICONS.users} size={48} />, module: 'users', action: 'read', description: 'Zarządzanie użytkownikami', group: 'system' },
    { title: 'Powiadomienia', path: '/notifications', icon: <ModuleIcon name="notifications" emoji={MODULE_ICONS.notifications} size={48} />, module: 'notifications', action: 'receiveAlerts', description: 'Konfiguracja alertów', group: 'system' },
    { title: 'Ustawienia', path: '/settings', icon: <ModuleIcon name="settings" emoji={MODULE_ICONS.settings} size={48} />, module: 'settings', action: 'read', description: 'Ustawienia konta', group: 'system' },
    { title: 'Panel Admin', path: '/admin', icon: <ModuleIcon name="admin" emoji={MODULE_ICONS.admin} size={48} />, adminOnly: true, description: 'Konfiguracja systemu', group: 'system' },
  ];

  const filteredCards = moduleCards.filter(card => {
    if (card.adminOnly) {
      return isAdmin();
    }
    if (card.module && card.action) {
      return hasPermission(card.module as any, card.action);
    }
    return true;
  });

  // Save preferences to localStorage
  const savePreferences = (newPrefs: DashboardPreferences) => {
    setPreferences(newPrefs);
    localStorage.setItem('dashboard_preferences', JSON.stringify(newPrefs));
  };

  // Toggle grouped view
  const toggleGrouped = () => {
    savePreferences({ ...preferences, grouped: !preferences.grouped });
  };

  // Reset to defaults
  const resetPreferences = () => {
    savePreferences({ grouped: false, cardOrder: [] });
  };

  // Get ordered cards
  const getOrderedCards = (): ModuleCard[] => {
    if (preferences.cardOrder.length === 0) {
      return filteredCards;
    }
    
    // Order cards according to saved order, then append any new cards not in saved order
    const orderedCards: ModuleCard[] = [];
    const cardMap = new Map(filteredCards.map(card => [card.path, card]));
    
    // Add cards in saved order
    for (const path of preferences.cardOrder) {
      const card = cardMap.get(path);
      if (card) {
        orderedCards.push(card);
        cardMap.delete(path);
      }
    }
    
    // Add any remaining cards (new ones not in saved order)
    orderedCards.push(...Array.from(cardMap.values()));
    
    return orderedCards;
  };

  // Move card up
  const moveCardUp = (index: number) => {
    if (index === 0) return;
    const orderedCards = getOrderedCards();
    const newOrder = orderedCards.map(c => c.path);
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    savePreferences({ ...preferences, cardOrder: newOrder });
  };

  // Move card down
  const moveCardDown = (index: number) => {
    const orderedCards = getOrderedCards();
    if (index === orderedCards.length - 1) return;
    const newOrder = orderedCards.map(c => c.path);
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    savePreferences({ ...preferences, cardOrder: newOrder });
  };

  // Move card up within group
  const moveCardUpInGroup = (groupKey: string, groupIndex: number) => {
    const orderedCards = getOrderedCards();
    const groupCards = orderedCards.filter(c => c.group === groupKey);
    if (groupIndex === 0 || groupIndex >= groupCards.length) return;
    
    // Swap in full order: find actual positions
    const allPaths = orderedCards.map(c => c.path);
    const cardA = groupCards[groupIndex - 1];
    const cardB = groupCards[groupIndex];
    const idxA = allPaths.indexOf(cardA.path);
    const idxB = allPaths.indexOf(cardB.path);
    [allPaths[idxA], allPaths[idxB]] = [allPaths[idxB], allPaths[idxA]];
    savePreferences({ ...preferences, cardOrder: allPaths });
  };

  // Move card down within group
  const moveCardDownInGroup = (groupKey: string, groupIndex: number) => {
    const orderedCards = getOrderedCards();
    const groupCards = orderedCards.filter(c => c.group === groupKey);
    if (groupIndex < 0 || groupIndex >= groupCards.length - 1) return;
    
    const allPaths = orderedCards.map(c => c.path);
    const cardA = groupCards[groupIndex];
    const cardB = groupCards[groupIndex + 1];
    const idxA = allPaths.indexOf(cardA.path);
    const idxB = allPaths.indexOf(cardB.path);
    [allPaths[idxA], allPaths[idxB]] = [allPaths[idxB], allPaths[idxA]];
    savePreferences({ ...preferences, cardOrder: allPaths });
  };

  // Render cards by group
  const renderGroupedCards = () => {
    const orderedCards = getOrderedCards();
    const groupedCards: Record<string, ModuleCard[]> = {};
    
    orderedCards.forEach(card => {
      if (!groupedCards[card.group]) {
        groupedCards[card.group] = [];
      }
      groupedCards[card.group].push(card);
    });

    return Object.keys(GROUP_LABELS).map(groupKey => {
      const cards = groupedCards[groupKey];
      if (!cards || cards.length === 0) return null;

      return (
        <div key={groupKey} className="dashboard-group">
          <h2 className="dashboard-group-label">{GROUP_LABELS[groupKey]}</h2>
          <div className="dashboard-grid">
            {cards.map((card, groupIndex) => renderGroupCard(card, groupKey, groupIndex, cards.length, isPersonalizeMode))}
          </div>
        </div>
      );
    });
  };

  // Render a card in grouped view with group-level controls
  const renderGroupCard = (card: ModuleCard, groupKey: string, groupIndex: number, groupSize: number, showControls: boolean) => {
    return (
      <div
        key={card.path}
        className="dashboard-card"
        onClick={isPersonalizeMode ? undefined : () => navigate(card.path)}
        style={{ cursor: isPersonalizeMode ? 'default' : 'pointer' }}
      >
        {showControls && (
          <div className="card-controls">
            <button
              className="card-control-btn"
              onClick={(e) => { e.stopPropagation(); moveCardUpInGroup(groupKey, groupIndex); }}
              disabled={groupIndex === 0}
              title="Przesuń w górę"
            >
              ▲
            </button>
            <button
              className="card-control-btn"
              onClick={(e) => { e.stopPropagation(); moveCardDownInGroup(groupKey, groupIndex); }}
              disabled={groupIndex === groupSize - 1}
              title="Przesuń w dół"
            >
              ▼
            </button>
          </div>
        )}
        <div className="card-icon">{card.icon}</div>
        <h3>{card.title}</h3>
        <p>{card.description}</p>
      </div>
    );
  };

  // Render a single card
  const renderCard = (card: ModuleCard, index: number, showControls: boolean) => {
    const orderedCards = getOrderedCards();
    return (
      <div
        key={card.path}
        className="dashboard-card"
        onClick={() => !isPersonalizeMode && navigate(card.path)}
        style={{ cursor: isPersonalizeMode ? 'default' : 'pointer' }}
      >
        {showControls && (
          <div className="card-controls">
            <button
              className="card-control-btn"
              onClick={(e) => { e.stopPropagation(); moveCardUp(index); }}
              disabled={index === 0}
              title="Przesuń w górę"
            >
              ▲
            </button>
            <button
              className="card-control-btn"
              onClick={(e) => { e.stopPropagation(); moveCardDown(index); }}
              disabled={index === orderedCards.length - 1}
              title="Przesuń w dół"
            >
              ▼
            </button>
          </div>
        )}
        <div className="card-icon">{card.icon}</div>
        <h3>{card.title}</h3>
        <p>{card.description}</p>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Witaj, {user?.firstName} {user?.lastName}</p>
        </div>
        <button className="btn btn-secondary" onClick={logout}>
          Wyloguj
        </button>
      </div>

      {/* Settings bar */}
      <div className="dashboard-settings-bar">
        <button 
          className={`btn ${preferences.grouped ? 'btn-primary' : 'btn-secondary'}`}
          onClick={toggleGrouped}
          title={preferences.grouped ? 'Widok płaski' : 'Widok pogrupowany'}
        >
          {preferences.grouped ? '📑 Pogrupowane' : '📋 Wszystkie'}
        </button>
        
        <button 
          className={`btn ${isPersonalizeMode ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setIsPersonalizeMode(!isPersonalizeMode)}
          title="Personalizuj kolejność"
        >
          {isPersonalizeMode ? '✓ Zapisz kolejność' : '✏️ Personalizuj'}
        </button>

        <button 
          className="btn btn-secondary"
          onClick={resetPreferences}
          title="Resetuj do domyślnych"
        >
          🔄 Resetuj
        </button>

        <PendingDraftsButton />
      </div>

      {/* Cards */}
      {preferences.grouped ? (
        renderGroupedCards()
      ) : (
        <div className="dashboard-grid">
          {getOrderedCards().map((card, index) => 
            renderCard(card, index, isPersonalizeMode)
          )}
        </div>
      )}

      {/* Kafelek mapy zadań z GPS */}
      {hasPermission('tasks', 'read') && (
        <div className="dashboard-map-section">
          <TasksMapTile />
        </div>
      )}
    </div>
  );
};
