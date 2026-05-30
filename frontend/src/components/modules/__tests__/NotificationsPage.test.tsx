import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotificationsPage } from '../NotificationsPage';

const getNotificationsMock = vi.fn();
const getSettingsMock = vi.fn();

vi.mock('../../../services/notificationService', () => ({
  notificationService: {
    getNotifications: (...args: unknown[]) => getNotificationsMock(...args),
    getSettings: (...args: unknown[]) => getSettingsMock(...args),
    markAllAsRead: vi.fn(),
    markAsRead: vi.fn(),
    updateSettings: vi.fn(async (data) => data),
  },
}));

vi.mock('../../common/BackButton', () => ({
  BackButton: () => <div data-testid="back-button" />,
}));

vi.mock('../../common/ModuleIcon', () => ({
  ModuleIcon: ({ emoji }: { emoji: string }) => <div>{emoji}</div>,
}));

describe('NotificationsPage', () => {
  beforeEach(() => {
    getNotificationsMock.mockReset();
    getSettingsMock.mockReset();
  });

  it('renders notifications list and tabs', async () => {
    getNotificationsMock.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          type: 'info',
          title: 'Test',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    getSettingsMock.mockResolvedValueOnce({ email: true, sms: false, modules: { contracts: true } });

    render(<NotificationsPage />);

    await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Historia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ustawienia' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia' }));
    await waitFor(() => expect(screen.getByLabelText(/Email/i)).toBeInTheDocument());
  });
});
