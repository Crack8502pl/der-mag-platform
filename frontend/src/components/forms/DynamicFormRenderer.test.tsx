import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DynamicFormRenderer } from './DynamicFormRenderer';
import { formsService } from '../../services/forms.service';
import type { FormVersion } from '../../types/forms.types';

vi.mock('../../services/forms.service', () => ({ formsService: { getVersion: vi.fn() } }));

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
});
afterEach(cleanup);

describe('DynamicFormRenderer', () => {
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
