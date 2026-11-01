import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormBuilderPage } from './FormBuilderPage';
import { formsService } from '../../services/forms.service';
import taskService from '../../services/task.service';
import { useFormTemplates } from '../../hooks/useFormTemplates';
import variableEngineService from '../../services/variableEngine.service';

const permissions = vi.hoisted(() => ({ actions: ['read', 'create', 'update', 'publish', 'assign'] }));

vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (_module: string, action: string) => permissions.actions.includes(action),
  }),
}));

vi.mock('../../hooks/useFormTemplates', () => ({
  useFormTemplates: vi.fn(),
}));

vi.mock('../../services/forms.service', () => ({
  formsService: {
    listTemplates: vi.fn(),
    createTemplate: vi.fn(),
    listVersions: vi.fn(),
    createDraft: vi.fn(),
    getVersion: vi.fn(),
    previewVersion: vi.fn(),
    updateDraft: vi.fn(),
    publishVersion: vi.fn(),
    createNextVersion: vi.fn(),
    listAssignmentRules: vi.fn(),
    listAssignmentUsers: vi.fn(),
    listAssignmentTeams: vi.fn(),
    listBranding: vi.fn(),
    replaceAssignmentRules: vi.fn(),
  },
}));
vi.mock('../../services/task.service', () => ({
  default: { getAll: vi.fn() },
}));
vi.mock('../../services/variableEngine.service', () => ({
  default: { listVariables: vi.fn() },
}));

const template = {
  id: 7,
  key: 'QUALITY_FORM',
  name: 'Kontrola jakości',
  description: null,
  kind: 'FORM' as const,
  procedureType: 'CABINET_PREFABRICATION' as const,
  active: true,
};

const draft = {
  id: 14,
  templateId: template.id,
  version: 1,
  status: 'DRAFT' as const,
  title: 'Kontrola jakości',
  description: null,
  kind: template.kind,
  procedureType: template.procedureType,
  settings: {},
  publishedAt: null,
  sections: [{
    id: 3,
    key: 'inspection',
    title: 'Kontrola',
    description: null,
    sortOrder: 0,
    conditions: {},
  }],
  fields: [{
    id: 5,
    sectionId: 3,
    key: 'result',
    label: 'Wynik',
    fieldType: 'PASS_FAIL',
    required: false,
    sortOrder: 0,
    validation: {},
    options: {},
    conditions: {},
  }],
  assignmentRules: [],
};

const renderPage = () => render(<MemoryRouter><FormBuilderPage /></MemoryRouter>);

