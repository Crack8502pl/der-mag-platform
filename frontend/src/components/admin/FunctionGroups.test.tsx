import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FunctionGroupsPage } from './FunctionGroupsPage';
import { keyFromName } from '../../utils/functionGroupKey';
import { PermissionsMatrixPage } from './PermissionsMatrixPage';
import { UserRoleAndFunctions } from '../users/UserRoleAndFunctions';

const mocks = {
  getFunctionGroups: vi.fn(),
  createFunctionGroup: vi.fn(),
  updateFunctionGroup: vi.fn(),
  deactivateFunctionGroup: vi.fn(),
  getFunctionGroupMembers: vi.fn(),
  addFunctionGroupMember: vi.fn(),
  removeFunctionGroupMember: vi.fn(),
  searchUsers: vi.fn(),
  getRoles: vi.fn(),
  updateRole: vi.fn(),
  getPermissionsSchema: vi.fn(),
};

vi.mock('../../services/admin.service', () => ({
  default: new Proxy(
    {},
    { get: (_target, prop: string) => (...args: unknown[]) => (mocks as Record<string, (...a: unknown[]) => unknown>)[prop](...args) },
  ),
}));

const auditors = {
  id: 2,
  key: 'PROCESS_AUDITORS',
  name: 'Audytorzy procesów',
  description: null,
  permissions: {},
  active: true,
  activeMemberCount: 1,
};

const renderWithRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('keyFromName', () => {
  it('tworzy klucz UPPER_SNAKE_CASE z polskiej nazwy', () => {
    expect(keyFromName('Audytorzy procesów')).toBe('AUDYTORZY_PROCESOW');
    expect(keyFromName('  Dział  techniczny! ')).toBe('DZIAL_TECHNICZNY');
  });
});

describe('UserRoleAndFunctions', () => {
  it('pokazuje rolę i funkcje jako etykiety', () => {
    render(
      <UserRoleAndFunctions
        roleName="viewer"
        functionGroups={[{ key: 'PROCESS_AUDITORS', name: 'Audytorzy procesów' }]}
      />,
    );
    expect(screen.getByText('Rola: viewer')).toBeInTheDocument();
    expect(screen.getByText('Audytorzy procesów')).toBeInTheDocument();
  });

  it('bez funkcji pokazuje tylko rolę', () => {
    const { container } = render(<UserRoleAndFunctions roleName="viewer" />);
    expect(screen.getByText('Rola: viewer')).toBeInTheDocument();
    expect(container.querySelectorAll('.function-group-label')).toHaveLength(0);
  });
});

describe('PermissionsMatrixPage – wariant funkcji', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('nie pokazuje opcji „wszystko”, roli admin ani dodawania roli i zapisuje przez updateFunctionGroup', async () => {
    mocks.getFunctionGroups.mockResolvedValue([
      auditors,
      { ...auditors, id: 3, key: 'OLD', name: 'Stara funkcja', active: false },
    ]);
    mocks.getPermissionsSchema.mockResolvedValue([
      { name: 'contracts', displayName: 'Kontrakty', actions: ['read', 'create'] },
    ]);
    mocks.updateFunctionGroup.mockResolvedValue({});

    const { container } = renderWithRouter(<PermissionsMatrixPage variant="functionGroups" />);

    expect(await screen.findByText('Audytorzy procesów', { selector: '.role-name' })).toBeInTheDocument();
    expect(screen.queryByText('Stara funkcja')).not.toBeInTheDocument();
    expect(screen.queryByText('ADMIN')).not.toBeInTheDocument();
    expect(screen.queryByText(/Uprawnienie zabronione/)).not.toBeInTheDocument();
    expect(mocks.getRoles).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Edytuj/ }));
    expect(screen.queryByRole('button', { name: /Dodaj rolę/ })).not.toBeInTheDocument();

    const cells = container.querySelectorAll('td.permission-cell');
    // contracts.create – druga akcja
    fireEvent.click(cells[1]);
    expect(cells[1].className).toContain('granted');

    fireEvent.click(screen.getByRole('button', { name: /Zapisz zmiany \(1\)/ }));
    await waitFor(() =>
      expect(mocks.updateFunctionGroup).toHaveBeenCalledWith(2, {
        permissions: { contracts: { create: true } },
      }),
    );
    expect(mocks.updateRole).not.toHaveBeenCalled();
  });

  it('ponowne kliknięcie usuwa wpis (bez wartości false)', async () => {
    mocks.getFunctionGroups.mockResolvedValue([{ ...auditors, permissions: { contracts: { create: true } } }]);
    mocks.getPermissionsSchema.mockResolvedValue([
      { name: 'contracts', displayName: 'Kontrakty', actions: ['create'] },
    ]);
    mocks.updateFunctionGroup.mockResolvedValue({});

    const { container } = renderWithRouter(<PermissionsMatrixPage variant="functionGroups" />);
    await screen.findByText('Audytorzy procesów', { selector: '.role-name' });
    fireEvent.click(screen.getByRole('button', { name: /Edytuj/ }));
    const cell = container.querySelector('td.permission-cell')!;
    fireEvent.click(cell);
    expect(cell.className).not.toContain('denied');

    fireEvent.click(screen.getByRole('button', { name: /Zapisz zmiany/ }));
    await waitFor(() => expect(mocks.updateFunctionGroup).toHaveBeenCalledWith(2, { permissions: {} }));
  });
});

