import React, { useState, useEffect } from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import { useAuth } from '../../hooks/useAuth';
import { ProfileSection } from '../settings/ProfileSection';
import { PasswordSection } from '../settings/PasswordSection';
import { AppearanceSection } from '../settings/AppearanceSection';
import { NotificationsSection } from '../settings/NotificationsSection';
import { SecuritySection } from '../settings/SecuritySection';
import api from '../../services/api';
import './ModulePage.css';
import './SettingsPage.css';

type TabId = 'profile' | 'password' | 'appearance' | 'notifications' | 'security';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'profile', label: 'Profil', icon: '👤' },
  { id: 'password', label: 'Hasło', icon: '🔑' },
  { id: 'appearance', label: 'Wygląd', icon: '🎨' },
  { id: 'notifications', label: 'Powiadomienia', icon: '🔔' },
  { id: 'security', label: 'Bezpieczeństwo', icon: '🔒' }
];

interface Preferences {
  theme: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationSound: boolean;
  twoFactorEnabled: boolean;
  sessionTimeout: number;
}

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [preferences, setPreferences] = useState<Preferences>({
    theme: 'grover',
    emailNotifications: true,
    pushNotifications: false,
    notificationSound: true,
    twoFactorEnabled: false,
    sessionTimeout: 480
  });
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  useEffect(() => {
    api.get('/users/me/preferences')
      .then(({ data }) => {
        if (data.success && data.data) {
          setPreferences(data.data);
        }
      })
      .catch(() => null)
      .finally(() => setLoadingPrefs(false));
  }, []);

  const handlePrefsUpdate = (partial: Partial<Preferences>) => {
    setPreferences(prev => ({ ...prev, ...partial }));
  };

  const profileData = {
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || ''
  };

  return (
    <div className="module-page">
      <BackButton to="/dashboard" />

      <div className="module-header">
        <div className="module-icon">
          <ModuleIcon name="settings" emoji={MODULE_ICONS.settings} size={36} />
        </div>
        <h1>Ustawienia</h1>
      </div>

      <div className="settings-page">
        <nav className="settings-tabs" role="tablist">
          {TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`settings-tabs__btn${activeTab === tab.id ? ' settings-tabs__btn--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {loadingPrefs ? (
          <div className="settings-loading">Ładowanie ustawień...</div>
        ) : (
          <>
            {activeTab === 'profile' && (
              <ProfileSection initialData={profileData} />
            )}
            {activeTab === 'password' && (
              <PasswordSection />
            )}
            {activeTab === 'appearance' && (
              <AppearanceSection />
            )}
            {activeTab === 'notifications' && (
              <NotificationsSection
                preferences={{
                  emailNotifications: preferences.emailNotifications,
                  pushNotifications: preferences.pushNotifications,
                  notificationSound: preferences.notificationSound
                }}
                onUpdate={handlePrefsUpdate}
              />
            )}
            {activeTab === 'security' && (
              <SecuritySection
                preferences={{
                  twoFactorEnabled: preferences.twoFactorEnabled,
                  sessionTimeout: preferences.sessionTimeout
                }}
                onUpdate={handlePrefsUpdate}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
