import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormBuilderPage } from './FormBuilderPage';
import { formsService } from '../../services/forms.service';
import { useFormTemplates } from '../../hooks/useFormTemplates';

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
    updateDraft: vi.fn(),
    publishVersion: vi.fn(),
    createNextVersion: vi.fn(),
    listAssignmentRules: vi.fn(),
    replaceAssignmentRules: vi.fn(),
  },
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
    vi.mocked(formsService.listAssignmentRules).mockResolvedValue([]);
    vi.mocked(formsService.updateDraft).mockResolvedValue(draft);
  });

  it('shows an empty state when the API returns no templates', () => {
    vi.mocked(useFormTemplates).mockReturnValue({
      templates: [],
      loading: false,
      error: '',
      reload: vi.fn(),
    });

    renderPage();

    expect(screen.getByText('Brak formularzy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Nowy formularz' })).toBeInTheDocument();
  });

  it('opens a draft, edits required fields, and saves through the stage-five API', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    expect(await screen.findByRole('heading', { name: 'Form Builder' })).toBeInTheDocument();
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

  it('shows an interactive preview of the saved version, not unsaved edits', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    await screen.findByDisplayValue('Wynik');
    fireEvent.change(screen.getByLabelText('Typ'), { target: { value: 'SELECT' } });
    fireEvent.change(screen.getByLabelText('Opcje (jedna na linię)'), { target: { value: 'PASS\nFAIL' } });

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Kontrola jakości' })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).not.toBeDisabled();
    expect(screen.getByRole('option', { name: 'PASS' })).toBeInTheDocument();
    expect(screen.getByText(/Interaktywny podgląd zapisanej wersji/i)).toBeInTheDocument();
    expect(formsService.getVersion).toHaveBeenLastCalledWith(draft.id);
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
          expect.objectContaining({ key: 'result_copy' }),
          expect.objectContaining({ key: 'result_copy_2' }),
        ],
      })],
    })));
  });

  it('blocks saving a field definition with a reserved key', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    await screen.findByDisplayValue('Wynik');
    fireEvent.change(screen.getAllByLabelText('Klucz')[1], { target: { value: '__proto__' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Nieprawidłowy klucz pola');
    expect(screen.getByRole('button', { name: 'Zapisz draft' })).toBeDisabled();
    expect(formsService.updateDraft).not.toHaveBeenCalled();
  });

  it('creates a template and its first draft using the template API', async () => {
    vi.mocked(formsService.createTemplate).mockResolvedValue(template);
    vi.mocked(formsService.createDraft).mockResolvedValue(draft);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '+ Nowy formularz' }));
    fireEvent.change(screen.getByLabelText('Klucz'), { target: { value: 'new_form' } });
    fireEvent.change(screen.getByLabelText('Nazwa'), { target: { value: 'Nowy formularz' } });
    fireEvent.click(screen.getByRole('button', { name: 'Utwórz draft' }));

    await waitFor(() => expect(formsService.createTemplate).toHaveBeenCalledWith(expect.objectContaining({
      key: 'NEW_FORM',
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
    fireEvent.change(screen.getAllByLabelText('Etykieta')[1], { target: { value: 'Wybór' } });
    fireEvent.change(screen.getAllByLabelText('Typ')[1], { target: { value: 'SELECT' } });
    fireEvent.change(screen.getAllByLabelText('Jednostka')[1], { target: { value: 'szt.' } });
    fireEvent.change(screen.getByLabelText('Opcje (jedna na linię)'), { target: { value: 'Tak\nNie' } });
    fireEvent.click(screen.getAllByRole('button', { name: '+ visibleWhen' })[1]);
    fireEvent.change(screen.getByLabelText('visibleWhen pole'), { target: { value: 'result' } });
    fireEvent.change(screen.getByLabelText('visibleWhen wartość'), { target: { value: 'PASS' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz draft' }));

    await waitFor(() => expect(formsService.updateDraft).toHaveBeenCalledWith(14, expect.objectContaining({
      sections: expect.arrayContaining([expect.objectContaining({
        key: 'section_2',
        fields: [expect.objectContaining({
          key: 'field_1',
          fieldType: 'SELECT',
          options: { unit: 'szt.', values: ['Tak', 'Nie'] },
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

  it('saves assignment rules and reports malformed rule JSON', async () => {
    vi.mocked(formsService.replaceAssignmentRules).mockImplementation(async (_id, rules) => rules);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    await screen.findByDisplayValue('Wynik');
    fireEvent.click(screen.getByRole('button', { name: 'Assignments / Rules' }));
    fireEvent.change(screen.getByLabelText('ID użytkownika'), { target: { value: '32' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj regułę' }));
    expect(screen.getByText(/użytkownik: 32/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz reguły' }));

    await waitFor(() => expect(formsService.replaceAssignmentRules).toHaveBeenCalledWith(14, [
      expect.objectContaining({ assignedUserId: 32, active: true, conditions: {} }),
    ]));

    fireEvent.click(screen.getByRole('button', { name: 'Usuń regułę 1' }));
    expect(screen.getByText('Brak reguł przypisań.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz reguły' }));
    await waitFor(() => expect(formsService.replaceAssignmentRules).toHaveBeenLastCalledWith(14, []));

    fireEvent.change(screen.getByLabelText('ID użytkownika'), { target: { value: '32' } });
    fireEvent.change(screen.getByLabelText('Warunki (JSON)'), { target: { value: '[' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj regułę' }));
    expect(screen.getByRole('status')).toHaveTextContent('Warunki reguły muszą być poprawnym obiektem JSON.');
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
    fireEvent.click(screen.getByRole('button', { name: 'Versions' }));
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
    fireEvent.change(screen.getByLabelText('Klucz'), { target: { value: 'new_form' } });
    fireEvent.change(screen.getByLabelText('Nazwa'), { target: { value: 'Nowy formularz' } });
    fireEvent.click(screen.getByRole('button', { name: 'Utwórz draft' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Nie udało się wykonać operacji.');
  });

});