describe('FunctionGroupsPage', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it('wyświetla listę funkcji i tworzy nową z kluczem z nazwy', async () => {
    mocks.getFunctionGroups.mockResolvedValue([auditors]);
    mocks.createFunctionGroup.mockResolvedValue({});

    renderWithRouter(<FunctionGroupsPage />);
    expect(await screen.findByText('Audytorzy procesów')).toBeInTheDocument();
    expect(screen.getByText('PROCESS_AUDITORS')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nazwa nowej funkcji'), { target: { value: 'Dział jakości' } });
    expect(screen.getByLabelText('Klucz nowej funkcji')).toHaveValue('DZIAL_JAKOSCI');
    fireEvent.click(screen.getByRole('button', { name: /Dodaj funkcję/ }));

    await waitFor(() =>
      expect(mocks.createFunctionGroup).toHaveBeenCalledWith({
        key: 'DZIAL_JAKOSCI',
        name: 'Dział jakości',
        description: undefined,
        permissions: {},
      }),
    );
  });

  it('pokazuje historię członków, nadaje funkcję wyszukanej osobie z datą „do” i odbiera ją', async () => {
    mocks.getFunctionGroups.mockResolvedValue([auditors]);
    mocks.getFunctionGroupMembers.mockResolvedValue([
      {
        id: 10,
        userId: 5,
        functionGroupId: 2,
        validFrom: '2026-01-01T00:00:00.000Z',
        validTo: null,
        grantedById: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        isActive: true,
        user: { id: 5, username: 'jkowal', firstName: 'Jan', lastName: 'Kowalski', email: 'j@x.pl' },
        grantedBy: { id: 1, firstName: 'Admin', lastName: 'Systemu' },
      },
      {
        id: 9,
        userId: 6,
        functionGroupId: 2,
        validFrom: '2025-01-01T00:00:00.000Z',
        validTo: '2025-06-01T00:00:00.000Z',
        grantedById: 1,
        createdAt: '2025-01-01T00:00:00.000Z',
        isActive: false,
        user: { id: 6, username: 'anowak', firstName: 'Anna', lastName: 'Nowak', email: 'a@x.pl' },
        grantedBy: null,
      },
    ]);
    mocks.searchUsers.mockResolvedValue([
      { id: 7, username: 'pzielinski', firstName: 'Piotr', lastName: 'Zieliński', email: 'p@x.pl' },
    ]);
    mocks.addFunctionGroupMember.mockResolvedValue({});
    mocks.removeFunctionGroupMember.mockResolvedValue(undefined);

    renderWithRouter(<FunctionGroupsPage />);
    await screen.findByText('Audytorzy procesów');
    fireEvent.click(screen.getByRole('button', { name: 'Członkowie' }));

    const section = await screen.findByRole('region', { name: 'Członkowie funkcji' });
    expect(await within(section).findByText(/Jan Kowalski/)).toBeInTheDocument();
    expect(within(section).getByText(/Anna Nowak/)).toBeInTheDocument();
    expect(within(section).getByText('Zakończona')).toBeInTheDocument();
    // zakończonego członkostwa nie można odebrać – historia jest niezmienna
    expect(within(section).getAllByRole('button', { name: 'Odbierz' })).toHaveLength(1);

    fireEvent.change(within(section).getByLabelText('Szukaj osoby'), { target: { value: 'ziel' } });
    fireEvent.click(within(section).getByRole('button', { name: 'Szukaj' }));
    await waitFor(() => expect(mocks.searchUsers).toHaveBeenCalledWith('ziel'));
    fireEvent.click(await within(section).findByRole('button', { name: /Piotr Zieliński/ }));
    fireEvent.change(within(section).getByLabelText('Do'), { target: { value: '2030-12-31' } });
    fireEvent.click(within(section).getByRole('button', { name: 'Nadaj funkcję' }));

    await waitFor(() =>
      expect(mocks.addFunctionGroupMember).toHaveBeenCalledWith(2, {
        userId: 7,
        validTo: new Date('2030-12-31T23:59:59').toISOString(),
      }),
    );

    fireEvent.click(within(section).getByRole('button', { name: 'Odbierz' }));
    await waitFor(() => expect(mocks.removeFunctionGroupMember).toHaveBeenCalledWith(2, 5));
  });
});
