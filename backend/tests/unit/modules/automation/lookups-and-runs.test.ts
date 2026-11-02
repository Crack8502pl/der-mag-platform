import type { Request, Response } from 'express';
import { AppDataSource } from '../../../../src/config/database';
import { Role } from '../../../../src/entities/Role';
import { TaskType } from '../../../../src/entities/TaskType';
import { User } from '../../../../src/entities/User';
import { FunctionGroup } from '../../../../src/modules/function-groups/entities/FunctionGroup';
import { AutomationError } from '../../../../src/modules/automation/errors';
import { AutomationLookupService, MAX_LOOKUP_RESULTS } from '../../../../src/modules/automation/services/AutomationLookupService';

jest.mock('../../../../src/config/database', () => ({ AppDataSource: { getRepository: jest.fn(), manager: {} } }));
jest.mock('../../../../src/services/EmailQueueService', () => ({ __esModule: true, default: { addToQueue: jest.fn(), isReady: jest.fn() } }));
jest.mock('../../../../src/services/SlackWebhookService', () => ({ __esModule: true, default: { sendToChannel: jest.fn() } }));
jest.mock('../../../../src/modules/automation/runtime', () => {
  const { AutomationLookupService: Lookups } = jest.requireActual('../../../../src/modules/automation/services/AutomationLookupService');
  const { AutomationChainService } = jest.requireActual('../../../../src/modules/automation/services/AutomationChainService');
  const { createDefaultRegistry } = jest.requireActual('../../../../src/modules/automation/actions');
  return {
    automationStore: { listRuns: jest.fn(async () => []) },
    automationChains: new AutomationChainService(createDefaultRegistry()),
    automationExecution: {},
    automationLookups: new Lookups(),
  };
});

import { AutomationController } from '../../../../src/modules/automation/controllers/AutomationController';
import { automationStore } from '../../../../src/modules/automation/runtime';

type Repository = Record<string, jest.Mock>;
const repos = new Map<unknown, Repository>();

const userRow = (id: number, firstName: string, lastName: string, overrides: Record<string, unknown> = {}) => ({
  id, firstName, lastName, username: `${firstName[0]}${lastName}`.toLowerCase(), active: true, deletedAt: null, ...overrides,
});

function userQuery(rows: unknown[]) {
  const query = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn(async () => rows),
  };
  return query;
}

beforeEach(() => {
  repos.clear();
  (AppDataSource.getRepository as jest.Mock).mockImplementation(entity => repos.get(entity));
});

