import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DynamicFormRenderer } from './DynamicFormRenderer';
import { formsService } from '../../services/forms.service';
import type { FormVersion } from '../../types/forms.types';

vi.mock('../../services/forms.service', () => ({
  formsService: {
    getVersion: vi.fn(),
    getInstanceValues: vi.fn(),
    refreshInstanceData: vi.fn(),
    getInstancePdf: vi.fn(),
  },
}));

const version: FormVersion = {
  id: 12, templateId: 1, version: 2, status: 'PUBLISHED', title: 'Kontrola',
  description: 'Zapisana definicja', kind: 'CHECKLIST', procedureType: 'FIELD_INSTALLATION',
  settings: {}, publishedAt: '2026-10-01', assignmentRules: [],
  sections: [
    { id: 1, key: 'main', title: 'Podstawowe', description: 'Dane', sortOrder: 0, conditions: {} },
    { id: 2, key: 'extra', title: 'Pomiary', sortOrder: 1, conditions: {
      visibleWhen: { field: 'result', operator: 'equals', value: 'PASS' },
    } },
  ],
  fields: [
    { id: 1, sectionId: 1, key: 'result', label: 'Wynik', fieldType: 'PASS_FAIL', required: true,
      sortOrder: 0, validation: {}, options: {}, conditions: {} },
    { id: 2, sectionId: 2, key: 'measurement', label: 'Pomiar', fieldType: 'NUMBER', required: false,
      sortOrder: 0, validation: { min: 1, max: 10 }, options: { unit: 'V' }, conditions: {
        requiredWhen: { field: 'result', operator: 'equals', value: 'PASS' },
      } },
    { id: 3, sectionId: 1, key: 'note', label: 'Uwagi', fieldType: 'TEXTAREA', required: false,
      sortOrder: 1, validation: {}, options: {}, conditions: {
        visibleWhen: { field: 'result', operator: 'equals', value: 'FAIL' },
      } },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(formsService.getVersion).mockResolvedValue(structuredClone(version));
  vi.mocked(formsService.getInstanceValues).mockResolvedValue({});
  vi.mocked(formsService.refreshInstanceData).mockResolvedValue(undefined);
  vi.mocked(formsService.getInstancePdf).mockResolvedValue(new Blob(['pdf']));
});
afterEach(cleanup);

