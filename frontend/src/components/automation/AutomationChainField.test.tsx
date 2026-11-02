import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AutomationChainField } from './AutomationChainField';
import { automationService } from '../../services/automation.service';
import taskService from '../../services/task.service';
import variableEngineService from '../../services/variableEngine.service';
import type { AutomationActionDefinition, AutomationChain } from '../../types/automation.types';

const permissions = vi.hoisted(() => ({ actions: ['read', 'build', 'run'] }));
const dnd = vi.hoisted(() => ({
  onDragEnd: null as null | ((event: unknown) => void),
  ids: [] as string[],
}));

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
vi.mock('../../services/task.service', () => ({
  default: { getAll: vi.fn() },
}));
vi.mock('../../services/variableEngine.service', () => ({
  default: { listVariables: vi.fn() },
}));
vi.mock('@dnd-kit/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd?: (event: unknown) => void }) => {
      dnd.onDragEnd = onDragEnd ?? null;
      return children;
    },
    useDraggable: (options: Parameters<typeof actual.useDraggable>[0]) => {
      dnd.ids.push(String(options.id));
      return actual.useDraggable(options);
    },
  };
});

const catalog: AutomationActionDefinition[] = [
  {
    key: 'generate_form_pdf',
    label: 'Zapisz PDF formularza w dokumentach zadania',
    description: 'Generuje PDF formularza i zapisuje go jako dokument zadania.',
    category: 'Dokumenty',
    params: [{ key: 'name', label: 'Nazwa dokumentu', type: 'text', required: false }],
    supportsDryRun: true,
  },
  {
    key: 'send_email',
    label: 'Wyślij e-mail',
    description: 'Wysyła wiadomość e-mail do osoby, roli, funkcji lub osoby przypisanej do zadania.',
    category: 'Powiadomienia',
    params: [
      {
        key: 'recipientType',
        label: 'Do kogo',
        type: 'select',
        required: true,
        options: [
          { value: 'user', label: 'Wybrana osoba' },
          { value: 'role', label: 'Wszyscy z wybraną rolą' },
          { value: 'functionGroup', label: 'Wszyscy z wybraną funkcją' },
          { value: 'assignee', label: 'Osoba przypisana do zadania' },
        ],
      },
      { key: 'user', label: 'Osoba', type: 'user', required: false, showWhen: { param: 'recipientType', equals: 'user' } },
      { key: 'role', label: 'Rola', type: 'role', required: false, showWhen: { param: 'recipientType', equals: 'role' } },
      {
        key: 'functionGroup',
        label: 'Funkcja',
        type: 'functionGroup',
        required: false,
        showWhen: { param: 'recipientType', equals: 'functionGroup' },
      },
      { key: 'subject', label: 'Temat', type: 'text', required: true },
      { key: 'body', label: 'Treść', type: 'longText', required: true },
    ],
    supportsDryRun: true,
  },
];

const savedChain: AutomationChain = {
  id: 9,
  ownerType: 'FORM_TEMPLATE_VERSION',
  ownerId: 14,
  eventType: 'FORM_APPROVED',
  onError: 'STOP',
  steps: [
    { action: 'generate_form_pdf', params: {} },
    { action: 'send_email', params: { recipientType: 'assignee', subject: 'Formularz zatwierdzony', body: 'Treść wiadomości' } },
  ],
};

const target = { ownerType: 'FORM_TEMPLATE_VERSION', ownerId: 14, eventType: 'FORM_APPROVED' };

type FieldProps = Partial<React.ComponentProps<typeof AutomationChainField>>;

const renderField = (props: FieldProps = {}) => render(
  <AutomationChainField
    ownerType="FORM_TEMPLATE_VERSION"
    ownerId={14}
    eventType="FORM_APPROVED"
    title="Po zatwierdzeniu"
    {...props}
  />,
);

const field = () => screen.getByRole('region', { name: 'Po zatwierdzeniu' });

