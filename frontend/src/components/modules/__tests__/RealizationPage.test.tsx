import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RealizationPage } from '../RealizationPage';

const mockBackButton = vi.fn();

vi.mock('../../common/BackButton', () => ({
  BackButton: ({ to }: { to?: string }) => {
    mockBackButton(to);
    return <div data-testid="back-button" data-to={to} />;
  },
}));

vi.mock('../../common/ModuleIcon', () => ({
  ModuleIcon: ({ name, emoji }: { name: string; emoji: string }) => (
    <div data-testid="module-icon-fallback" data-name={name} data-emoji={emoji}>
      {emoji}
    </div>
  ),
}));

describe('RealizationPage', () => {
  beforeEach(() => {
    mockBackButton.mockReset();
  });

  it('renders without errors and shows the page title', () => {
    render(<RealizationPage />);

    expect(screen.getByRole('heading', { name: 'Realizacja' })).toBeInTheDocument();
  });

  it('shows the development badge and planned features list', () => {
    render(<RealizationPage />);

    expect(screen.getByText('🚧 Moduł w budowie')).toBeInTheDocument();
    expect(screen.getByText('Planowane funkcje:')).toBeInTheDocument();
    expect(screen.getByText('Zlecenia realizacji powiązane z kontraktem')).toBeInTheDocument();
    expect(screen.getByText('Planowanie i harmonogram prac brygad')).toBeInTheDocument();
    expect(screen.getByText('Raport końcowy realizacji')).toBeInTheDocument();
  });

  it('renders BackButton with dashboard destination', () => {
    render(<RealizationPage />);

    expect(screen.getByTestId('back-button')).toHaveAttribute('data-to', '/dashboard');
    expect(mockBackButton).toHaveBeenCalledWith('/dashboard');
  });

  it('renders the realization image by default', () => {
    render(<RealizationPage />);

    const image = screen.getByRole('img', { name: 'Realizacja' });
    expect(image).toHaveAttribute('src', '/assets/realization.png');
    expect(screen.queryByTestId('module-icon-fallback')).not.toBeInTheDocument();
  });

  it('falls back to ModuleIcon when the realization image fails to load', () => {
    render(<RealizationPage />);

    fireEvent.error(screen.getByRole('img', { name: 'Realizacja' }));

    expect(screen.getByTestId('module-icon-fallback')).toHaveAttribute('data-name', 'realization');
  });
});