describe('FormBuilderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissions.actions = ['read', 'create', 'update', 'publish', 'assign'];
    vi.mocked(useFormTemplates).mockReturnValue({
      templates: [template],
      loading: false,
      error: '',
      reload: vi.fn().mockResolvedValue(undefined),
    });
    vi.mocked(formsService.listVersions).mockResolvedValue({ items: [draft], total: 1, page: 1, limit: 20 });
    vi.mocked(formsService.getVersion).mockResolvedValue(draft);
    vi.mocked(formsService.previewVersion).mockResolvedValue({});
    vi.mocked(taskService.getAll).mockResolvedValue({
      data: [{
        id: 501, taskNumber: 'Z00011026', title: 'Montaż kamer', description: '',
        taskType: {
          id: 1, name: 'Montaż', description: '', code: 'INSTALL', active: true,
          configuration: {}, createdAt: '', updatedAt: '',
        },
        taskTypeId: 1, status: 'new', location: '', client: '',
        contractNumber: '', parentTaskId: 0, contractId: 12, subsystemId: 0, priority: 1,
        metadata: {}, createdAt: '', updatedAt: '',
      }],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    });
    vi.mocked(formsService.listAssignmentRules).mockResolvedValue([]);
    vi.mocked(formsService.listAssignmentUsers).mockResolvedValue([
      { id: 32, firstName: 'Jan', lastName: 'Kowalski', username: 'jkowalski', email: 'jan@example.test' },
    ]);
    vi.mocked(formsService.listAssignmentTeams).mockResolvedValue([
      { id: 8, name: 'Brygada A', code: 'BR-A' },
    ]);
    vi.mocked(formsService.updateDraft).mockResolvedValue(draft);
    vi.mocked(formsService.listBranding).mockResolvedValue([]);
    vi.mocked(variableEngineService.listVariables).mockResolvedValue([
      {
        expression: 'task.location', type: 'string', description: 'Lokalizacja zadania',
        label: 'Lokalizacja', group: 'Zadanie', provider: 'task', usableInBom: false, usableInForms: true,
      },
    ]);
  });

  it('shows an empty state when the API returns no templates', async () => {
    vi.mocked(useFormTemplates).mockReturnValue({
      templates: [],
      loading: false,
      error: '',
      reload: vi.fn(),
    });

    renderPage();

    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText('Brak formularzy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Nowy formularz' })).toBeInTheDocument();
  });

  it('opens a draft, edits required fields, and saves through the stage-five API', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    expect(await screen.findByRole('heading', { name: 'Edytor formularzy' })).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Wynik')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Wymagane' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz draft' }));

    await waitFor(() => expect(formsService.updateDraft).toHaveBeenCalledWith(14, expect.objectContaining({
      title: 'Kontrola jakości',
      sections: [expect.objectContaining({
        key: 'inspection',
        fields: [expect.objectContaining({ key: 'result', required: true })],
      })],
    })));
    expect(await screen.findByText('Wersja robocza została zapisana.')).toBeInTheDocument();
  });

  it('saves selected header and footer library entries with the draft', async () => {
    vi.mocked(formsService.listBranding).mockResolvedValue([
      {
        id: 41, name: 'Nagłówek', kind: 'HEADER', mode: 'CUSTOM', isDefault: false,
        heightMm: 20, filePath: null, fileMime: null, layout: {
          columns: { left: [], center: [], right: [] }, separator: true,
        },
      },
      {
        id: 42, name: 'Stopka', kind: 'FOOTER', mode: 'CUSTOM', isDefault: false,
        heightMm: 15, filePath: null, fileMime: null, layout: {
          columns: { left: [], center: [], right: [] }, separator: true,
        },
      },
    ]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    await screen.findByText('Sekcje');
    fireEvent.change(screen.getByLabelText('Nagłówek'), { target: { value: '41' } });
    fireEvent.change(screen.getByLabelText('Stopka'), { target: { value: '42' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz draft' }));

    await waitFor(() => expect(formsService.updateDraft).toHaveBeenCalledWith(
      draft.id,
      expect.objectContaining({ headerId: 41, footerId: 42 }),
    ));
  });

  it('configures a system data field source and mode', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    await screen.findByDisplayValue('Wynik');
    fireEvent.change(screen.getByLabelText('Typ'), { target: { value: 'DATA' } });
    expect(await screen.findByLabelText('Grupa')).toHaveValue('Zadanie');
    expect(screen.getByLabelText('Pole')).toHaveValue('task.location');
    fireEvent.change(screen.getByLabelText('Tryb'), { target: { value: 'prefill' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz draft' }));

    await waitFor(() => expect(formsService.updateDraft).toHaveBeenCalledWith(14, expect.objectContaining({
      sections: [expect.objectContaining({
        fields: [expect.objectContaining({
          fieldType: 'DATA',
          options: { source: 'task.location', mode: 'prefill', valueType: 'string' },
        })],
      })],
    })));
  });

  it('shows an interactive preview of the saved version, not unsaved edits', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    await screen.findByDisplayValue('Wynik');
    fireEvent.change(screen.getByLabelText('Typ'), { target: { value: 'SELECT' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Dodaj opcję' }));
    fireEvent.change(screen.getByLabelText('Opcja 1'), { target: { value: 'PASS' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Dodaj opcję' }));
    fireEvent.change(screen.getByLabelText('Opcja 2'), { target: { value: 'FAIL' } });

    fireEvent.click(screen.getByRole('button', { name: 'Podgląd' }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Kontrola jakości' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Zadanie do podglądu' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'PASS' })).toBeInTheDocument();
    expect(screen.getByText(/Podgląd wersji roboczej w trybie tylko do odczytu/i)).toBeInTheDocument();
    expect(formsService.getVersion).toHaveBeenLastCalledWith(draft.id);
    expect(screen.queryByRole('button', { name: 'Zapisz odpowiedzi' })).not.toBeInTheDocument();
  });

  it('previews system data from a searched task without creating an instance', async () => {
    const dataDraft = {
      ...draft,
      fields: [{
        ...draft.fields[0],
        key: 'taskNumber',
        label: 'Numer zadania',
        fieldType: 'DATA',
        options: { source: 'task.number', mode: 'readonly', valueType: 'string' },
      }],
    };
    vi.mocked(formsService.getVersion).mockResolvedValue(dataDraft);
    vi.mocked(formsService.previewVersion).mockResolvedValue({ taskNumber: 'Z00011026' });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    await screen.findByDisplayValue('Numer zadania');
    fireEvent.click(screen.getByRole('button', { name: 'Podgląd' }));
    fireEvent.change(screen.getByLabelText('Wyszukaj zadanie po numerze'), {
      target: { value: 'Z00011026' },
    });

    await screen.findByRole('option', { name: 'Z00011026 — Montaż kamer' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Zadanie do podglądu' }), {
      target: { value: '501' },
    });

    await waitFor(() => expect(formsService.previewVersion).toHaveBeenCalledWith(draft.id, 501));
    expect(await screen.findByText('Z00011026')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zapisz odpowiedzi' })).not.toBeInTheDocument();
  });

  it('shows sample system and BOM data when no task is selected', async () => {
    const sampleDraft = {
      ...draft,
      fields: [
        {
          ...draft.fields[0],
          key: 'taskNumber',
          label: 'Numer zadania',
          fieldType: 'DATA',
          options: { source: 'task.number', mode: 'readonly', valueType: 'string' },
        },
        {
          ...draft.fields[0],
          id: 6,
          key: 'materials',
          label: 'Materiały',
          fieldType: 'BOM_TABLE',
          options: { columns: ['plannedQty', 'installedQty', 'installed', 'note'] },
        },
      ],
    };
    vi.mocked(formsService.getVersion).mockResolvedValue(sampleDraft);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    await screen.findByDisplayValue('Numer zadania');
    fireEvent.click(screen.getByRole('button', { name: 'Podgląd' }));

    expect(await screen.findByText('Z00011026')).toBeInTheDocument();
    expect(await screen.findByText('Przykładowy materiał')).toBeInTheDocument();
    expect(formsService.previewVersion).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Zapisz odpowiedzi' })).not.toBeInTheDocument();
  });

  it('saves current edits before publishing the immutable version', async () => {
    const sequence: string[] = [];
    vi.mocked(formsService.updateDraft).mockImplementation(async () => {
      sequence.push('save');
      return draft;
    });
    vi.mocked(formsService.publishVersion).mockImplementation(async () => {
      sequence.push('publish');
      return { ...draft, status: 'PUBLISHED' };
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    await screen.findByDisplayValue('Wynik');
    fireEvent.change(screen.getByLabelText('Etykieta'), { target: { value: 'Wynik testu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publikuj wersję' }));

    await waitFor(() => expect(formsService.publishVersion).toHaveBeenCalledWith(14));
    expect(formsService.updateDraft).toHaveBeenCalledWith(14, expect.objectContaining({
      sections: [expect.objectContaining({
        fields: [expect.objectContaining({ label: 'Wynik testu' })],
      })],
    }));
    expect(sequence).toEqual(['save', 'publish']);
  });

  it('generates a distinct field key when copying a field multiple times', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    await screen.findByDisplayValue('Wynik');
    fireEvent.click(screen.getByRole('button', { name: 'Kopiuj pole' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Kopiuj pole' })[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz draft' }));

    await waitFor(() => expect(formsService.updateDraft).toHaveBeenCalledWith(14, expect.objectContaining({
      sections: [expect.objectContaining({
        fields: [
          expect.objectContaining({ key: 'result' }),
          expect.objectContaining({ key: 'WYNIK_KOPIA' }),
          expect.objectContaining({ key: 'WYNIK_KOPIA_KOPIA' }),
        ],
      })],
    })));
  });

  it('blocks saving a field definition with a reserved key', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    await screen.findByDisplayValue('Wynik');
    fireEvent.click(screen.getAllByText('Zaawansowane')[1]);
    fireEvent.change(screen.getByLabelText('Klucz techniczny pola'), { target: { value: '__proto__' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Nieprawidłowy klucz pola');
    expect(screen.getByRole('button', { name: 'Zapisz draft' })).toBeDisabled();
    expect(formsService.updateDraft).not.toHaveBeenCalled();
  });

  it('creates a template and its first draft using the template API', async () => {
    vi.mocked(formsService.createTemplate).mockResolvedValue(template);
    vi.mocked(formsService.createDraft).mockResolvedValue(draft);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '+ Nowy formularz' }));
    fireEvent.change(screen.getByLabelText('Nazwa'), { target: { value: 'Nowy formularz' } });
    expect(screen.getByLabelText('Klucz techniczny').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByLabelText('Klucz techniczny')).toHaveValue('NOWY_FORMULARZ');
    fireEvent.click(screen.getByRole('button', { name: 'Utwórz draft' }));

    await waitFor(() => expect(formsService.createTemplate).toHaveBeenCalledWith(expect.objectContaining({
      key: 'NOWY_FORMULARZ',
      name: 'Nowy formularz',
    })));
    expect(formsService.createDraft).toHaveBeenCalledWith(template.id);
    expect(await screen.findByText('Kontrola jakości')).toBeInTheDocument();
  });

  it('adds a section and field with options, units, and declarative conditions', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    await screen.findByDisplayValue('Wynik');
    fireEvent.click(screen.getByRole('button', { name: '+ Dodaj sekcję' }));
    fireEvent.click(screen.getAllByRole('button', { name: '+ Dodaj pole' })[1]);
    fireEvent.change(screen.getAllByLabelText('Etykieta')[1], { target: { value: 'Łącze' } });
    fireEvent.change(screen.getAllByLabelText('Typ')[1], { target: { value: 'SELECT' } });
    fireEvent.change(screen.getAllByLabelText('Jednostka')[1], { target: { value: 'szt.' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Dodaj opcję' }));
    fireEvent.change(screen.getByLabelText('Opcja 1'), { target: { value: 'Tak' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Dodaj opcję' }));
    fireEvent.change(screen.getByLabelText('Opcja 2'), { target: { value: 'Nie' } });
    fireEvent.click(screen.getByRole('button', { name: 'Przesuń opcję 1 w dół' }));
    fireEvent.click(screen.getAllByRole('button', { name: '+ Widoczność zależy od' })[1]);
    fireEvent.change(screen.getByLabelText('visibleWhen pole'), { target: { value: 'result' } });
    fireEvent.change(screen.getByLabelText('visibleWhen wartość'), { target: { value: 'PASS' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz draft' }));

    await waitFor(() => expect(formsService.updateDraft).toHaveBeenCalledWith(14, expect.objectContaining({
      sections: expect.arrayContaining([expect.objectContaining({
        key: 'SEKCJA_2',
        fields: [expect.objectContaining({
          key: 'LACZE',
          fieldType: 'SELECT',
          options: { unit: 'szt.', values: ['Nie', 'Tak'] },
        })],
      }), expect.objectContaining({
        key: 'inspection',
        fields: [expect.objectContaining({
          key: 'result',
          conditions: { visibleWhen: { field: 'result', operator: 'equals', value: 'PASS' } },
        })],
      })]),
    })));
  });

  it('saves assignment rules with searchable targets and declarative conditions', async () => {
    vi.mocked(formsService.replaceAssignmentRules).mockImplementation(async (_id, rules) => rules);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    await screen.findByDisplayValue('Wynik');
    fireEvent.click(screen.getByRole('button', { name: 'Przypisania i reguły' }));
    expect(await screen.findByRole('option', { name: /Jan Kowalski/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Użytkownik'), { target: { value: '32' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Warunek przypisania' }));
    fireEvent.change(screen.getByLabelText('when pole'), { target: { value: 'result' } });
    fireEvent.change(screen.getByLabelText('when wartość'), { target: { value: 'PASS' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj regułę' }));
    expect(screen.getByText(/użytkownik: Jan Kowalski/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz reguły' }));

    await waitFor(() => expect(formsService.replaceAssignmentRules).toHaveBeenCalledWith(14, [
      expect.objectContaining({
        assignedUserId: 32,
        active: true,
        conditions: { when: { field: 'result', operator: 'equals', value: 'PASS' } },
      }),
    ]));

    fireEvent.click(screen.getByRole('button', { name: 'Usuń regułę 1' }));
    expect(screen.getByText('Brak reguł przypisań.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz reguły' }));
    await waitFor(() => expect(formsService.replaceAssignmentRules).toHaveBeenLastCalledWith(14, []));

    expect(screen.queryByLabelText('Warunki (JSON)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('ID użytkownika')).not.toBeInTheDocument();
  });

  it('creates a follow-up version from the versions view', async () => {
    vi.mocked(formsService.listVersions).mockResolvedValue({
      items: [draft, { ...draft, id: 13, version: 2, status: 'PUBLISHED' }],
      total: 2,
      page: 1,
      limit: 20,
    });
    vi.mocked(formsService.createNextVersion).mockResolvedValue({ ...draft, id: 15, version: 3 });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    await screen.findByDisplayValue('Wynik');
    fireEvent.click(screen.getByRole('button', { name: 'Wersje' }));
    fireEvent.click(screen.getByRole('button', { name: 'Utwórz kolejną wersję' }));

    await waitFor(() => expect(formsService.createNextVersion).toHaveBeenCalledWith(13));
  });

  it('offers a first draft when the selected template has no versions', async () => {
    vi.mocked(formsService.listVersions).mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    vi.mocked(formsService.createDraft).mockResolvedValue(draft);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    expect(await screen.findByText('Brak wersji')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Utwórz draft' }));

    await waitFor(() => expect(formsService.createDraft).toHaveBeenCalledWith(template.id));
    expect(await screen.findByDisplayValue('Wynik')).toBeInTheDocument();
  });

  it('shows API errors while opening a template', async () => {
    vi.mocked(formsService.listVersions).mockRejectedValue({
      response: { data: { message: 'Nie można wczytać wersji' } },
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));

    expect(await screen.findByRole('status')).toHaveTextContent('Nie można wczytać wersji');
  });

  it('uses a safe fallback for API errors without a message', async () => {
    vi.mocked(formsService.listVersions).mockRejectedValue({ response: { data: {} } });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));

    expect(await screen.findByRole('status')).toHaveTextContent('Nie udało się wykonać operacji.');
  });

  it('keeps published versions read-only', async () => {
    vi.mocked(formsService.listVersions).mockResolvedValue({
      items: [{ ...draft, status: 'PUBLISHED' }],
      total: 1,
      page: 1,
      limit: 20,
    });
    vi.mocked(formsService.getVersion).mockResolvedValue({ ...draft, status: 'PUBLISHED' });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));

    expect(await screen.findByText('Wersja tylko do odczytu')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zapisz draft' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Dodaj sekcję' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Przeciągnij: Kontrola' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Przeciągnij: Wynik' })).toBeDisabled();
  });

  it('disables drag handles when the user cannot update drafts', async () => {
    permissions.actions = ['read'];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));

    expect(await screen.findByText('Wersja tylko do odczytu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Przeciągnij: Kontrola' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Przeciągnij: Wynik' })).toBeDisabled();
  });

  it('rejects invalid numeric bounds before calling the API', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    await screen.findByDisplayValue('Wynik');
    fireEvent.change(screen.getByLabelText('Typ'), { target: { value: 'NUMBER' } });
    fireEvent.change(screen.getByLabelText('Minimum'), { target: { value: '9' } });
    fireEvent.change(screen.getByLabelText('Maksimum'), { target: { value: '3' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Minimum pola "result" nie może przekraczać maksimum.');
    expect(screen.getByRole('button', { name: 'Zapisz draft' })).toBeDisabled();
    expect(formsService.updateDraft).not.toHaveBeenCalled();
  });

  it('shows a fallback message when template creation fails without an API response', async () => {
    vi.mocked(formsService.createTemplate).mockRejectedValue(new Error('offline'));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '+ Nowy formularz' }));
    fireEvent.change(screen.getByLabelText('Nazwa'), { target: { value: 'Nowy formularz' } });
    fireEvent.click(screen.getByRole('button', { name: 'Utwórz draft' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Nie udało się wykonać operacji.');
  });

  it('shows friendly field types and keeps technical keys in the advanced section', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    await screen.findByDisplayValue('Wynik');
    const typeSelect = screen.getByLabelText('Typ');

    expect(screen.getByRole('option', { name: 'Tekst' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'STRING' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Lista wyboru' })).toBeInTheDocument();
    expect(screen.getByLabelText('Klucz techniczny pola').closest('details')).not.toHaveAttribute('open');
    expect(typeSelect).toHaveValue('PASS_FAIL');
  });

  it('keeps saved STRING fields available as a legacy type', async () => {
    const legacyDraft = {
      ...draft,
      fields: [{ ...draft.fields[0], fieldType: 'STRING' }],
    };
    vi.mocked(formsService.getVersion).mockResolvedValue(legacyDraft);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));

    expect(await screen.findByDisplayValue('Wynik')).toBeInTheDocument();
    expect(screen.getByLabelText('Typ')).toHaveValue('STRING');
    expect(screen.getByRole('option', { name: 'Tekst (starszy typ)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz draft' }));

    await waitFor(() => expect(formsService.updateDraft).toHaveBeenCalledWith(14, expect.objectContaining({
      sections: [expect.objectContaining({ fields: [expect.objectContaining({ fieldType: 'STRING' })] })],
    })));
  });

  it('translates domain validation errors and associates them with the affected field', async () => {
    vi.mocked(formsService.updateDraft).mockRejectedValue({
      response: { data: { code: 'INVALID_DEFINITION', message: 'Invalid numeric bounds on result' } },
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    await screen.findByDisplayValue('Wynik');
    fireEvent.change(screen.getByLabelText('Typ'), { target: { value: 'NUMBER' } });
    fireEvent.change(screen.getByLabelText('Minimum'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Maksimum'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz draft' }));

    expect(await screen.findAllByText('Sprawdź zakres liczbowy pola „result”.')).toHaveLength(2);
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(1);
  });
});

it('configures a BOM table with selectable columns and category filter', async () => {
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
  await screen.findByDisplayValue('Wynik');
  fireEvent.change(screen.getByLabelText('Typ'), { target: { value: 'BOM_TABLE' } });
  expect(await screen.findByText('Kolumny tabeli BOM')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Uwagi' }));
  fireEvent.change(screen.getByLabelText('Kategoria materiału (opcjonalnie)'), {
    target: { value: 'Urządzenia' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Zapisz draft' }));

  await waitFor(() => expect(formsService.updateDraft).toHaveBeenCalledWith(14, expect.objectContaining({
    sections: [expect.objectContaining({
      fields: [expect.objectContaining({
        fieldType: 'BOM_TABLE',
        options: { columns: ['plannedQty', 'installedQty', 'installed'], filter: 'Urządzenia' },
      })],
    })],
  })));
});
