import { AppDataSource } from '../../../../src/config/database';
import { User } from '../../../../src/entities/User';
import { TaskAssignment } from '../../../../src/entities/TaskAssignment';
import { Task } from '../../../../src/entities/Task';
import { TaskType } from '../../../../src/entities/TaskType';
import { WebhookConfig } from '../../../../src/entities/WebhookConfig.entity';
import { FormInstance } from '../../../../src/entities/FormInstance';
import { TaskGeneratedBomItem } from '../../../../src/entities/TaskGeneratedBomItem';
import { WarehouseStock } from '../../../../src/entities/WarehouseStock';
import EmailQueueService from '../../../../src/services/EmailQueueService';
import EmailService from '../../../../src/services/EmailService';
import SlackWebhookService from '../../../../src/services/SlackWebhookService';
import { TaskService } from '../../../../src/services/TaskService';
import { DocumentService } from '../../../../src/services/DocumentService';
import { automationRegistry } from '../../../../src/modules/automation/actions';
import type { AutomationContext } from '../../../../src/modules/automation/contracts';

jest.mock('../../../../src/config/database', () => ({ AppDataSource: { getRepository: jest.fn(), manager: {} } }));
jest.mock('../../../../src/services/EmailQueueService', () => ({ __esModule: true, default: { addToQueue: jest.fn(), isReady: jest.fn() } }));
jest.mock('../../../../src/services/EmailService', () => ({ __esModule: true, default: { sendEmail: jest.fn() } }));
jest.mock('../../../../src/services/SlackWebhookService', () => ({ __esModule: true, default: { sendToChannel: jest.fn() } }));
jest.mock('../../../../src/services/TaskService', () => ({ TaskService: { createTask: jest.fn(), updateTaskStatus: jest.fn() } }));
jest.mock('../../../../src/services/DocumentService', () => ({ DocumentService: { createDocument: jest.fn() } }));
jest.mock('../../../../src/services/FormInstancePdfService', () => ({ FormInstancePdfService: jest.fn().mockImplementation(() => ({ generate: jest.fn(async () => Buffer.from('%PDF')) })) }));
const mockReserve = jest.fn();
jest.mock('../../../../src/services/WarehouseStockService', () => ({ WarehouseStockService: jest.fn().mockImplementation(() => ({ reserveStock: mockReserve })) }));
jest.mock('../../../../src/modules/function-groups/services/FunctionGroupService', () => ({ activeMembers: jest.fn(async () => []) }));
jest.mock('fs', () => ({ ...jest.requireActual('fs'), promises: { mkdir: jest.fn(), writeFile: jest.fn() } }));

const ctx: AutomationContext = {
  event: { id: 'e', type: 'FORM_APPROVED', occurredAt: new Date(), actorId: 7, subject: { type: 'FORM_INSTANCE', id: 100 }, payload: {}, causationDepth: 0 },
  taskId: 42, contractId: 3, instanceId: 100, actorId: 7, chainAuthorId: 11,
};

const repos = new Map<unknown, any>();
beforeEach(() => {
  jest.clearAllMocks();
  repos.clear();
  (AppDataSource.getRepository as jest.Mock).mockImplementation(entity => repos.get(entity));
});

const action = (key: string) => automationRegistry.get(key)!;

