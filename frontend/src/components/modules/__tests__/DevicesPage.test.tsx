import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DevicesPage } from '../DevicesPage';

const getDevicesMock = vi.fn();

vi.mock('../../../services/deviceService', () => ({
  deviceService: {
    getDevices: (...args: unknown[]) => getDevicesMock(...args),
    createDevice: vi.fn(),
    updateDevice: vi.fn(),
    deleteDevice: vi.fn(),
  },
}));

vi.mock('../../common/BackButton', () => ({
  BackButton: () => <div data-testid="back-button" />,
}));

vi.mock('../../common/ModuleIcon', () => ({
  ModuleIcon: ({ emoji }: { emoji: string }) => <div>{emoji}</div>,
}));

describe('DevicesPage', () => {
  beforeEach(() => {
    getDevicesMock.mockReset();
  });

  it('renders loading then table with devices', async () => {
    getDevicesMock.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          serialNumber: 'SN-001',
          name: 'Router',
          model: 'X1',
          manufacturer: 'Acme',
          deviceType: 'Router',
          status: 'active',
          location: 'Warszawa',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Ładowanie urządzeń...')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Tabela urządzeń')).toBeInTheDocument());
    expect(screen.getByText('SN-001')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Szczegóły' })).toBeInTheDocument();
  });
});
