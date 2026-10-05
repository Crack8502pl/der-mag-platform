import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormBuilderPage } from './FormBuilderPage';
import { formsService } from '../../services/forms.service';
import { useFormTemplates } from '../../hooks/useFormTemplates';

vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (_module: string, action: string) => ['read', 'create', 'update', 'publish', 'assign'].includes(action),
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

  it('shows the preview as a static display of the saved definition', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Kontrola jakości/ }));
    await screen.findByDisplayValue('Wynik');

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.getByRole('heading', { level: 3, name: 'Kontrola jakości' })).toBeInTheDocument();
    expect(screen.getByText(/warunki i walidacja nie są tu wykonywane/i)).toBeInTheDocument();
  });
});
