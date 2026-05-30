import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RealizationPage } from '../RealizationPage';

vi.mock('../../common/BackButton', () => ({
  BackButton: ({ to }: { to?: string }) => <div data-testid="back-button" data-to={to} />,
}));

vi.mock('../../common/ModuleIcon', () => ({
  ModuleIcon: ({ emoji }: { emoji: string }) => <div>{emoji}</div>,
}));

describe('RealizationPage', () => {
  it('renders title, badge and planned features', () => {
    render(<RealizationPage />);

    expect(screen.getByRole('heading', { name: 'Realizacja' })).toBeInTheDocument();
    expect(screen.getByText('🚧 Moduł w budowie')).toBeInTheDocument();
    expect(screen.getByText('Planowane funkcje:')).toBeInTheDocument();
    expect(screen.getByText('Zlecenia realizacji powiązane z kontraktem')).toBeInTheDocument();
    expect(screen.getByText('Historia zmian i logi zdarzeń')).toBeInTheDocument();
  });
});
