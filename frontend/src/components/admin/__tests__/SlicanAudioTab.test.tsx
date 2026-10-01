import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SlicanAudioTab } from '../SlicanAudioTab';
import type { SlicanCentralSpecification, SlicanLicenseSpecification } from '../../../types/slicanAudio.types';
import type { WarehouseStock } from '../../../types/warehouseStock.types';

const mocks = vi.hoisted(() => ({
  getCentrals: vi.fn(),
  createCentral: vi.fn(),
  updateCentral: vi.fn(),
  deleteCentral: vi.fn(),
  getLicenses: vi.fn(),
  createLicense: vi.fn(),
  updateLicense: vi.fn(),
  deleteLicense: vi.fn(),
  warehouseGetAll: vi.fn(),
  warehouseGetById: vi.fn()
}));

vi.mock('../../../services/slicanAudio.service', () => ({
  default: {
    getCentrals: mocks.getCentrals,
    createCentral: mocks.createCentral,
    updateCentral: mocks.updateCentral,
    deleteCentral: mocks.deleteCentral,
    getLicenses: mocks.getLicenses,
    createLicense: mocks.createLicense,
    updateLicense: mocks.updateLicense,
    deleteLicense: mocks.deleteLicense
  }
}));

vi.mock('../../../services/warehouseStock.service', () => ({
  warehouseStockService: {
    getAll: mocks.warehouseGetAll,
    getById: mocks.warehouseGetById
  }
}));

const stock: WarehouseStock = {
  id: 41,
  uuid: 'test-stock',
  catalogNumber: 'SLICAN-1',
  materialName: 'Centrala testowa',
  materialType: 'device',
  unit: 'szt.',
  quantityInStock: 1,
  quantityReserved: 0,
  quantityAvailable: 1,
  currency: 'PLN',
  isSerialized: false,
  isBatchTracked: false,
  requiresIpAddress: false,
  isActive: true,
  isHazardous: false,
  requiresCertification: false,
  requiresGrounding: false,
  status: 'ACTIVE',
  createdAt: '',
  updatedAt: ''
};

const central: SlicanCentralSpecification = {
  id: 2,
  warehouseStockId: stock.id,
  modelName: 'NCP test',
  maxSipVoipSubscribers: 100,
  maxDphIpDevices: 20,
  maxAudioIpDevices: 20,
  maxIvrChannels: 5,
  maxConferenceChannels: 5,
  priority: 10,
  isActive: false,
  createdAt: '',
  updatedAt: ''
};

const license: SlicanLicenseSpecification = {
  id: 3,
  warehouseStockId: stock.id,
  licenseType: 'VOIP_SUBSCRIBER',
  packageSize: 1,
  demandField: 'sipVoipSubscribers',
  isActive: true,
  priority: 10,
  createdAt: '',
  updatedAt: ''
};

const secondStock: WarehouseStock = { ...stock, id: 42, catalogNumber: 'SLICAN-2' };

const renderTab = (permissions = { canCreate: true, canUpdate: true, canDelete: true }) =>
  render(<SlicanAudioTab {...permissions} />);

