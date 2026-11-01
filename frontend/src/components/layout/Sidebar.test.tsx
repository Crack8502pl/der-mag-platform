import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../stores/authStore';
import type { User } from '../../types/auth.types';
import { FALLBACK_ROLES } from '../../constants/roles';
import { Sidebar } from './Sidebar';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

vi.mock('../common/ModuleIcon', () => ({ ModuleIcon: () => null }));
vi.mock('../common/ThemeSwitcher', () => ({ ThemeSwitcher: () => null }));

const menuByRole: Record<string, string[]> = {
  admin: [
    'Dashboard', 'Kontrakty', 'Podsystemy', 'Zadania', 'Mapa', 'Brygady', 'Kompletacja',
    'Prefabrykacja', 'Realizacja', 'Sieć/IP', 'Magazyn', 'Materiały BOM', 'Urządzenia',
    'Obiekty', 'Użytkownicy', 'Raporty', 'Dokumenty', 'Zdjęcia', 'Powiadomienia',
    'Ustawienia', 'Integracja Symfonia',
  ],
  management_board: [
    'Dashboard', 'Kontrakty', 'Podsystemy', 'Zadania', 'Mapa', 'Kompletacja', 'Prefabrykacja',
    'Realizacja', 'Sieć/IP', 'Materiały BOM', 'Urządzenia', 'Obiekty', 'Użytkownicy',
    'Raporty', 'Dokumenty', 'Zdjęcia', 'Powiadomienia', 'Ustawienia',
  ],
  manager: [
    'Dashboard', 'Kontrakty', 'Podsystemy', 'Zadania', 'Mapa', 'Kompletacja', 'Prefabrykacja',
    'Realizacja', 'Sieć/IP', 'Materiały BOM', 'Urządzenia', 'Obiekty', 'Użytkownicy',
    'Raporty', 'Dokumenty', 'Zdjęcia', 'Powiadomienia', 'Ustawienia',
  ],
  coordinator: [
    'Dashboard', 'Kontrakty', 'Podsystemy', 'Zadania', 'Mapa', 'Kompletacja', 'Prefabrykacja',
    'Realizacja', 'Sieć/IP', 'Materiały BOM', 'Urządzenia', 'Obiekty', 'Użytkownicy',
    'Raporty', 'Dokumenty', 'Zdjęcia', 'Powiadomienia', 'Ustawienia',
  ],
  bom_editor: [
    'Dashboard', 'Podsystemy', 'Zadania', 'Mapa', 'Sieć/IP', 'Materiały BOM', 'Urządzenia',
    'Raporty', 'Dokumenty', 'Powiadomienia', 'Ustawienia',
  ],
  prefabricator: [
    'Dashboard', 'Zadania', 'Mapa', 'Prefabrykacja', 'Sieć/IP', 'Materiały BOM', 'Urządzenia',
    'Dokumenty', 'Powiadomienia', 'Ustawienia',
  ],
  worker: [
    'Dashboard', 'Zadania', 'Mapa', 'Kompletacja', 'Realizacja', 'Materiały BOM', 'Urządzenia',
    'Dokumenty', 'Zdjęcia', 'Powiadomienia', 'Ustawienia',
  ],
  order_picking: [
    'Dashboard', 'Zadania', 'Mapa', 'Kompletacja', 'Materiały BOM', 'Urządzenia', 'Raporty',
    'Dokumenty', 'Zdjęcia', 'Powiadomienia', 'Ustawienia',
  ],
  integrator: ['Dashboard', 'Kontrakty', 'Materiały BOM', 'Urządzenia'],
  viewer: [
    'Dashboard', 'Kontrakty', 'Podsystemy', 'Zadania', 'Mapa', 'Kompletacja', 'Prefabrykacja',
    'Realizacja', 'Sieć/IP', 'Materiały BOM', 'Urządzenia', 'Obiekty', 'Użytkownicy',
    'Raporty', 'Dokumenty', 'Zdjęcia', 'Powiadomienia', 'Ustawienia',
  ],
};

const modulesByRole: Record<string, string[]> = {
  management_board: ['contracts', 'subsystems', 'tasks', 'completion', 'prefabrication', 'realization', 'network', 'bom', 'devices', 'assets', 'users', 'reports', 'settings', 'photos', 'documents'],
  manager: ['contracts', 'subsystems', 'tasks', 'completion', 'prefabrication', 'realization', 'network', 'bom', 'devices', 'assets', 'users', 'reports', 'settings', 'photos', 'documents'],
  coordinator: ['contracts', 'subsystems', 'tasks', 'completion', 'prefabrication', 'realization', 'network', 'bom', 'devices', 'assets', 'users', 'reports', 'settings', 'photos', 'documents'],
  bom_editor: ['subsystems', 'tasks', 'network', 'bom', 'devices', 'reports', 'settings', 'documents'],
  prefabricator: ['tasks', 'prefabrication', 'network', 'bom', 'devices', 'settings', 'documents'],
  worker: ['tasks', 'completion', 'realization', 'bom', 'devices', 'settings', 'photos', 'documents'],
  order_picking: ['tasks', 'completion', 'bom', 'devices', 'reports', 'settings', 'photos', 'documents'],
  integrator: ['contracts', 'bom', 'devices'],
  viewer: ['contracts', 'subsystems', 'tasks', 'completion', 'prefabrication', 'realization', 'network', 'bom', 'devices', 'assets', 'users', 'reports', 'settings', 'photos', 'documents'],
};

const permissionsForRole = (role: string) => {
  if (role === 'admin') return { all: true };

  const permissions: Record<string, Record<string, boolean>> = {};
  if (role !== 'integrator') permissions.notifications = { receiveAlerts: true };
  for (const module of modulesByRole[role]) {
    permissions[module] = { read: true };
  }
  return permissions;
};

afterEach(() => {
  useAuthStore.getState().logout();
});

describe('Sidebar: menu ról', () => {
  it.each(FALLBACK_ROLES)('$name zachowuje menu sprzed W1', (role) => {
    useAuthStore.getState().setUser({
      id: 1,
      username: role.name,
      permissions: permissionsForRole(role.name),
    } as User);

    const { container } = render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    const labels = Array.from(container.querySelectorAll('.sidebar-label')).map((node) => node.textContent);
    expect(labels).toEqual(menuByRole[role.name]);
  });
});