describe('send_email', () => {
  const params = { recipientType: 'assignee', subject: 'Temat', body: 'Treść' };
  beforeEach(() => {
    repos.set(TaskAssignment, { find: jest.fn(async () => [{ user: { email: 'a@example.test', active: true, deletedAt: null } }, { user: { email: 'a@example.test', active: true, deletedAt: null } }]) });
  });

  it('dryRun niczego nie wysyła (EmailService ani kolejka nie są wołane)', async () => {
    const result = await action('send_email').run(ctx, params, { dryRun: true });
    expect(result.status).toBe('OK');
    expect(result.output).toEqual({ recipients: ['a@example.test'], subject: 'Temat' });
    expect(EmailService.sendEmail).not.toHaveBeenCalled();
    expect(EmailQueueService.addToQueue).not.toHaveBeenCalled();
  });

  it('wysyła przez istniejącą kolejkę jednokrotnie do unikalnych odbiorców', async () => {
    (EmailQueueService.isReady as jest.Mock).mockReturnValue(true);
    const result = await action('send_email').run(ctx, params, { dryRun: false });
    expect(result.status).toBe('OK');
    expect(EmailQueueService.addToQueue).toHaveBeenCalledTimes(1);
    expect(EmailQueueService.addToQueue).toHaveBeenCalledWith(expect.objectContaining({
      to: ['a@example.test'], subject: 'Temat', context: { subject: 'Temat', message: 'Treść' }, automation: { automated: true },
    }));
  });

  it('pomija krok, gdy kolejka e-mail jest wyłączona lub brak odbiorców', async () => {
    (EmailQueueService.isReady as jest.Mock).mockReturnValue(false);
    expect((await action('send_email').run(ctx, params, { dryRun: false })).status).toBe('SKIPPED');
    repos.set(TaskAssignment, { find: jest.fn(async () => []) });
    expect((await action('send_email').run(ctx, params, { dryRun: false })).status).toBe('SKIPPED');
    expect(EmailQueueService.addToQueue).not.toHaveBeenCalled();
  });

  it('rozwiązuje odbiorcę wskazanego imiennie', async () => {
    repos.set(User, { findOne: jest.fn(async () => ({ email: 'jan@example.test' })) });
    const result = await action('send_email').run(ctx, { ...params, recipientType: 'user', user: 5 }, { dryRun: true });
    expect(result.output).toEqual({ recipients: ['jan@example.test'], subject: 'Temat' });
  });
});

describe('notify_slack', () => {
  it('dryRun nie wysyła, a nieaktywny kanał kończy się błędem', async () => {
    repos.set(WebhookConfig, { findOne: jest.fn(async () => ({ id: 2, channelName: '#serwis' })) });
    expect((await action('notify_slack').run(ctx, { channel: '2', message: 'x' }, { dryRun: true })).status).toBe('OK');
    expect(SlackWebhookService.sendToChannel).not.toHaveBeenCalled();

    repos.set(WebhookConfig, { findOne: jest.fn(async () => null) });
    expect((await action('notify_slack').run(ctx, { channel: '9', message: 'x' }, { dryRun: false })).status).toBe('FAILED');
  });

  it('wysyła treść przez SlackWebhookService', async () => {
    repos.set(WebhookConfig, { findOne: jest.fn(async () => ({ id: 2, channelName: '#serwis' })) });
    (SlackWebhookService.sendToChannel as jest.Mock).mockResolvedValue({ success: true });
    expect((await action('notify_slack').run(ctx, { channel: '2', message: 'Treść' }, { dryRun: false })).status).toBe('OK');
    expect(SlackWebhookService.sendToChannel).toHaveBeenCalledWith(2, 'Treść');
    (SlackWebhookService.sendToChannel as jest.Mock).mockResolvedValue({ success: false, error: 'HTTP 500' });
    expect((await action('notify_slack').run(ctx, { channel: '2', message: 'Treść' }, { dryRun: false })).status).toBe('FAILED');
  });
});

describe('generate_form_pdf', () => {
  beforeEach(() => repos.set(FormInstance, { findOne: jest.fn(async () => ({ id: 100, taskId: 42 })) }));

  it('dryRun nie zapisuje dokumentu', async () => {
    expect((await action('generate_form_pdf').run(ctx, {}, { dryRun: true })).status).toBe('OK');
    expect(DocumentService.createDocument).not.toHaveBeenCalled();
  });

  it('zapisuje PDF jako dokument zadania', async () => {
    (DocumentService.createDocument as jest.Mock).mockResolvedValue({ id: 8 });
    const result = await action('generate_form_pdf').run(ctx, { name: 'Protokół' }, { dryRun: false });
    expect(result).toMatchObject({ status: 'OK', output: { documentId: 8, name: 'Protokół' } });
    expect(DocumentService.createDocument).toHaveBeenCalledWith(expect.objectContaining({ taskId: 42, mimeType: 'application/pdf', createdById: 11 }));
  });

  it('pomija krok dla formularza bez zadania', async () => {
    repos.set(FormInstance, { findOne: jest.fn(async () => ({ id: 100, taskId: null })) });
    expect((await action('generate_form_pdf').run(ctx, {}, { dryRun: false })).status).toBe('SKIPPED');
  });
});

