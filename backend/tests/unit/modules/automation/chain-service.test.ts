import { AppDataSource } from '../../../../src/config/database';
import { FormTemplateVersion } from '../../../../src/entities/FormTemplateVersion';
import { createDefaultRegistry } from '../../../../src/modules/automation/actions';
import { AutomationChain } from '../../../../src/modules/automation/entities/AutomationChain';
import { AutomationError } from '../../../../src/modules/automation/errors';
import { AutomationChainService } from '../../../../src/modules/automation/services/AutomationChainService';

jest.mock('../../../../src/config/database', () => ({ AppDataSource: { getRepository: jest.fn(), manager: {} } }));
jest.mock('../../../../src/services/EmailQueueService', () => ({ __esModule: true, default: { addToQueue: jest.fn(), isReady: jest.fn() } }));
jest.mock('../../../../src/services/SlackWebhookService', () => ({ __esModule: true, default: { sendToChannel: jest.fn() } }));

const emailStep = { action: 'send_email', params: { recipientType: 'assignee', subject: 'Zatwierdzono {task.number}', body: 'Treść' } };
let versionStatus = 'DRAFT';
let existing: unknown = null;
const saved: unknown[] = [];

beforeEach(() => {
  versionStatus = 'DRAFT';
  existing = null;
  saved.length = 0;
  (AppDataSource.getRepository as jest.Mock).mockImplementation(entity => {
    if (entity === FormTemplateVersion) return { findOne: jest.fn(async () => (versionStatus === 'MISSING' ? null : { id: 5, status: versionStatus })) };
    if (entity === AutomationChain) {
      return {
        findOne: jest.fn(async () => existing),
        create: jest.fn((value: object) => ({ ...value })),
        save: jest.fn(async (value: object) => { saved.push(value); return { id: 1, ...value }; }),
      };
    }
    return undefined;
  });
});

const service = () => new AutomationChainService(createDefaultRegistry());
const input = (steps: unknown = [emailStep]) => ({ ownerType: 'FORM_TEMPLATE_VERSION', ownerId: 5, eventType: 'FORM_APPROVED', steps });
const sender = { id: 3, permissions: { notifications: { sendManual: true } } };

describe('AutomationChainService.save', () => {
  it('zapisuje poprawny łańcuch z autorem i domyślnym onError = STOP', async () => {
    const chain = await service().save(input(), sender);
    expect(chain).toMatchObject({ ownerType: 'FORM_TEMPLATE_VERSION', ownerId: 5, eventType: 'FORM_APPROVED', onError: 'STOP', createdById: 3 });
    expect(saved).toHaveLength(1);
  });

  it('brak uprawnienia do klocka blokuje zapis łańcucha (403)', async () => {
    const error = await service().save(input(), { id: 3, permissions: { forms: { read: true } } }).catch(e => e);
    expect(error).toBeInstanceOf(AutomationError);
    expect(error).toMatchObject({ status: 403, code: 'ACTION_FORBIDDEN' });
    expect(error.message).toContain('Wyślij e-mail');
    expect(saved).toHaveLength(0);
  });

  it('sprawdza uprawnienie KAŻDEGO klocka – jeden brakujący blokuje cały łańcuch', async () => {
    const steps = [emailStep, { action: 'create_task', params: { taskType: 1, title: 'Nowe' } }];
    await expect(service().save(input(steps), sender)).rejects.toMatchObject({ status: 403 });
    await expect(service().save(input(steps), { id: 3, permissions: { notifications: { sendManual: true }, tasks: { create: true } } })).resolves.toBeDefined();
  });

  it('uprawnienie warunkowe (np. tasks.create = "SERWIS") nie wystarcza', async () => {
    const steps = [{ action: 'create_task', params: { taskType: 1, title: 'Nowe' } }];
    await expect(service().save(input(steps), { id: 3, permissions: { tasks: { create: 'SERWIS' } } })).rejects.toMatchObject({ status: 403 });
  });

  it('administrator (all) może zapisać dowolny klocek', async () => {
    await expect(service().save(input(), { id: 1, permissions: { all: true } })).resolves.toBeDefined();
  });

  it('nieznana zmienna lub brak wymaganego pola = błąd walidacji 400', async () => {
    const bad = { action: 'send_email', params: { recipientType: 'assignee', subject: '{task.nieistnieje}' } };
    const error = await service().save(input([bad]), sender).catch(e => e);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
    expect(error.message).toContain('nieznaną zmienną {task.nieistnieje}');
    expect(error.message).toContain('Pole „Treść” jest wymagane.');
  });

  it('nieznany klocek = 400', async () => {
    await expect(service().save(input([{ action: 'nie_ma', params: {} }]), sender)).rejects.toMatchObject({ status: 400 });
  });

  it('łańcuch wersji opublikowanej jest niezmienny (409)', async () => {
    versionStatus = 'PUBLISHED';
    await expect(service().save(input(), sender)).rejects.toMatchObject({ status: 409, code: 'CHAIN_IMMUTABLE' });
  });

  it('nieistniejąca wersja = 404; zły typ właściciela/zdarzenia = 400', async () => {
    versionStatus = 'MISSING';
    await expect(service().save(input(), sender)).rejects.toMatchObject({ status: 404 });
    versionStatus = 'DRAFT';
    await expect(service().save({ ...input(), ownerType: 'COS' }, sender)).rejects.toMatchObject({ status: 400 });
    await expect(service().save({ ...input(), eventType: 'COS' }, sender)).rejects.toMatchObject({ status: 400 });
    await expect(service().save({ ...input(), steps: 'x' }, sender)).rejects.toMatchObject({ status: 400 });
  });

  it('aktualizuje istniejący łańcuch zamiast tworzyć duplikat', async () => {
    existing = { id: 9, ownerType: 'FORM_TEMPLATE_VERSION', ownerId: 5, eventType: 'FORM_APPROVED', steps: [], onError: 'STOP', createdById: 1 };
    const chain = await service().save({ ...input(), onError: 'CONTINUE' }, sender);
    expect(chain).toMatchObject({ id: 9, onError: 'CONTINUE', createdById: 3 });
  });
});
