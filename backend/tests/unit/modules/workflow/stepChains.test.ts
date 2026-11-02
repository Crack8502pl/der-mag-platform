import { createDefaultRegistry } from '../../../../src/modules/automation/actions';
import { AutomationChain } from '../../../../src/modules/automation/entities/AutomationChain';
import { AutomationError } from '../../../../src/modules/automation/errors';
import { AutomationChainService } from '../../../../src/modules/automation/services/AutomationChainService';
import { WorkflowStep } from '../../../../src/modules/workflow/entities/WorkflowStep';
import { WorkflowVersion } from '../../../../src/modules/workflow/entities/WorkflowVersion';
import { FakeDataSource } from './fakeDataSource';

jest.mock('../../../../src/config/database', () => ({ AppDataSource: { getRepository: jest.fn(), transaction: jest.fn(), query: jest.fn(), manager: {} } }));
jest.mock('../../../../src/services/EmailQueueService', () => ({ __esModule: true, default: { addToQueue: jest.fn(), isReady: jest.fn() } }));
jest.mock('../../../../src/services/SlackWebhookService', () => ({ __esModule: true, default: { sendToChannel: jest.fn() } }));

const emailStep = { action: 'send_email', params: { recipientType: 'assignee', subject: 'Etap rozpoczęty', body: 'Treść' } };
const builder = { id: 2, permissions: { workflow: { build: true }, notifications: { sendManual: true } } };

let db: FakeDataSource;
let service: AutomationChainService;

beforeEach(() => {
  db = new FakeDataSource();
  db.insert(WorkflowVersion, [
    { id: 1, definitionId: 1, version: 2, status: 'DRAFT' },
    { id: 2, definitionId: 1, version: 1, status: 'PUBLISHED' },
    { id: 3, definitionId: 2, version: 1, status: 'SUPERSEDED' },
  ]);
  db.insert(WorkflowStep, [
    { id: 10, versionId: 1, key: 'montaz', name: 'Montaż', sortOrder: 1 },
    { id: 20, versionId: 2, key: 'montaz', name: 'Montaż', sortOrder: 1 },
    { id: 30, versionId: 3, key: 'odbior', name: 'Odbiór', sortOrder: 1 },
  ]);
  service = new AutomationChainService(createDefaultRegistry(), db as never);
});

const input = (overrides: Record<string, unknown> = {}) => ({
  ownerType: 'WORKFLOW_STEP',
  ownerId: 10,
  eventType: 'STEP_ENTERED',
  steps: [emailStep],
  ...overrides,
});

describe('AutomationChainService – łańcuchy etapów procesu (WORKFLOW_STEP)', () => {
  it('zapisuje łańcuch etapu wersji roboczej i wpisuje zmianę do audit_logs (przed/po)', async () => {
    const chain = await service.save(input(), builder);
    expect(chain).toMatchObject({ ownerType: 'WORKFLOW_STEP', ownerId: 10, eventType: 'STEP_ENTERED', onError: 'STOP', createdById: 2 });

    await service.save(input({ eventType: 'STEP_ENTERED', steps: [], onError: 'CONTINUE' }), builder);
    await service.save(input({ eventType: 'STEP_COMPLETED' }), builder);
    expect(db.rows(AutomationChain).map(row => [row.ownerId, row.eventType, row.steps.length, row.onError])).toEqual([
      [10, 'STEP_ENTERED', 0, 'CONTINUE'],
      [10, 'STEP_COMPLETED', 1, 'STOP'],
    ]);
    expect((await service.find('WORKFLOW_STEP', 10)).map(row => row.eventType)).toEqual(['STEP_COMPLETED', 'STEP_ENTERED']);

    const entries = db.auditOf('WORKFLOW_STEP_CHAIN_UPDATED');
    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({
      userId: 2,
      details: { targetType: 'workflow_version', versionId: 1, stepId: 10, stepKey: 'montaz', eventType: 'STEP_ENTERED', before: null },
    });
    expect(entries[1].details.before).toEqual({ steps: [emailStep], onError: 'STOP' });
    expect(entries[1].details.after).toEqual({ steps: [], onError: 'CONTINUE' });
  });

  it('wymaga uprawnienia workflow.build (403)', async () => {
    const error = await service.save(input(), { id: 3, permissions: { notifications: { sendManual: true }, automation: { build: true } } }).catch(e => e);
    expect(error).toBeInstanceOf(AutomationError);
    expect(error).toMatchObject({ status: 403, code: 'ACTION_FORBIDDEN' });
    expect(db.rows(AutomationChain)).toHaveLength(0);
    await expect(service.save(input(), { id: 1, permissions: { all: true } })).resolves.toBeDefined();
  });

  it('nadal sprawdza uprawnienie do każdego klocka', async () => {
    await expect(service.save(input(), { id: 3, permissions: { workflow: { build: true } } }))
      .rejects.toMatchObject({ status: 403, code: 'ACTION_FORBIDDEN', message: 'Krok 1: nie masz uprawnień do klocka „Wyślij e-mail”.' });
  });

  it('łańcuch etapu wersji opublikowanej lub zastąpionej jest niezmienny (409)', async () => {
    await expect(service.save(input({ ownerId: 20 }), builder)).rejects.toMatchObject({ status: 409, code: 'CHAIN_IMMUTABLE' });
    await expect(service.save(input({ ownerId: 30 }), builder)).rejects.toMatchObject({ status: 409, code: 'CHAIN_IMMUTABLE' });
    expect(db.audit).toHaveLength(0);
  });

  it('nieistniejący etap = 404', async () => {
    await expect(service.save(input({ ownerId: 404 }), builder))
      .rejects.toMatchObject({ status: 404, code: 'OWNER_NOT_FOUND', message: 'Nie znaleziono etapu procesu.' });
  });

  it('zdarzenia etapu tylko dla etapów, zdarzenia formularza tylko dla formularzy (400)', async () => {
    await expect(service.save(input({ eventType: 'FORM_APPROVED' }), builder)).rejects.toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
    await expect(service.save(input({ ownerType: 'FORM_TEMPLATE_VERSION', ownerId: 5, eventType: 'STEP_ENTERED' }), builder))
      .rejects.toMatchObject({ status: 400, message: 'Nieobsługiwany typ zdarzenia.' });
    expect(service.parseOwner('WORKFLOW_STEP', '10', 'STEP_COMPLETED')).toEqual({ ownerType: 'WORKFLOW_STEP', ownerId: 10, eventType: 'STEP_COMPLETED' });
  });
});