describe('AutomationLookupService', () => {
  const service = () => new AutomationLookupService();

  it('rozpoznaje tylko obsługiwane rodzaje list', () => {
    for (const type of ['user', 'role', 'functionGroup', 'taskType']) expect(service().parseType(type)).toBe(type);
    expect(() => service().parseType('password')).toThrow(AutomationError);
    expect(() => service().parseType(undefined)).toThrow(/Nieobsługiwany rodzaj listy/);
  });

  it('lista osób: aktywni, z etykietą „Imię Nazwisko (login)”, bez adresów e-mail i haseł', async () => {
    const query = userQuery([userRow(7, 'Jan', 'Kowalski')]);
    repos.set(User, { createQueryBuilder: jest.fn(() => query) });

    const options = await service().find('user', 'kow');

    expect(options).toEqual([{ value: 7, label: 'Jan Kowalski (jkowalski)' }]);
    expect(query.where).toHaveBeenCalledWith(expect.stringContaining('deletedAt IS NULL'), { active: true });
    expect(query.andWhere).toHaveBeenCalledWith(expect.stringContaining('ILIKE'), { term: '%kow%' });
    expect(query.limit).toHaveBeenCalledWith(MAX_LOOKUP_RESULTS);
  });

  it('lista osób: znaki specjalne LIKE w wyszukiwaniu są wyłączane', async () => {
    const query = userQuery([]);
    repos.set(User, { createQueryBuilder: jest.fn(() => query) });
    await service().find('user', '50%_x');
    expect(query.andWhere).toHaveBeenCalledWith(expect.any(String), { term: '%50\\%\\_x%' });
  });

  it('wskazana pozycja jest zawsze pierwsza i nie dubluje się na liście', async () => {
    const query = userQuery([userRow(1, 'Anna', 'Nowak'), userRow(7, 'Jan', 'Kowalski')]);
    repos.set(User, {
      createQueryBuilder: jest.fn(() => query),
      findOne: jest.fn(async () => userRow(7, 'Jan', 'Kowalski')),
    });

    const options = await service().find('user', '', '7');

    expect(options.map(option => option.value)).toEqual([7, 1]);
  });

  it('wskazana nieaktywna osoba zachowuje etykietę z dopiskiem', async () => {
    repos.set(User, {
      createQueryBuilder: jest.fn(() => userQuery([])),
      findOne: jest.fn(async () => userRow(9, 'Ewa', 'Lis', { active: false })),
    });
    expect(await service().find('user', '', '9')).toEqual([{ value: 9, label: 'Ewa Lis (elis) (nieaktywne)' }]);
  });

  it('lista ról: etykieta z opisu (część przed myślnikiem), wyszukiwanie bez polskich znaków', async () => {
    repos.set(Role, {
      find: jest.fn(async () => [
        { id: 1, name: 'admin', description: 'Administrator Systemu - Pełny dostęp' },
        { id: 3, name: 'manager', description: 'Menedżer - Zarządzanie projektami' },
        { id: 10, name: 'viewer', description: null },
      ]),
    });

    expect(await service().find('role')).toEqual([
      { value: 1, label: 'Administrator Systemu' },
      { value: 3, label: 'Menedżer' },
      { value: 10, label: 'viewer' },
    ]);
    expect(await service().find('role', 'menedzer')).toEqual([{ value: 3, label: 'Menedżer' }]);
  });

  it('lista funkcji: wartością jest klucz, etykietą nazwa, tylko aktywne', async () => {
    const find = jest.fn(async () => [{ key: 'PROCESS_AUDITORS', name: 'Audytorzy procesów', active: true }]);
    repos.set(FunctionGroup, { find, findOne: jest.fn(async () => ({ key: 'OLD_GROUP', name: 'Stara funkcja', active: false })) });

    expect(await service().find('functionGroup', 'audyt')).toEqual([{ value: 'PROCESS_AUDITORS', label: 'Audytorzy procesów' }]);
    expect(find).toHaveBeenCalledWith({ where: { active: true }, order: { name: 'ASC' } });
    expect((await service().find('functionGroup', 'audyt', 'OLD_GROUP'))[0]).toEqual({ value: 'OLD_GROUP', label: 'Stara funkcja (nieaktywne)' });
  });

  it('lista typów zadań: tylko aktywne; niepoprawny identyfikator wskazanej pozycji jest ignorowany', async () => {
    const findOne = jest.fn();
    repos.set(TaskType, { find: jest.fn(async () => [{ id: 4, name: 'Montaż kamer', active: true }]), findOne });

    expect(await service().find('taskType', '', 'abc')).toEqual([{ value: 4, label: 'Montaż kamer' }]);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('ogranicza liczbę wyników', async () => {
    repos.set(Role, {
      find: jest.fn(async () => Array.from({ length: 80 }, (_, index) => ({ id: index + 1, name: `rola_${index}`, description: null }))),
    });
    expect(await service().find('role')).toHaveLength(MAX_LOOKUP_RESULTS);
  });
});

function mockResponse() {
  const res = { statusCode: 200, body: undefined as any } as any;
  res.status = jest.fn((code: number) => { res.statusCode = code; return res; });
  res.json = jest.fn((body: unknown) => { res.body = body; return res; });
  return res as Response & { statusCode: number; body: any };
}

describe('AutomationController.listRuns – filtr instanceId', () => {
  const request = (query: Record<string, unknown>) => ({ query } as unknown as Request);

  beforeEach(() => (automationStore.listRuns as jest.Mock).mockClear());

  it('przekazuje instanceId do dziennika uruchomień', async () => {
    const res = mockResponse();
    await AutomationController.listRuns(request({ ownerType: 'FORM_TEMPLATE_VERSION', ownerId: '5', instanceId: '12' }), res);
    expect(res.statusCode).toBe(200);
    expect(automationStore.listRuns).toHaveBeenCalledWith('FORM_TEMPLATE_VERSION', 5, 50, 12);
  });

  it('bez instanceId zwraca uruchomienia całej wersji', async () => {
    const res = mockResponse();
    await AutomationController.listRuns(request({ ownerType: 'FORM_TEMPLATE_VERSION', ownerId: '5', limit: '10' }), res);
    expect(automationStore.listRuns).toHaveBeenCalledWith('FORM_TEMPLATE_VERSION', 5, 10, undefined);
  });

  it('odrzuca niepoprawny instanceId (400) bez odpytywania bazy', async () => {
    for (const instanceId of ['abc', '0', '-3', '1.5']) {
      const res = mockResponse();
      await AutomationController.listRuns(request({ ownerType: 'FORM_TEMPLATE_VERSION', ownerId: '5', instanceId }), res);
      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({ success: false, code: 'VALIDATION_FAILED' });
    }
    expect(automationStore.listRuns).not.toHaveBeenCalled();
  });
});

describe('AutomationController.listLookups', () => {
  const request = (query: Record<string, unknown>) => ({ query } as unknown as Request);

  it('zwraca listę wyboru dla znanego rodzaju', async () => {
    repos.set(TaskType, { find: jest.fn(async () => [{ id: 4, name: 'Montaż kamer', active: true }]), findOne: jest.fn() });
    const res = mockResponse();
    await AutomationController.listLookups(request({ type: 'taskType', search: 'monta' }), res);
    expect(res.body).toEqual({ success: true, data: [{ value: 4, label: 'Montaż kamer' }] });
  });

  it('nieznany rodzaj listy = 400', async () => {
    const res = mockResponse();
    await AutomationController.listLookups(request({ type: 'permissions' }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: 'VALIDATION_FAILED' });
  });
});
