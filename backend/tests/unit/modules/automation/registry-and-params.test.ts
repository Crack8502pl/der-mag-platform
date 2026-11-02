import { createDefaultRegistry } from '../../../../src/modules/automation/actions';
import { AutomationRegistry } from '../../../../src/modules/automation/registry/AutomationRegistry';
import { validateActionParams } from '../../../../src/modules/automation/paramValidation';
import { findUnknownVariables } from '../../../../src/modules/automation/variables';
import { maskSensitive, MASK } from '../../../../src/modules/automation/masking';
import { fakeAction, ok } from './helpers';

jest.mock('../../../../src/config/database', () => ({ AppDataSource: { getRepository: jest.fn(), manager: {} } }));
jest.mock('../../../../src/services/EmailQueueService', () => ({ __esModule: true, default: { addToQueue: jest.fn(), isReady: jest.fn() } }));
jest.mock('../../../../src/services/SlackWebhookService', () => ({ __esModule: true, default: { sendToChannel: jest.fn() } }));

describe('AutomationRegistry', () => {
  it('rejestruje klocki startowe z polskimi opisami i uprawnieniem', async () => {
    const registry = createDefaultRegistry();
    expect(registry.list().map(action => action.key)).toEqual([
      'send_email', 'notify_slack', 'generate_form_pdf', 'create_task', 'change_task_status', 'reserve_bom_materials',
    ]);
    for (const action of registry.list()) {
      expect(action.label).toMatch(/\S/);
      expect(action.description).toMatch(/\S/);
      expect(action.category).toMatch(/\S/);
      expect(action.supportsDryRun).toBe(true);
      expect(action.requiredPermission.module).toMatch(/\S/);
    }
    const catalog = await registry.describe();
    expect(catalog.find(action => action.key === 'send_email')!.params.map(param => param.key))
      .toEqual(['recipientType', 'user', 'role', 'functionGroup', 'subject', 'body']);
    expect(JSON.stringify(catalog)).not.toContain('"run"');
  });

  it('odrzuca podwójną rejestrację tego samego klucza', () => {
    const registry = new AutomationRegistry().register(fakeAction('a', async () => ok()));
    expect(() => registry.register(fakeAction('a', async () => ok()))).toThrow(/już zarejestrowany/);
    expect(registry.get('a')).toBeDefined();
    expect(registry.get('b')).toBeUndefined();
  });
});

describe('validateActionParams', () => {
  const registry = createDefaultRegistry();
  const sendEmail = registry.get('send_email')!;
  const createTask = registry.get('create_task')!;

  it('zgłasza brak wymaganych pól', () => {
    const errors = validateActionParams(sendEmail, { recipientType: 'assignee' });
    expect(errors).toEqual(expect.arrayContaining(['Pole „Temat” jest wymagane.', 'Pole „Treść” jest wymagane.']));
  });

  it('zgłasza zły typ wartości', () => {
    const errors = validateActionParams(createTask, { taskType: 'abc', title: 123, dueDays: 'dwa' });
    expect(errors).toEqual(expect.arrayContaining([
      'Pole „Typ zadania” wymaga wyboru pozycji z listy.',
      'Pole „Tytuł” musi być tekstem.',
      'Pole „Termin (liczba dni od dziś)” musi być liczbą.',
    ]));
  });

  it('zgłasza nieznaną zmienną i nieznany parametr', () => {
    const errors = validateActionParams(sendEmail, {
      recipientType: 'assignee', subject: 'Zadanie {task.number}', body: 'Wartość {task.nieistnieje}', obcy: 1,
    });
    expect(errors).toContain('Pole „Treść” zawiera nieznaną zmienną {task.nieistnieje}.');
    expect(errors).toContain('Nieznany parametr „obcy”.');
    expect(errors.some(error => error.includes('{task.number}'))).toBe(false);
  });

  it('wymaga pola zależnego od wybranego odbiorcy', () => {
    expect(validateActionParams(sendEmail, { recipientType: 'role', subject: 'T', body: 'B' }))
      .toEqual(['Wybierz pole „Rola”, do którego ma trafić wiadomość.']);
    expect(validateActionParams(sendEmail, { recipientType: 'role', role: 4, subject: 'T', body: '{task.number}' })).toEqual([]);
  });

  it('akceptuje wartość spoza listy tylko gdy należy do options', () => {
    const status = registry.get('change_task_status')!;
    expect(validateActionParams(status, { status: 'completed' })).toEqual([]);
    expect(validateActionParams(status, { status: 'kosmos' })).toEqual(['Pole „Nowy status”: wybrana wartość nie jest dostępna na liście.']);
  });

  it('rozpoznaje tylko zmienne ze źródeł danych systemu', () => {
    expect(findUnknownVariables('{task.number} i {contract.number} i {user.email} i {x.y} {nawias}')).toEqual(['x.y']);
  });
});

describe('maskSensitive', () => {
  it('maskuje hasła i tokeny w kluczach oraz w tekście', () => {
    const masked = maskSensitive({
      password: 'tajne', nested: { apiToken: 'abc', list: [{ secret: 'x' }] },
      body: 'Authorization: ****** oraz ******', ok: 'zwykły tekst', n: 5,
    });
    expect(masked.password).toBe(MASK);
    expect(masked.nested.apiToken).toBe(MASK);
    expect(masked.nested.list[0].secret).toBe(MASK);
    expect(masked.body).not.toContain('abcdefghijkl123');
    expect(masked.body).not.toContain('tajne123');
    expect(masked.ok).toBe('zwykły tekst');
    expect(masked.n).toBe(5);
  });
});
