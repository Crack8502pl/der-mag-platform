import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailAutomationSettingsPage } from './EmailAutomationSettingsPage';

const getEmailAutomationSettings = vi.fn();
const updateEmailAutomationSettings = vi.fn();

vi.mock('../../services/admin.service', () => ({
  default: {
    getEmailAutomationSettings: (...args: unknown[]) => getEmailAutomationSettings(...args),
    updateEmailAutomationSettings: (...args: unknown[]) => updateEmailAutomationSettings(...args),
  },
}));

describe('EmailAutomationSettingsPage', () => {
  beforeEach(() => {
    getEmailAutomationSettings.mockReset();
    updateEmailAutomationSettings.mockReset();
  });

  it('loads current state and saves an optimistic toggle update', async () => {
    getEmailAutomationSettings.mockResolvedValue({ enabled: true });
    updateEmailAutomationSettings.mockResolvedValue({ enabled: false });

    render(
      <MemoryRouter>
        <EmailAutomationSettingsPage />
      </MemoryRouter>,
    );

    await screen.findByText('Włączone');

    fireEvent.click(screen.getByRole('button', { name: /Wyłącz automat/i }));

    await waitFor(() => expect(updateEmailAutomationSettings).toHaveBeenCalledWith(false));
    expect(await screen.findByText('Automatyczne e-maile: wyłączone.')).toBeInTheDocument();
  });
});
