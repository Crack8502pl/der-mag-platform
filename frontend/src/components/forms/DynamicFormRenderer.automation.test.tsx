import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DynamicFormRenderer } from './DynamicFormRenderer';
import { formsService } from '../../services/forms.service';
import { automationService } from '../../services/automation.service';
import type { FormVersion } from '../../types/forms.types';
import type { AutomationRun } from '../../types/automation.types';

const permissions = vi.hoisted(() => ({ actions: ['read'] }));

vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (_module: string, action: string) => permissions.actions.includes(action),
  }),
}));

vi.mock('../../services/forms.service', () => ({
  formsService: {
    getVersion: vi.fn(),
    getInstanceValues: vi.fn(),
    refreshInstanceData: vi.fn(),
    getInstancePdf: vi.fn(),
  },
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

const version: FormVersion = {
  id: 12, templateId: 1, version: 2, status: 'PUBLISHED', title: 'Kontrola',
  description: null, kind: 'CHECKLIST', procedureType: 'FIELD_INSTALLATION',
  settings: {}, publishedAt: '2026-10-01', assignmentRules: [],
  sections: [{ id: 1, key: 'main', title: 'Podstawowe', description: null, sortOrder: 0, conditions: {} }],
  fields: [{
    id: 1, sectionId: 1, key: 'result', label: 'Wynik', fieldType: 'PASS_FAIL', required: false,
    sortOrder: 0, validation: {}, options: {}, conditions: {},
  }],
};

const run: AutomationRun = {
  id: 71,
  chainId: 9,
  status: 'SUCCEEDED',
  dryRun: false,
  startedAt: '2026-10-02T08:15:00.000Z',
  finishedAt: '2026-10-02T08:15:02.000Z',
  message: null,
  event: { type: 'FORM_APPROVED' },
  steps: [{ id: 1, stepIndex: 0, action: 'generate_form_pdf', status: 'SUCCEEDED', message: 'Zapisano dokument PDF.' }],
};

beforeEach(() => {
  vi.resetAllMocks();
  permissions.actions = ['read'];
  vi.mocked(formsService.getVersion).mockResolvedValue(structuredClone(version));
  vi.mocked(formsService.getInstanceValues).mockResolvedValue({});
  vi.mocked(automationService.listActions).mockResolvedValue([{
    key: 'generate_form_pdf',
    label: 'Zapisz PDF formularza w dokumentach zadania',
    description: '',
    category: 'Dokumenty',
    params: [],
  }]);
  vi.mocked(automationService.listRuns).mockResolvedValue([run]);
});
afterEach(cleanup);

describe('DynamicFormRenderer – automatyzacje', () => {
  it('pokazuje w widoku wypełnionego formularza listę uruchomień automatyzacji', async () => {
    render(<DynamicFormRenderer versionId={12} instanceId={44} />);

    const section = await screen.findByRole('region', { name: 'Automatyzacje' });
    expect(await within(section).findByText('Zakończone powodzeniem')).toBeInTheDocument();
    expect(within(section).getByText('1. Zapisz PDF formularza w dokumentach zadania')).toBeInTheDocument();
    expect(within(section).getByText('Zapisano dokument PDF.')).toBeInTheDocument();
    expect(automationService.listRuns).toHaveBeenCalledWith(
      { ownerType: 'FORM_TEMPLATE_VERSION', ownerId: 12 },
      { instanceId: 44 },
    );
  });

  it('nie pokazuje sekcji w podglądzie formularza bez wypełnienia', async () => {
    render(<DynamicFormRenderer versionId={12} disabled />);

    await screen.findByRole('heading', { name: 'Kontrola' });
    expect(screen.queryByRole('region', { name: 'Automatyzacje' })).not.toBeInTheDocument();
    expect(automationService.listRuns).not.toHaveBeenCalled();
  });

  it('nie pokazuje sekcji bez uprawnienia do odczytu automatyzacji', async () => {
    permissions.actions = [];
    render(<DynamicFormRenderer versionId={12} instanceId={44} />);

    await screen.findByRole('heading', { name: 'Kontrola' });
    expect(screen.queryByRole('region', { name: 'Automatyzacje' })).not.toBeInTheDocument();
    expect(automationService.listRuns).not.toHaveBeenCalled();
  });

  it('ponowienie wczytania listy nie wysyła formularza', async () => {
    vi.mocked(automationService.listRuns).mockRejectedValueOnce(new Error('500'));
    const submit = vi.fn();
    render(<DynamicFormRenderer versionId={12} instanceId={44} onSubmit={submit} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Spróbuj ponownie' }));

    expect(await screen.findByText('Zakończone powodzeniem')).toBeInTheDocument();
    await waitFor(() => expect(automationService.listRuns).toHaveBeenCalledTimes(2));
    expect(submit).not.toHaveBeenCalled();
  });
});
