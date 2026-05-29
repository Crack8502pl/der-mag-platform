import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginPage } from './LoginPage';

const mockNavigate = vi.fn();
const mockLogin = vi.fn();
let mockLocationState: unknown;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: mockLocationState }),
  };
});

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

describe('LoginPage redirect after login', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLogin.mockReset();
    mockLocationState = undefined;
  });

  it('redirects to saved destination after successful login', async () => {
    mockLocationState = {
      from: {
        pathname: '/brigades',
        search: '?tab=active',
        hash: '#crew',
      },
    };
    mockLogin.mockResolvedValue({ data: { requirePasswordChange: false } });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Nazwa użytkownika'), { target: { value: 'jan' } });
    fireEvent.change(screen.getByLabelText('Hasło'), { target: { value: 'tajne' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zaloguj się' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('jan', 'tajne');
      expect(mockNavigate).toHaveBeenCalledWith('/brigades?tab=active#crew', { replace: true });
    });
  });

  it('falls back to dashboard for excluded redirect targets', async () => {
    mockLocationState = {
      from: {
        pathname: '/login',
      },
    };
    mockLogin.mockResolvedValue({ data: { requirePasswordChange: false } });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Nazwa użytkownika'), { target: { value: 'jan' } });
    fireEvent.change(screen.getByLabelText('Hasło'), { target: { value: 'tajne' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zaloguj się' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('still redirects to password change when required', async () => {
    mockLocationState = {
      from: {
        pathname: '/brigades',
      },
    };
    mockLogin.mockResolvedValue({ data: { requirePasswordChange: true } });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Nazwa użytkownika'), { target: { value: 'jan' } });
    fireEvent.change(screen.getByLabelText('Hasło'), { target: { value: 'tajne' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zaloguj się' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/change-password');
    });
  });
});