describe('SlicanAudioTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCentrals.mockResolvedValue([]);
    mocks.getLicenses.mockResolvedValue([]);
    mocks.warehouseGetAll.mockResolvedValue({ data: [stock] });
    mocks.warehouseGetById.mockResolvedValue({ data: stock });
    mocks.createCentral.mockResolvedValue({});
    mocks.updateCentral.mockResolvedValue({});
    mocks.deleteCentral.mockResolvedValue(undefined);
    mocks.createLicense.mockResolvedValue({});
    mocks.updateLicense.mockResolvedValue({});
    mocks.deleteLicense.mockResolvedValue(undefined);
  });

  it('renders inactive central configurations and the no-active-license warning', async () => {
    mocks.getCentrals.mockResolvedValue([central]);
    renderTab();

    expect(await screen.findByText('NCP test')).toBeInTheDocument();
    expect(screen.getByText(/Nieaktywna — pomijana przez resolver/)).toBeInTheDocument();
    expect(screen.getByText(/Brak aktywnych licencji/)).toBeInTheDocument();
    expect(screen.getByText('Podgląd reguł doboru:').parentElement).toHaveTextContent('tylko aktywne centrale');
  });

  it('shows and recovers from a configuration loading error', async () => {
    mocks.getCentrals.mockRejectedValueOnce(new Error('load failed'));
    renderTab();

    expect(await screen.findByRole('alert')).toHaveTextContent('load failed');
    fireEvent.click(screen.getByRole('button', { name: 'Ponów' }));
    expect(await screen.findByRole('button', { name: 'Dodaj centralę' })).toBeInTheDocument();
  });

  it('requires a warehouse item and creates a central from an existing stock item', async () => {
    renderTab();
    await screen.findByRole('button', { name: 'Dodaj centralę' });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj centralę' }));
    expect(screen.getByRole('button', { name: 'Zapisz' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Wyszukaj po nazwie lub numerze katalogowym'), { target: { value: 'SLICAN' } });
    fireEvent.click(screen.getByRole('button', { name: 'Szukaj' }));
    fireEvent.click(await screen.findByRole('button', { name: /SLICAN-1/ }));
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'New NCP' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    await waitFor(() => expect(mocks.createCentral).toHaveBeenCalledWith(expect.objectContaining({
      warehouseStockId: stock.id,
      modelName: 'New NCP',
      maxSipVoipSubscribers: 0,
      maxConferenceChannels: 0
    })));
    expect(mocks.warehouseGetAll).toHaveBeenCalledWith({ search: 'SLICAN' }, 1, 50);
  });

  it('edits all central limits, priority, and active state', async () => {
    mocks.getCentrals.mockResolvedValue([central]);
    renderTab();
    await screen.findByText('NCP test');
    fireEvent.click(screen.getByRole('button', { name: 'Edytuj centralę NCP test' }));
    fireEvent.change(screen.getByLabelText('Maks. abonenci VoIP'), { target: { value: '101' } });
    fireEvent.change(screen.getByLabelText('Maks. urządzenia DPH.IP'), { target: { value: '21' } });
    fireEvent.change(screen.getByLabelText('Maks. urządzenia Audio.IP'), { target: { value: '22' } });
    fireEvent.change(screen.getByLabelText('Maks. kanały IVR'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('Maks. kanały konferencyjne'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Priorytet'), { target: { value: '2' } });
    fireEvent.click(screen.getByLabelText('Aktywna'));
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    await waitFor(() => expect(mocks.updateCentral).toHaveBeenCalledWith(central.id, expect.objectContaining({
      maxSipVoipSubscribers: 101,
      maxDphIpDevices: 21,
      maxAudioIpDevices: 22,
      maxIvrChannels: 6,
      maxConferenceChannels: 7,
      priority: 2,
      isActive: true
    })));
  });

  it('prevents duplicate active license packages and displays missing package warnings', async () => {
    mocks.getLicenses.mockResolvedValue([license]);
    mocks.warehouseGetAll.mockResolvedValue({ data: [secondStock] });
    renderTab();
    fireEvent.click(await screen.findByRole('tab', { name: 'Licencje' }));
    expect(await screen.findByText(/brakuje aktywnych pakietów 10, 100/)).toBeInTheDocument();
    expect(screen.getByText('Podgląd reguł doboru:').parentElement).toHaveTextContent('kolejno 100, 10, 1');
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj licencję' }));
    fireEvent.change(screen.getByLabelText('Wyszukaj po nazwie lub numerze katalogowym'), { target: { value: 'SLICAN' } });
    fireEvent.click(screen.getByRole('button', { name: 'Szukaj' }));
    fireEvent.click(await screen.findByRole('button', { name: /SLICAN-2/ }));
    fireEvent.change(screen.getByLabelText('Rozmiar pakietu'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    expect(await screen.findByText('Aktywna licencja tego typu i rozmiaru pakietu już istnieje.')).toBeInTheDocument();
    expect(mocks.createLicense).not.toHaveBeenCalled();
  });

  it('creates a license using the selected stock item and package settings', async () => {
    mocks.warehouseGetAll.mockResolvedValue({ data: [secondStock] });
    renderTab();
    fireEvent.click(await screen.findByRole('tab', { name: 'Licencje' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj licencję' }));
    fireEvent.change(screen.getByLabelText('Wyszukaj po nazwie lub numerze katalogowym'), { target: { value: 'SLICAN-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Szukaj' }));
    fireEvent.click(await screen.findByRole('button', { name: /SLICAN-2/ }));
    fireEvent.change(screen.getByLabelText('Rozmiar pakietu'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    await waitFor(() => expect(mocks.createLicense).toHaveBeenCalledWith({
      warehouseStockId: secondStock.id,
      licenseType: 'VOIP_SUBSCRIBER',
      packageSize: 10,
      demandField: 'sipVoipSubscribers',
      isActive: true,
      priority: 10
    }));
  });

  it('updates a license and surfaces API errors', async () => {
    mocks.getLicenses.mockResolvedValue([license]);
    mocks.updateLicense.mockRejectedValueOnce({ response: { data: { error: 'Conflict from API' } } });
    renderTab();
    fireEvent.click(await screen.findByRole('tab', { name: 'Licencje' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edytuj licencję Abonenci VoIP 1' }));
    fireEvent.change(screen.getByLabelText('Priorytet'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Conflict from API');
    expect(mocks.updateLicense).toHaveBeenCalledWith(license.id, expect.objectContaining({ priority: 20 }));
  });

  it('disables actions when permissions are missing and confirms specification deletion only', async () => {
    mocks.getCentrals.mockResolvedValue([central]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { unmount } = renderTab({ canCreate: false, canUpdate: false, canDelete: false });
    await screen.findByText('NCP test');
    expect(screen.getByRole('button', { name: 'Dodaj centralę' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edytuj centralę NCP test' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Usuń centralę NCP test' })).toBeDisabled();

    unmount();
    confirm.mockRestore();
    const centralView = renderTab();
    await screen.findByText('NCP test');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Usuń centralę NCP test' }));
    await waitFor(() => expect(mocks.deleteCentral).toHaveBeenCalledWith(central.id));
    expect(mocks.warehouseGetById).not.toHaveBeenCalledWith(stock.id, expect.anything());
    centralView.unmount();
    vi.restoreAllMocks();

    mocks.getLicenses.mockResolvedValue([license]);
    const licenseView = renderTab();
    fireEvent.click(await screen.findByRole('tab', { name: 'Licencje' }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(await screen.findByRole('button', { name: 'Usuń licencję Abonenci VoIP 1' }));
    await waitFor(() => expect(mocks.deleteLicense).toHaveBeenCalledWith(license.id));
    licenseView.unmount();
    vi.restoreAllMocks();
  });
});