describe('create_task', () => {
  beforeEach(() => {
    repos.set(TaskType, { findOne: jest.fn(async () => ({ id: 3, name: 'Serwis' })) });
    repos.set(User, { findOne: jest.fn(async () => ({ id: 5 })) });
    repos.set(Task, { findOne: jest.fn(async () => ({ id: 42, contractId: 3 })), update: jest.fn() });
    const assignments = { create: jest.fn((v: object) => v), save: jest.fn() };
    repos.set(TaskAssignment, assignments);
  });

  it('dryRun niczego nie tworzy', async () => {
    const result = await action('create_task').run(ctx, { taskType: 3, title: 'Nowe', dueDays: 7 }, { dryRun: true });
    expect(result.status).toBe('OK');
    expect(TaskService.createTask).not.toHaveBeenCalled();
  });

  it('tworzy zadanie z terminem i przypisaniem', async () => {
    (TaskService.createTask as jest.Mock).mockResolvedValue({ id: 77, taskNumber: 'Z00000077' });
    const result = await action('create_task').run(ctx, { taskType: 3, title: 'Nowe', dueDays: 7, assignee: 5 }, { dryRun: false });
    expect(result).toMatchObject({ status: 'OK', output: { taskNumber: 'Z00000077' } });
    expect(TaskService.createTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nowe', taskTypeId: 3, contractId: 3, plannedEndDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }));
    expect(repos.get(TaskAssignment).save).toHaveBeenCalledWith(expect.objectContaining({ taskId: 77, userId: 5, assignedById: 11 }));
  });

  it('zgłasza błąd dla nieistniejącego typu zadania', async () => {
    repos.set(TaskType, { findOne: jest.fn(async () => null) });
    expect((await action('create_task').run(ctx, { taskType: 99, title: 'X' }, { dryRun: false })).status).toBe('FAILED');
  });
});

describe('change_task_status', () => {
  beforeEach(() => repos.set(Task, { findOne: jest.fn(async () => ({ id: 42, taskNumber: 'Z00000042', status: 'created' })) }));

  it('dryRun nie zmienia statusu', async () => {
    expect((await action('change_task_status').run(ctx, { status: 'completed' }, { dryRun: true })).status).toBe('OK');
    expect(TaskService.updateTaskStatus).not.toHaveBeenCalled();
  });

  it('zmienia status przez TaskService, a taki sam status pomija', async () => {
    expect((await action('change_task_status').run(ctx, { status: 'completed' }, { dryRun: false })).status).toBe('OK');
    expect(TaskService.updateTaskStatus).toHaveBeenCalledWith('Z00000042', 'completed', 11);
    expect((await action('change_task_status').run(ctx, { status: 'created' }, { dryRun: false })).status).toBe('SKIPPED');
  });
});

describe('reserve_bom_materials', () => {
  beforeEach(() => {
    repos.set(Task, { findOne: jest.fn(async () => ({ id: 42, taskBomId: 8 })) });
    repos.set(TaskGeneratedBomItem, { find: jest.fn(async () => [
      { itemName: 'Kamera', catalogNumber: 'K-1', quantity: 2 },
      { itemName: 'Kamera 2', catalogNumber: 'K-1', quantity: 1 },
      { itemName: 'Bez magazynu', catalogNumber: 'X', quantity: 1 },
    ]) });
  });

  it('rezerwuje przez WarehouseStockService.reserveStock sumując ilości; dryRun nie rezerwuje', async () => {
    repos.set(WarehouseStock, { find: jest.fn(async () => [{ id: 1, catalogNumber: 'K-1', quantityAvailable: 10 }]) });
    expect((await action('reserve_bom_materials').run(ctx, {}, { dryRun: true })).status).toBe('OK');
    expect(mockReserve).not.toHaveBeenCalled();

    const result = await action('reserve_bom_materials').run(ctx, {}, { dryRun: false });
    expect(result.status).toBe('OK');
    expect(mockReserve).toHaveBeenCalledTimes(1);
    expect(mockReserve).toHaveBeenCalledWith(1, 3, 11, 'TASK', 42);
  });

  it('nie rezerwuje nic, gdy brakuje towaru', async () => {
    repos.set(WarehouseStock, { find: jest.fn(async () => [{ id: 1, catalogNumber: 'K-1', quantityAvailable: 1 }]) });
    const result = await action('reserve_bom_materials').run(ctx, {}, { dryRun: false });
    expect(result.status).toBe('FAILED');
    expect(mockReserve).not.toHaveBeenCalled();
  });

  it('pomija zadanie bez BOM', async () => {
    repos.set(Task, { findOne: jest.fn(async () => ({ id: 42, taskBomId: null })) });
    expect((await action('reserve_bom_materials').run(ctx, {}, { dryRun: false })).status).toBe('SKIPPED');
  });
});