describe('DynamicFormRenderer', () => {
  it('renders the immutable custom header/footer snapshots and resolves approved data fields', async () => {
    vi.mocked(formsService.getVersion).mockResolvedValue({
      ...version,
      headerSnapshot: {
        id: 8, name: 'Firmowy nagłówek', kind: 'HEADER', mode: 'CUSTOM',
        heightMm: 20, filePath: null, fileMime: null,
        layout: {
          columns: {
            left: [{ type: 'text', text: 'Der-Mag' }],
            center: [{ type: 'variable', source: 'task.number' }],
            right: [],
          },
          separator: true,
        },
      },
      footerSnapshot: {
        id: 9, name: 'Stopka', kind: 'FOOTER', mode: 'CUSTOM',
        heightMm: 15, filePath: null, fileMime: null,
        layout: { columns: { left: [{ type: 'pageNumber' }], center: [], right: [] }, separator: false },
      },
      fields: [
        ...version.fields,
        { id: 4, sectionId: 1, key: 'taskNumber', label: 'Numer zadania', fieldType: 'DATA', required: false,
          sortOrder: 2, validation: {}, options: { source: 'task.number', mode: 'readonly', valueType: 'string' }, conditions: {} },
      ],
    });
    render(<DynamicFormRenderer versionId={12} initialValues={{ taskNumber: 'TSK-22' }} />);

    expect(await screen.findByText('Der-Mag')).toBeInTheDocument();
    expect(screen.getAllByText('TSK-22')).toHaveLength(2);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('keeps control, radio option and error IDs distinct for valid suffixed field keys', async () => {
    vi.mocked(formsService.getVersion).mockResolvedValue({
      ...version, sections: [version.sections[0]], fields: [
        { ...version.fields[0], fieldType: 'RADIO', options: { values: ['A', 'B'] } },
        { ...version.fields[0], id: 2, key: 'result-1', label: 'Opis', fieldType: 'TEXT' },
        { ...version.fields[0], id: 3, key: 'result-error', label: 'Komentarz', fieldType: 'TEXT' },
      ],
    });
    const { container } = render(<DynamicFormRenderer versionId={12} onSubmit={vi.fn()} />);
    await screen.findByRole('radiogroup', { name: 'Wynik' });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz odpowiedzi' }));
    await screen.findAllByRole('alert');
    const ids = Array.from(container.querySelectorAll('[id]'), element => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(screen.getByLabelText(/Opis/)).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText(/Komentarz/)).toHaveAttribute('type', 'text');
    expect(screen.getByRole('radio', { name: 'B' }).id).not.toBe(screen.getByLabelText(/Opis/).id);
  });

  it('loads the exact persisted version and evaluates section and field conditions', async () => {
    render(<DynamicFormRenderer versionId={12} />);
    expect(screen.getByRole('status')).toHaveTextContent('Ładowanie');
    const result = await screen.findByLabelText(/Wynik/);
    expect(formsService.getVersion).toHaveBeenCalledWith(12);
    expect(screen.getByText('Wersja 2 · PUBLISHED')).toBeInTheDocument();
    expect(screen.queryByText('Pomiary')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Uwagi')).not.toBeInTheDocument();
    fireEvent.change(result, { target: { value: 'PASS' } });
    expect(await screen.findByLabelText(/Pomiar/)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByText('V')).toBeInTheDocument();
    fireEvent.change(result, { target: { value: 'FAIL' } });
    expect(await screen.findByLabelText('Uwagi')).toBeInTheDocument();
    expect(screen.queryByText('Pomiary')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zapisz odpowiedzi' })).not.toBeInTheDocument();
  });

  it('loads saved system data for an instance and refreshes its readonly snapshot', async () => {
    const dataField = {
      ...version.fields[0],
      key: 'location',
      label: 'Lokalizacja',
      fieldType: 'DATA',
      required: false,
      options: { source: 'task.location', mode: 'readonly', valueType: 'string' },
    };
    vi.mocked(formsService.getVersion).mockResolvedValue({
      ...version, sections: [version.sections[0]], fields: [dataField],
    });
    vi.mocked(formsService.getInstanceValues)
      .mockResolvedValueOnce({ location: 'Stacja' })
      .mockResolvedValueOnce({ location: 'Peron' });
    render(<DynamicFormRenderer versionId={12} instanceId={44} />);

    expect(await screen.findByRole('textbox', { name: 'Lokalizacja' })).toHaveTextContent('Stacja');
    expect(formsService.getInstanceValues).toHaveBeenCalledWith(44, expect.objectContaining({ id: 12 }));
    fireEvent.click(screen.getByRole('button', { name: 'Odśwież dane z zadania' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Lokalizacja' })).toHaveTextContent('Peron'));
    expect(formsService.refreshInstanceData).toHaveBeenCalledWith(44);
  });

  it('downloads the generated PDF for an instance', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:form-pdf');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    render(<DynamicFormRenderer versionId={12} instanceId={44} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Pobierz PDF' }));
    await waitFor(() => expect(formsService.getInstancePdf).toHaveBeenCalledWith(44));
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:form-pdf'));
    expect(click).toHaveBeenCalledOnce();
    click.mockRestore();
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });

  it('allows PDF download for a read-only instance and surfaces download failures', async () => {
    vi.mocked(formsService.getInstancePdf).mockRejectedValue(new Error('PDF failed'));
    render(<DynamicFormRenderer versionId={12} instanceId={44} disabled />);
    const download = await screen.findByRole('button', { name: 'Pobierz PDF' });
    expect(download).toBeEnabled();
    fireEvent.click(download);
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się pobrać formularza PDF.');
    expect(download).toBeEnabled();
  });

  it('validates required values, ranges and retains answers when fields are hidden', async () => {
    const submit = vi.fn();
    render(<DynamicFormRenderer versionId={12} onSubmit={submit} initialValues={{ unknown: 'discard' }} />);
    const result = await screen.findByLabelText(/Wynik/);
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz odpowiedzi' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
    fireEvent.change(result, { target: { value: 'PASS' } });
    const measurement = await screen.findByLabelText(/Pomiar/);
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz odpowiedzi' }));
    await waitFor(() => expect(measurement).toHaveAttribute('aria-invalid', 'true'));
    fireEvent.change(measurement, { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz odpowiedzi' }));
    await waitFor(() => expect(measurement).toHaveAttribute('aria-invalid', 'true'));
    fireEvent.change(measurement, { target: { value: '5' } });
    fireEvent.change(result, { target: { value: 'FAIL' } });
    const note = await screen.findByLabelText('Uwagi');
    fireEvent.change(note, { target: { value: 'Powtórz test' } });
    fireEvent.blur(note);
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz odpowiedzi' }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith(
      { result: 'FAIL', measurement: 5, note: 'Powtórz test' }, expect.objectContaining({ id: 12 }),
    ));
    expect(await screen.findByText('Odpowiedzi zostały zapisane.')).toBeInTheDocument();
    fireEvent.change(note, { target: { value: 'Poprawione' } });
    expect(screen.queryByText('Odpowiedzi zostały zapisane.')).not.toBeInTheDocument();
  });

  it('allows partial saving and reports callback errors', async () => {
    const submit = vi.fn().mockRejectedValue(new Error('backend validation'));
    render(<DynamicFormRenderer versionId={12} requireRequired={false} onSubmit={submit} submitLabel="Zapisz szkic" />);
    await screen.findByLabelText(/Wynik/);
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz szkic' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się zapisać');
    expect(submit).toHaveBeenCalledWith({}, expect.objectContaining({ id: 12 }));
  });

  it('reports invalid hidden answers rather than silently blocking submission', async () => {
    const submit = vi.fn();
    render(<DynamicFormRenderer versionId={12} onSubmit={submit}
      initialValues={{ result: 'FAIL', measurement: 'invalid' }} />);
    await screen.findByLabelText(/Wynik/);
    expect(screen.queryByLabelText(/Pomiar/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz odpowiedzi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Pomiar:');
    expect(submit).not.toHaveBeenCalled();
  });

  it('disables controls while submitting and in read-only mode', async () => {
    let finish!: () => void;
    const submit = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const { rerender } = render(<DynamicFormRenderer versionId={12} initialValues={{ result: 'FAIL' }} onSubmit={submit} />);
    const result = await screen.findByLabelText(/Wynik/);
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz odpowiedzi' }));
    expect(await screen.findByRole('button', { name: 'Zapisywanie…' })).toBeDisabled();
    expect(result).toBeDisabled();
    await act(async () => { finish(); });
    rerender(<DynamicFormRenderer versionId={12} disabled onSubmit={submit} />);
    expect(screen.getByLabelText(/Wynik/)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Zapisz odpowiedzi' })).toBeDisabled();
  });

  it('shows fetch errors and retries', async () => {
    vi.mocked(formsService.getVersion).mockRejectedValueOnce(new Error('403'));
    render(<DynamicFormRenderer versionId={12} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się pobrać');
    fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
    expect(await screen.findByLabelText(/Wynik/)).toBeInTheDocument();
    expect(formsService.getVersion).toHaveBeenCalledTimes(2);
  });

  it.each([0, -1, NaN, 1.5, 2147483648])('rejects invalid version ID %s', async versionId => {
    render(<DynamicFormRenderer versionId={versionId} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Nieprawidłowy');
    expect(formsService.getVersion).not.toHaveBeenCalled();
  });

  it('fails closed for unsupported fields and inconsistent API version IDs', async () => {
    vi.mocked(formsService.getVersion).mockResolvedValueOnce({ ...version, id: 99 });
    const { unmount } = render(<DynamicFormRenderer versionId={12} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('inną wersję');
    unmount();
    vi.mocked(formsService.getVersion).mockResolvedValueOnce({
      ...version, fields: [{ ...version.fields[0], fieldType: 'UPLOAD' }],
    });
    render(<DynamicFormRenderer versionId={12} />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Wynik/)).not.toBeInTheDocument();
  });

  it('shows empty views for empty definitions and entirely hidden fields', async () => {
    vi.mocked(formsService.getVersion).mockResolvedValueOnce({ ...version, sections: [], fields: [] });
    const { unmount } = render(<DynamicFormRenderer versionId={12} onSubmit={vi.fn()} />);
    expect(await screen.findByText('Brak widocznych pól formularza.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zapisz odpowiedzi' })).toBeDisabled();
    unmount();
    vi.mocked(formsService.getVersion).mockResolvedValue({
      ...version, sections: version.sections.map(section => ({
        ...section, conditions: { visibleWhen: { field: 'result', operator: 'equals', value: 'PASS' } },
      })),
    });
    render(<DynamicFormRenderer versionId={12} />);
    expect(await screen.findByText('Brak widocznych pól formularza.')).toBeInTheDocument();
  });

  it('ignores stale requests and resets answers when the version changes', async () => {
    let resolveOld!: (value: FormVersion) => void;
    vi.mocked(formsService.getVersion).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    const { rerender } = render(<DynamicFormRenderer versionId={12} />);
    vi.mocked(formsService.getVersion).mockResolvedValueOnce({ ...version, id: 13, title: 'Nowa wersja' });
    rerender(<DynamicFormRenderer versionId={13} initialValues={{ result: 'FAIL' }} />);
    expect(await screen.findByText('Nowa wersja')).toBeInTheDocument();
    await act(async () => resolveOld(version));
    expect(screen.queryByRole('heading', { name: 'Kontrola' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Wynik/)).toHaveValue('FAIL');
    vi.mocked(formsService.getVersion).mockResolvedValueOnce(version);
    rerender(<DynamicFormRenderer versionId={12} />);
    expect(await screen.findByRole('heading', { name: 'Kontrola' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Wynik/)).toHaveValue('');
  });
});
