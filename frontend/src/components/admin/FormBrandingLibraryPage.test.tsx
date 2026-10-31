import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormBrandingLibraryPage } from './FormBrandingLibraryPage';
import { formsService } from '../../services/forms.service';
import variableEngineService from '../../services/variableEngine.service';

vi.mock('../../services/forms.service', () => ({
  formsService: {
    listBranding: vi.fn(),
    createBranding: vi.fn(),
    updateBranding: vi.fn(),
    deleteBranding: vi.fn(),
    uploadBrandingLogo: vi.fn(),
    getBrandingLogo: vi.fn(),
    getBrandingSnapshotFile: vi.fn(),
  },
}));

vi.mock('../../services/variableEngine.service', () => ({
  default: { listVariables: vi.fn() },
}));

const renderPage = () => render(<MemoryRouter><FormBrandingLibraryPage /></MemoryRouter>);

describe('FormBrandingLibraryPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(formsService.listBranding).mockResolvedValue([]);
    vi.mocked(formsService.getBrandingLogo).mockResolvedValue(new Blob());
    vi.mocked(formsService.getBrandingSnapshotFile).mockResolvedValue(new Blob());
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:branding-preview') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.mocked(variableEngineService.listVariables).mockResolvedValue([
      {
        expression: 'task.number', type: 'string', description: 'Numer zadania',
        provider: 'task', usableInBom: false, usableInForms: true,
      },
      {
        expression: 'task.secret', type: 'string', description: 'Nieudostępnione',
        provider: 'task', usableInBom: false, usableInForms: false,
      },
    ]);
  });

  it('creates a custom three-column layout using approved variable sources', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Biblioteka nagłówków i stopek' });
    fireEvent.click(screen.getByRole('button', { name: 'Utwórz własny' }));
    fireEvent.change(screen.getByLabelText('Element'), { target: { value: 'variable' } });
    expect(await screen.findByRole('option', { name: /task\.number/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /task\.secret/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nazwa'), { target: { value: 'Nagłówek' } });
    fireEvent.change(screen.getByLabelText('Źródło danych'), { target: { value: 'task.number' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj element do kolumny' }));
    expect(screen.getAllByText('task.number')).toHaveLength(2);
    fireEvent.click(screen.getByLabelText('Ustaw jako domyślny dla tego typu'));
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    await waitFor(() => expect(formsService.createBranding).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Nagłówek',
        kind: 'HEADER',
        mode: 'CUSTOM',
        isDefault: true,
        layout: expect.objectContaining({
          columns: expect.objectContaining({
            left: [{ type: 'variable', source: 'task.number' }],
          }),
        }),
      }),
      undefined,
    ));
    expect(await screen.findByRole('status')).toHaveTextContent('Element brandingu został zapisany.');
  });

  it('uploads a logo before adding it to a custom layout', async () => {
    vi.mocked(formsService.uploadBrandingLogo).mockResolvedValue({
      assetPath: 'forms/branding/assets/12345678-1234-4234-9234-123456789abc.png',
      fileMime: 'image/png',
      fileName: '12345678-1234-4234-9234-123456789abc.png',
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Utwórz własny' }));
    fireEvent.change(screen.getByLabelText('Nazwa'), { target: { value: 'Stopka' } });
    fireEvent.change(screen.getByLabelText('Typ'), { target: { value: 'FOOTER' } });
    fireEvent.change(screen.getByLabelText('Element'), { target: { value: 'logo' } });
    const logo = new File(['image'], 'logo.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Logo PNG/JPG'), { target: { files: [logo] } });

    await waitFor(() => expect(formsService.uploadBrandingLogo).toHaveBeenCalledWith(logo));
    expect(screen.getByText('logo')).toBeInTheDocument();
  });

  it('previews an uploaded PDF inside the A4 header strip', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Wgraj z pliku' }));
    fireEvent.change(screen.getByLabelText('Nazwa'), { target: { value: 'Papier firmowy' } });
    fireEvent.change(screen.getByLabelText('Sposób utworzenia'), { target: { value: 'FILE' } });
    const pdf = new File(['%PDF-1.7'], 'papier.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Plik/), { target: { files: [pdf] } });

    expect(await screen.findByTitle('Papier firmowy')).toBeInTheDocument();
  });
});