const addStep = async (query: string) => {
  const input = await screen.findByRole('combobox', { name: 'Dodaj krok' });
  fireEvent.change(input, { target: { value: query } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('AutomationChainField', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    permissions.actions = ['read', 'build', 'run'];
    dnd.onDragEnd = null;
    dnd.ids = [];
    vi.mocked(automationService.listActions).mockResolvedValue(catalog);
    vi.mocked(automationService.getChain).mockResolvedValue(null);
    vi.mocked(automationService.saveChain).mockResolvedValue(savedChain);
    vi.mocked(automationService.listLookups).mockResolvedValue([]);
    vi.mocked(variableEngineService.listVariables).mockResolvedValue([
      { expression: 'task.number', label: 'Numer zadania', description: 'Numer zadania', group: 'Zadanie', type: 'string', provider: 'task', usableInBom: false, usableInForms: true },
      { expression: 'task.title', label: 'Tytuł zadania', description: 'Tytuł zadania', group: 'Zadanie', type: 'string', provider: 'task', usableInBom: false, usableInForms: true },
      { expression: 'bom.total', label: 'Suma BOM', description: 'Suma BOM', group: 'BOM', type: 'number', provider: 'bom', usableInBom: true, usableInForms: false },
    ]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('dodaje kafelek po wpisaniu fragmentu nazwy i naciśnięciu Enter', async () => {
    renderField();
    const input = await screen.findByRole('combobox', { name: 'Dodaj krok' });

    fireEvent.change(input, { target: { value: 'mail' } });
    expect(screen.getByRole('option', { name: /Wyślij e-mail/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /PDF/ })).not.toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByRole('button', { name: 'Ustawienia kroku 1: Wyślij e-mail' })).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('dodaje kafelek po kliknięciu podpowiedzi i na końcu łańcucha', async () => {
    renderField();
    await addStep('pdf');
    const input = screen.getByRole('combobox', { name: 'Dodaj krok' });
    fireEvent.change(input, { target: { value: 'wyslij' } });
    fireEvent.click(screen.getByRole('option', { name: /Wyślij e-mail/ }));

    const steps = within(screen.getByRole('list', { name: 'Kroki w kolejności wykonania' })).getAllByRole('listitem');
    expect(steps).toHaveLength(2);
    expect(steps[0]).toHaveTextContent('Zapisz PDF formularza w dokumentach zadania');
    expect(steps[1]).toHaveTextContent('Wyślij e-mail');
  });

  it('pokazuje komunikat, gdy nic nie pasuje do wpisanego tekstu', async () => {
    renderField();
    const input = await screen.findByRole('combobox', { name: 'Dodaj krok' });
    fireEvent.change(input, { target: { value: 'xyz' } });
    expect(screen.getByText('Nie znaleziono pasującego kroku. Wybierz go z listy „+ Dodaj”.')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.queryByRole('list', { name: 'Kroki w kolejności wykonania' })).not.toBeInTheDocument();
  });

  it('pozwala dodać krok z listy „+ Dodaj” pogrupowanej według kategorii', async () => {
    renderField();
    fireEvent.click(await screen.findByRole('button', { name: '+ Dodaj' }));

    const menu = screen.getByRole('group', { name: 'Dostępne kroki' });
    expect(within(menu).getByText('Dokumenty')).toBeInTheDocument();
    expect(within(menu).getByText('Powiadomienia')).toBeInTheDocument();

    fireEvent.click(within(menu).getByRole('button', { name: 'Wyślij e-mail' }));

    expect(screen.getByRole('button', { name: 'Ustawienia kroku 1: Wyślij e-mail' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Dostępne kroki' })).not.toBeInTheDocument();
  });

  it('wysyła do API kolejność zmienioną przeciągnięciem', async () => {
    vi.mocked(automationService.getChain).mockResolvedValue(savedChain);
    renderField();
    await screen.findByRole('button', { name: /Ustawienia kroku 1: Zapisz PDF/ });
    const [first, second] = [...new Set(dnd.ids)];

    act(() => dnd.onDragEnd?.({ active: { id: first }, over: { id: second } }));

    const steps = within(screen.getByRole('list', { name: 'Kroki w kolejności wykonania' })).getAllByRole('listitem');
    expect(steps[0]).toHaveTextContent('Wyślij e-mail');
    expect(steps[1]).toHaveTextContent('Zapisz PDF formularza w dokumentach zadania');

    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    await waitFor(() => expect(automationService.saveChain).toHaveBeenCalledTimes(1));
    expect(automationService.saveChain).toHaveBeenCalledWith(target, {
      steps: [
        { action: 'send_email', params: { recipientType: 'assignee', subject: 'Formularz zatwierdzony', body: 'Treść wiadomości' } },
        { action: 'generate_form_pdf', params: {} },
      ],
      onError: 'STOP',
    });
    expect(await screen.findByText('Zapisano automatyzacje.')).toBeInTheDocument();
  });

  it('ignoruje przeciągnięcie poza kafelki lub na ten sam kafelek', async () => {
    vi.mocked(automationService.getChain).mockResolvedValue(savedChain);
    renderField();
    await screen.findByRole('button', { name: /Ustawienia kroku 1/ });
    const [first] = [...new Set(dnd.ids)];

    act(() => dnd.onDragEnd?.({ active: { id: first }, over: null }));
    act(() => dnd.onDragEnd?.({ active: { id: first }, over: { id: first } }));

    expect(screen.getByRole('button', { name: 'Zapisz' })).toBeDisabled();
  });

  it('blokuje zapis i oznacza kafelek, gdy brakuje wymaganego ustawienia', async () => {
    renderField();
    await addStep('mail');

    const missing = 'Uzupełnij: Do kogo, Temat, Treść';
    expect(screen.getByText(missing).closest('li')).toHaveClass('is-incomplete');

    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    expect(automationService.saveChain).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Uzupełnij ustawienia zaznaczonych kroków, aby zapisać.');
    expect(screen.getByRole('region', { name: 'Ustawienia kroku: Wyślij e-mail' })).toBeInTheDocument();
  });

  it('po uzupełnieniu ustawień zdejmuje oznaczenie i zapisuje tylko widoczne ustawienia', async () => {
    renderField();
    await addStep('mail');
    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia kroku 1: Wyślij e-mail' }));

    fireEvent.change(screen.getByLabelText('Do kogo'), { target: { value: 'assignee' } });
    fireEvent.change(screen.getByLabelText('Temat'), { target: { value: 'Gotowe' } });
    fireEvent.change(screen.getByLabelText('Treść'), { target: { value: 'Formularz został zatwierdzony.' } });

    expect(screen.queryByText(/Uzupełnij:/)).not.toBeInTheDocument();
    expect(screen.getByText('Do kogo: Osoba przypisana do zadania · Temat: Gotowe')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    await waitFor(() => expect(automationService.saveChain).toHaveBeenCalledWith(target, {
      steps: [{
        action: 'send_email',
        params: { recipientType: 'assignee', subject: 'Gotowe', body: 'Formularz został zatwierdzony.' },
      }],
      onError: 'STOP',
    }));
  });

  it('pokazuje ustawienie zależne od wyboru i pomija ukryte ustawienia przy zapisie', async () => {
    vi.mocked(automationService.listLookups).mockResolvedValue([
      { value: 7, label: 'Jan Kowalski (jkowalski)' },
      { value: 8, label: 'Ewa Nowak (enowak)' },
    ]);
    renderField();
    await addStep('mail');
    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia kroku 1: Wyślij e-mail' }));

    expect(screen.queryByLabelText('Osoba')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Do kogo'), { target: { value: 'user' } });
    expect(screen.getByText('Uzupełnij: Osoba, Temat, Treść')).toBeInTheDocument();

    const select = await screen.findByRole('combobox', { name: 'Osoba' });
    await within(select).findByRole('option', { name: 'Jan Kowalski (jkowalski)' });
    fireEvent.change(select, { target: { value: '7' } });
    expect(screen.getByText(/Do kogo: Wybrana osoba · Osoba: Jan Kowalski \(jkowalski\)/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Do kogo'), { target: { value: 'assignee' } });
    fireEvent.change(screen.getByLabelText('Temat'), { target: { value: 'T' } });
    fireEvent.change(screen.getByLabelText('Treść'), { target: { value: 'B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    await waitFor(() => expect(automationService.saveChain).toHaveBeenCalledWith(target, {
      steps: [{ action: 'send_email', params: { recipientType: 'assignee', subject: 'T', body: 'B' } }],
      onError: 'STOP',
    }));
  });

  it('zapisuje osobę i funkcję jako właściwe wartości listy (liczba / klucz funkcji)', async () => {
    vi.mocked(automationService.listLookups).mockImplementation(async type => (
      type === 'functionGroup'
        ? [{ value: 'PROCESS_AUDITORS', label: 'Audytorzy procesów' }]
        : [{ value: 7, label: 'Jan Kowalski (jkowalski)' }]
    ));
    renderField();
    await addStep('mail');
    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia kroku 1: Wyślij e-mail' }));
    fireEvent.change(screen.getByLabelText('Do kogo'), { target: { value: 'functionGroup' } });
    fireEvent.change(screen.getByLabelText('Temat'), { target: { value: 'T' } });
    fireEvent.change(screen.getByLabelText('Treść'), { target: { value: 'B' } });

    const select = await screen.findByRole('combobox', { name: 'Funkcja' });
    await within(select).findByRole('option', { name: 'Audytorzy procesów' });
    fireEvent.change(select, { target: { value: 'PROCESS_AUDITORS' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    await waitFor(() => expect(automationService.saveChain).toHaveBeenCalledWith(target, {
      steps: [{
        action: 'send_email',
        params: { recipientType: 'functionGroup', functionGroup: 'PROCESS_AUDITORS', subject: 'T', body: 'B' },
      }],
      onError: 'STOP',
    }));
  });

  it('wyszukuje pozycje listy po wpisaniu fragmentu', async () => {
    renderField();
    await addStep('mail');
    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia kroku 1: Wyślij e-mail' }));
    fireEvent.change(screen.getByLabelText('Do kogo'), { target: { value: 'user' } });

    fireEvent.change(await screen.findByRole('searchbox', { name: 'Szukaj: Osoba' }), { target: { value: 'kowal' } });

    await waitFor(() => expect(automationService.listLookups).toHaveBeenCalledWith('user', { search: 'kowal', value: undefined }));
  });

  it('wstawia dane z systemu w miejscu kursora', async () => {
    renderField();
    await addStep('mail');
    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia kroku 1: Wyślij e-mail' }));

    const subject = screen.getByLabelText('Temat') as HTMLInputElement;
    fireEvent.change(subject, { target: { value: 'Zadanie  gotowe' } });
    subject.setSelectionRange(8, 8);

    fireEvent.click(screen.getAllByRole('button', { name: 'Wstaw dane z systemu' })[0]);
    const menu = screen.getByRole('group', { name: 'Dane z systemu: Temat' });
    expect(within(menu).queryByRole('button', { name: /Suma BOM/ })).not.toBeInTheDocument();
    fireEvent.click(within(menu).getByRole('button', { name: 'Numer zadania (Zadanie)' }));

    expect(subject).toHaveValue('Zadanie {task.number} gotowe');
    await waitFor(() => expect(subject.selectionStart).toBe(8 + '{task.number}'.length));
    expect(screen.queryByRole('group', { name: 'Dane z systemu: Temat' })).not.toBeInTheDocument();
    expect(screen.getByText(/Temat: Zadanie \[Numer zadania\] gotowe/)).toBeInTheDocument();
  });

  it('wstawia dane z systemu do pola długiego tekstu, zastępując zaznaczenie', async () => {
    renderField();
    await addStep('mail');
    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia kroku 1: Wyślij e-mail' }));

    const body = screen.getByLabelText('Treść') as HTMLTextAreaElement;
    fireEvent.change(body, { target: { value: 'Numer: XXX.' } });
    body.setSelectionRange(7, 10);

    fireEvent.click(screen.getAllByRole('button', { name: 'Wstaw dane z systemu' })[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Numer zadania (Zadanie)' }));

    expect(body).toHaveValue('Numer: {task.number}.');
  });

  it('wskazuje błąd z API przy kafelku, którego dotyczy', async () => {
    vi.mocked(automationService.getChain).mockResolvedValue(savedChain);
    vi.mocked(automationService.saveChain).mockRejectedValue({
      response: {
        data: {
          success: false,
          code: 'VALIDATION_FAILED',
          message: 'Krok 2 (Wyślij e-mail): Nieznana zmienna {zly.klucz}.',
          details: [{ stepIndex: 1, message: 'Krok 2 (Wyślij e-mail): nieznana zmienna {zly.klucz}.' }],
        },
      },
    });
    renderField();
    await screen.findByRole('button', { name: /Ustawienia kroku 2/ });
    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia kroku 2: Wyślij e-mail' }));
    fireEvent.change(screen.getByLabelText('Temat'), { target: { value: 'Temat {zly.klucz}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    const error = await screen.findByText('Nieznana zmienna {zly.klucz}.');
    const steps = within(screen.getByRole('list', { name: 'Kroki w kolejności wykonania' })).getAllByRole('listitem');
    expect(steps[1]).toContainElement(error);
    expect(steps[1]).toHaveClass('is-incomplete');
    expect(steps[0]).not.toHaveClass('is-incomplete');
    expect(screen.getByText('Nie udało się zapisać – sprawdź zaznaczone kroki.')).toBeInTheDocument();
    expect(screen.queryByText(/Krok 2 \(/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Temat'), { target: { value: 'Poprawiony temat' } });
    expect(screen.queryByText('Nieznana zmienna {zly.klucz}.')).not.toBeInTheDocument();
  });

  it('pokazuje ogólny błąd zapisu, gdy API nie wskazuje kroku', async () => {
    vi.mocked(automationService.saveChain).mockRejectedValue({
      response: { data: { code: 'CHAIN_IMMUTABLE', message: 'Łańcuch opublikowanej wersji formularza jest niezmienny.' } },
    });
    renderField();
    await addStep('pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    expect(await screen.findByText('Łańcuch opublikowanej wersji formularza jest niezmienny.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zapisz' })).toBeEnabled();
  });

  it('usuwa kafelek dopiero po potwierdzeniu', async () => {
    vi.mocked(automationService.getChain).mockResolvedValue(savedChain);
    renderField();
    await screen.findByRole('button', { name: /Ustawienia kroku 1/ });

    vi.mocked(window.confirm).mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Usuń krok: Zapisz PDF formularza w dokumentach zadania' }));
    expect(window.confirm).toHaveBeenCalledWith('Usunąć krok „Zapisz PDF formularza w dokumentach zadania”?');
    expect(screen.getByRole('button', { name: /Ustawienia kroku 1: Zapisz PDF/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Usuń krok: Zapisz PDF formularza w dokumentach zadania' }));
    expect(screen.queryByRole('button', { name: /Zapisz PDF/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ustawienia kroku 1: Wyślij e-mail' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    await waitFor(() => expect(automationService.saveChain).toHaveBeenCalledWith(target, {
      steps: [{ action: 'send_email', params: savedChain.steps[1].params }],
      onError: 'STOP',
    }));
  });

  it('pozwala wybrać, co zrobić, gdy krok się nie uda', async () => {
    renderField();
    await addStep('pdf');
    expect(screen.getByRole('radio', { name: 'zatrzymaj' })).toBeChecked();

    fireEvent.click(screen.getByRole('radio', { name: 'kontynuuj' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    await waitFor(() => expect(automationService.saveChain).toHaveBeenCalledWith(target, {
      steps: [{ action: 'generate_form_pdf', params: {} }],
      onError: 'CONTINUE',
    }));
  });

  it('zamyka panel ustawień przyciskiem „Gotowe” i klawiszem Escape', async () => {
    vi.mocked(automationService.getChain).mockResolvedValue(savedChain);
    renderField();
    const tile = await screen.findByRole('button', { name: 'Ustawienia kroku 2: Wyślij e-mail' });

    fireEvent.click(tile);
    expect(screen.getByRole('region', { name: 'Ustawienia kroku: Wyślij e-mail' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Gotowe' }));
    expect(screen.queryByRole('region', { name: 'Ustawienia kroku: Wyślij e-mail' })).not.toBeInTheDocument();
    await waitFor(() => expect(tile).toHaveFocus());

    fireEvent.click(tile);
    fireEvent.keyDown(screen.getByRole('region', { name: 'Ustawienia kroku: Wyślij e-mail' }), { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Ustawienia kroku: Wyślij e-mail' })).not.toBeInTheDocument();
  });

  it('informuje o niezapisanych zmianach', async () => {
    const onDirtyChange = vi.fn();
    renderField({ onDirtyChange });
    await screen.findByRole('combobox', { name: 'Dodaj krok' });
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);

    await addStep('pdf');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    await screen.findByText('Zapisano automatyzacje.');
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('pokazuje błąd wczytywania i pozwala spróbować ponownie', async () => {
    vi.mocked(automationService.listActions).mockRejectedValueOnce(new Error('offline'));
    renderField();

    expect(await screen.findByText('Nie udało się wczytać automatyzacji.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));

    expect(await screen.findByRole('combobox', { name: 'Dodaj krok' })).toBeInTheDocument();
  });

  it('działa bez listy danych z systemu, gdy jej pobranie się nie uda', async () => {
    vi.mocked(variableEngineService.listVariables).mockRejectedValue(new Error('403'));
    renderField();
    await addStep('mail');
    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia kroku 1: Wyślij e-mail' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Wstaw dane z systemu' })[0]);

    expect(screen.getByText('Nie udało się wczytać listy danych z systemu.')).toBeInTheDocument();
  });

  it('oznacza krok z nieznanym klockiem i blokuje zapis', async () => {
    vi.mocked(automationService.getChain).mockResolvedValue({
      ...savedChain,
      steps: [{ action: 'stary_klocek', params: {} }, savedChain.steps[0]],
    });
    renderField();

    const message = await screen.findByText('Ten klocek nie jest już dostępny – usuń go.');
    expect(message.closest('li')).toHaveClass('is-incomplete');

    await addStep('pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    expect(automationService.saveChain).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Usuń krok: Krok niedostępny' }));
    expect(screen.queryByText('Ten klocek nie jest już dostępny – usuń go.')).not.toBeInTheDocument();
  });

  describe('wersja opublikowana (tylko do odczytu)', () => {
    it('pokazuje kroki bez możliwości edycji', async () => {
      vi.mocked(automationService.getChain).mockResolvedValue(savedChain);
      renderField({ readOnly: true });

      const tile = await screen.findByRole('button', { name: /Ustawienia kroku 1: Zapisz PDF/ });
      expect(tile).toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: 'Dodaj krok' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '+ Dodaj' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Zapisz' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Usuń krok/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Przeciągnij krok/ })).not.toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'zatrzymaj' })).toBeDisabled();
      expect(screen.getByRole('radio', { name: 'kontynuuj' })).toBeDisabled();

      fireEvent.click(screen.getByRole('button', { name: 'Ustawienia kroku 2: Wyślij e-mail' }));
      expect(screen.getByLabelText('Temat')).toBeDisabled();
      expect(screen.getByLabelText('Treść')).toBeDisabled();
      expect(screen.getByLabelText('Do kogo')).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Wstaw dane z systemu' })).not.toBeInTheDocument();
      expect(field()).toBeInTheDocument();
    });

    it('pokazuje informację, gdy nie ma żadnych kroków', async () => {
      renderField({ readOnly: true });
      expect(await screen.findByText('Brak automatyzacji dla tego zdarzenia.')).toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: 'Dodaj krok' })).not.toBeInTheDocument();
    });

    it('jest tylko do odczytu także bez uprawnienia do budowania automatyzacji', async () => {
      permissions.actions = ['read'];
      vi.mocked(automationService.getChain).mockResolvedValue(savedChain);
      renderField();

      await screen.findByRole('button', { name: /Ustawienia kroku 1/ });
      expect(screen.queryByRole('combobox', { name: 'Dodaj krok' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Zapisz' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Testuj na zadaniu' })).not.toBeInTheDocument();
    });
  });

  describe('test na zadaniu', () => {
    const task = {
      id: 501,
      taskNumber: 'Z00011026',
      title: 'Montaż kamer',
    };

    const chooseTask = async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Testuj na zadaniu' }));
      fireEvent.change(screen.getByPlaceholderText('np. Z00011026'), { target: { value: 'Z0001' } });
      await screen.findByRole('option', { name: /Z00011026/ });
      fireEvent.change(screen.getByRole('combobox', { name: 'Zadanie do testu' }), { target: { value: '501' } });
    };

    beforeEach(() => {
      vi.mocked(taskService.getAll).mockResolvedValue({
        data: [task],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      } as never);
    });

    it('pokazuje wynik każdego kroku z komunikatem po polsku', async () => {
      vi.mocked(automationService.getChain).mockResolvedValue(savedChain);
      vi.mocked(automationService.testChain).mockResolvedValue({
        id: 31,
        chainId: 9,
        status: 'PARTIAL',
        dryRun: true,
        startedAt: '2026-11-02T08:00:00.000Z',
        finishedAt: '2026-11-02T08:00:01.000Z',
        message: null,
        steps: [
          { stepIndex: 0, action: 'generate_form_pdf', status: 'SUCCEEDED', message: 'Tryb testowy: PDF zostałby zapisany w dokumentach zadania.' },
          { stepIndex: 1, action: 'send_email', status: 'SKIPPED', message: 'Brak odbiorców z adresem e-mail – wiadomość nie została wysłana.' },
          { stepIndex: 2, action: 'send_email', status: 'FAILED', message: 'Nie udało się wysłać wiadomości.' },
        ],
      });
      renderField();
      await chooseTask();

      fireEvent.click(screen.getByRole('button', { name: 'Uruchom test' }));

      const result = await screen.findByRole('region', { name: 'Wynik testu' });
      expect(automationService.testChain).toHaveBeenCalledWith(9, 501);
      expect(automationService.saveChain).not.toHaveBeenCalled();
      const items = within(result).getAllByRole('listitem');
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent('1. Zapisz PDF formularza w dokumentach zadania');
      expect(items[0]).toHaveTextContent('OK');
      expect(items[0]).toHaveTextContent('Tryb testowy: PDF zostałby zapisany w dokumentach zadania.');
      expect(items[1]).toHaveTextContent('2. Wyślij e-mail');
      expect(items[1]).toHaveTextContent('Pominięto');
      expect(items[1]).toHaveTextContent('Brak odbiorców z adresem e-mail – wiadomość nie została wysłana.');
      expect(items[2]).toHaveTextContent('Błąd');
      expect(items[2]).toHaveTextContent('Nie udało się wysłać wiadomości.');
      expect(within(result).getByRole('heading', { name: 'Wynik testu: Wykonane częściowo' })).toBeInTheDocument();
    });

    it('zapisuje najpierw niezapisane zmiany i dopiero potem uruchamia test', async () => {
      const calls: string[] = [];
      vi.mocked(automationService.saveChain).mockImplementation(async () => {
        calls.push('save');
        return savedChain;
      });
      vi.mocked(automationService.testChain).mockImplementation(async () => {
        calls.push('test');
        return {
          id: 32, chainId: 9, status: 'SUCCEEDED', dryRun: true, startedAt: '2026-11-02T08:00:00.000Z',
          finishedAt: null, message: null,
          steps: [{ stepIndex: 0, action: 'generate_form_pdf', status: 'SUCCEEDED', message: 'Gotowe.' }],
        };
      });
      renderField();
      await addStep('pdf');
      await chooseTask();

      fireEvent.click(screen.getByRole('button', { name: 'Uruchom test' }));

      await screen.findByRole('region', { name: 'Wynik testu' });
      expect(calls).toEqual(['save', 'test']);
      expect(automationService.testChain).toHaveBeenCalledWith(9, 501);
    });

    it('nie uruchamia testu, gdy zapis się nie powiódł', async () => {
      vi.mocked(automationService.saveChain).mockRejectedValue({ response: { data: { message: 'Brak połączenia z bazą.' } } });
      renderField();
      await addStep('pdf');
      await chooseTask();

      fireEvent.click(screen.getByRole('button', { name: 'Uruchom test' }));

      expect(await screen.findByText('Brak połączenia z bazą.')).toBeInTheDocument();
      expect(automationService.testChain).not.toHaveBeenCalled();
    });

    it('pokazuje błąd testu zwrócony przez API', async () => {
      vi.mocked(automationService.getChain).mockResolvedValue(savedChain);
      vi.mocked(automationService.testChain).mockRejectedValue({ response: { data: { message: 'Nie znaleziono zadania.' } } });
      renderField();
      await chooseTask();

      fireEvent.click(screen.getByRole('button', { name: 'Uruchom test' }));

      expect(await screen.findByText('Nie znaleziono zadania.')).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Wynik testu' })).not.toBeInTheDocument();
    });

    it('wymaga wybrania zadania', async () => {
      vi.mocked(automationService.getChain).mockResolvedValue(savedChain);
      renderField();
      fireEvent.click(await screen.findByRole('button', { name: 'Testuj na zadaniu' }));

      expect(screen.getByRole('button', { name: 'Uruchom test' })).toBeDisabled();
    });

    it('jest dostępny tylko z uprawnieniem do uruchamiania automatyzacji', async () => {
      permissions.actions = ['read', 'build'];
      vi.mocked(automationService.getChain).mockResolvedValue(savedChain);
      renderField();

      await screen.findByRole('button', { name: /Ustawienia kroku 1/ });
      expect(screen.queryByRole('button', { name: 'Testuj na zadaniu' })).not.toBeInTheDocument();
    });

    it('można go uruchomić także dla wersji opublikowanej (tylko do odczytu)', async () => {
      vi.mocked(automationService.getChain).mockResolvedValue(savedChain);
      vi.mocked(automationService.testChain).mockResolvedValue({
        id: 33, chainId: 9, status: 'SUCCEEDED', dryRun: true, startedAt: '2026-11-02T08:00:00.000Z',
        finishedAt: null, message: null,
        steps: [{ stepIndex: 0, action: 'generate_form_pdf', status: 'SUCCEEDED', message: 'Gotowe.' }],
      });
      renderField({ readOnly: true });
      await chooseTask();

      fireEvent.click(screen.getByRole('button', { name: 'Uruchom test' }));

      await screen.findByRole('region', { name: 'Wynik testu' });
      expect(automationService.saveChain).not.toHaveBeenCalled();
      expect(automationService.testChain).toHaveBeenCalledWith(9, 501);
    });
  });
});
