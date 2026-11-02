import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutomationRunsSection } from './AutomationRunsSection';
import { automationService } from '../../services/automation.service';
import type { AutomationActionDefinition, AutomationRun } from '../../types/automation.types';

const permissions = vi.hoisted(() => ({ actions: ['read'] }));

vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (_module: string, action: string) => permissions.actions.includes(action),
  }),
}));

vi.mock('../../services/automation.service', () => {
  const automationService = {
    listActions: vi.fn(),
    listLookups: vi.fn(),
    getChain: vi.fn(),
    saveChain: vi.fn(),
    testChain: vi.fn(),
    listRuns: vi.fn(),
  };
  return { automationService, default: automationService };
});

const catalog: AutomationActionDefinition[] = [
  {
    key: 'generate_form_pdf',
    label: 'Zapisz PDF formularza w dokumentach zadania',
    description: 'Generuje PDF formularza i zapisuje go jako dokument zadania.',
    category: 'Dokumenty',
    params: [],
    supportsDryRun: true,
  },
  {
    key: 'send_email',
    label: 'Wyślij e-mail',
    description: 'Wysyła wiadomość e-mail.',
    category: 'Powiadomienia',
    params: [],
    supportsDryRun: true,
  },
];

const runs: AutomationRun[] = [
  {
    id: 71,
    chainId: 9,
    status: 'PARTIAL',
    dryRun: false,
    startedAt: '2026-10-02T08:15:00.000Z',
    finishedAt: '2026-10-02T08:15:02.000Z',
    message: 'Część kroków nie została wykonana.',
    event: { type: 'FORM_APPROVED' },
    steps: [
      { id: 2, stepIndex: 1, action: 'send_email', status: 'FAILED', message: 'Nie udało się wysłać wiadomości.' },
      { id: 1, stepIndex: 0, action: 'generate_form_pdf', status: 'SUCCEEDED', message: 'Zapisano dokument PDF.' },
    ],
  },
  {
    id: 70,
    chainId: 9,
    status: 'SUCCEEDED',
    dryRun: true,
    startedAt: '2026-10-01T09:00:00.000Z',
    finishedAt: '2026-10-01T09:00:01.000Z',
    message: null,
    event: { type: 'FORM_REJECTED' },
    steps: [
      { id: 3, stepIndex: 0, action: 'generate_form_pdf', status: 'SKIPPED', message: 'Pominięto w teście.' },
    ],
  },
];

const renderSection = () => render(
  <AutomationRunsSection ownerType="FORM_TEMPLATE_VERSION" ownerId={14} instanceId={44} />,
);

describe('AutomationRunsSection', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    permissions.actions = ['read'];
    vi.mocked(automationService.listActions).mockResolvedValue(catalog);
    vi.mocked(automationService.listRuns).mockResolvedValue(runs);
  });
  afterEach(cleanup);

  it('pokazuje listę uruchomień z datą, statusem i krokami w kolejności wykonania', async () => {
    renderSection();

    const section = await screen.findByRole('region', { name: 'Automatyzacje' });
    await within(section).findByText('Wykonane częściowo');
    const items = within(section).getAllByRole('listitem').filter(item => item.classList.contains('automation-runs__item'));
    expect(items).toHaveLength(2);

    expect(automationService.listRuns).toHaveBeenCalledWith(
      { ownerType: 'FORM_TEMPLATE_VERSION', ownerId: 14 },
      { instanceId: 44 },
    );

    const first = items[0];
    expect(first).toHaveTextContent(new Date('2026-10-02T08:15:00.000Z').toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }));
    expect(first).toHaveTextContent('Wykonane częściowo');
    expect(first).toHaveTextContent('Po zatwierdzeniu');
    expect(first).toHaveTextContent('Część kroków nie została wykonana.');
    const steps = within(first).getAllByRole('listitem').filter(item => item.classList.contains('automation-results__item'));
    expect(steps).toHaveLength(2);
    expect(steps[0]).toHaveTextContent('1. Zapisz PDF formularza w dokumentach zadania');
    expect(steps[0]).toHaveTextContent('OK');
    expect(steps[0]).toHaveTextContent('Zapisano dokument PDF.');
    expect(steps[1]).toHaveTextContent('2. Wyślij e-mail');
    expect(steps[1]).toHaveTextContent('Błąd');
    expect(steps[1]).toHaveTextContent('Nie udało się wysłać wiadomości.');
  });

  it('oznacza uruchomienia testowe i pokazuje pominięte kroki', async () => {
    renderSection();

    const section = await screen.findByRole('region', { name: 'Automatyzacje' });
    await within(section).findByText('Zakończone powodzeniem');
    expect(within(section).getByText('Test')).toBeInTheDocument();
    expect(within(section).getByText('Po odrzuceniu')).toBeInTheDocument();
    expect(within(section).getByText('Pominięto')).toBeInTheDocument();
    expect(within(section).getByText('Pominięto w teście.')).toBeInTheDocument();
  });

  it('nie pokazuje kluczy technicznych ani danych technicznych uruchomienia', async () => {
    renderSection();

    const section = await screen.findByRole('region', { name: 'Automatyzacje' });
    await within(section).findByText('Wykonane częściowo');
    expect(section.textContent).not.toMatch(/send_email|generate_form_pdf|FORM_APPROVED|PARTIAL|SUCCEEDED/);
  });

  it('pokazuje komunikat, gdy formularz nie miał jeszcze uruchomień', async () => {
    vi.mocked(automationService.listRuns).mockResolvedValue([]);
    renderSection();

    expect(await screen.findByText('Dla tego formularza nie uruchomiono jeszcze żadnych automatyzacji.')).toBeInTheDocument();
  });

  it('pokazuje krok bez znanego klocka pod ogólną nazwą', async () => {
    vi.mocked(automationService.listActions).mockRejectedValue(new Error('403'));
    renderSection();

    const section = await screen.findByRole('region', { name: 'Automatyzacje' });
    expect(await within(section).findAllByText(/Krok automatyzacji/)).toHaveLength(3);
  });

  it('pozwala ponowić wczytanie po błędzie', async () => {
    vi.mocked(automationService.listRuns).mockRejectedValueOnce(new Error('500'));
    renderSection();

    expect(await screen.findByText('Nie udało się wczytać listy uruchomień.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));

    expect(await screen.findByText('Wykonane częściowo')).toBeInTheDocument();
    expect(automationService.listRuns).toHaveBeenCalledTimes(2);
  });

  it('nie pokazuje sekcji bez uprawnienia do odczytu automatyzacji', async () => {
    permissions.actions = [];
    const { container } = renderSection();

    expect(container).toBeEmptyDOMElement();
    await waitFor(() => expect(automationService.listRuns).not.toHaveBeenCalled());
  });
});
