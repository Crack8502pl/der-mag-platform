// Klocek: wyślij e-mail (przez istniejącą kolejkę EmailQueueService).

import { IsNull } from 'typeorm';
import { AppDataSource } from '../../../config/database';
import { User } from '../../../entities/User';
import { TaskAssignment } from '../../../entities/TaskAssignment';
import EmailQueueService from '../../../services/EmailQueueService';
import { EmailTemplate } from '../../../types/EmailTypes';
import { activeMembers } from '../../function-groups/services/FunctionGroupService';
import type { AutomationAction, AutomationContext, AutomationParams } from '../contracts';

const RECIPIENT_TYPES = [
  { value: 'user', label: 'Wybrana osoba' },
  { value: 'role', label: 'Wszyscy z wybraną rolą' },
  { value: 'functionGroup', label: 'Wszyscy z wybraną funkcją' },
  { value: 'assignee', label: 'Osoba przypisana do zadania' },
];

async function resolveUsers(ctx: AutomationContext, params: AutomationParams): Promise<User[]> {
  const users = AppDataSource.getRepository(User);
  switch (params.recipientType) {
    case 'user': {
      const user = await users.findOne({ where: { id: Number(params.user), active: true, deletedAt: IsNull() } });
      return user ? [user] : [];
    }
    case 'role':
      return users.find({ where: { role: { id: Number(params.role) }, active: true, deletedAt: IsNull() } });
    case 'functionGroup':
      return activeMembers(String(params.functionGroup));
    case 'assignee': {
      if (ctx.taskId == null) return [];
      const assignments = await AppDataSource.getRepository(TaskAssignment).find({
        where: { taskId: ctx.taskId },
        relations: ['user'],
      });
      return assignments.map(assignment => assignment.user).filter(user => user && user.active && !user.deletedAt);
    }
    default:
      return [];
  }
}

export const sendEmailAction: AutomationAction = {
  key: 'send_email',
  label: 'Wyślij e-mail',
  description: 'Wysyła wiadomość e-mail do osoby, roli, funkcji lub osoby przypisanej do zadania.',
  category: 'Powiadomienia',
  params: [
    { key: 'recipientType', label: 'Do kogo', type: 'select', required: true, options: RECIPIENT_TYPES },
    { key: 'user', label: 'Osoba', type: 'user', required: false },
    { key: 'role', label: 'Rola', type: 'role', required: false },
    { key: 'functionGroup', label: 'Funkcja', type: 'functionGroup', required: false },
    { key: 'subject', label: 'Temat', type: 'text', required: true },
    { key: 'body', label: 'Treść', type: 'longText', required: true },
  ],
  requiredPermission: { module: 'notifications', action: 'sendManual' },
  supportsDryRun: true,
  validate(params) {
    const field = ({ user: 'user', role: 'role', functionGroup: 'functionGroup' } as Record<string, string>)[String(params.recipientType)];
    if (!field || params[field] !== undefined) return [];
    const label = ({ user: 'Osoba', role: 'Rola', functionGroup: 'Funkcja' } as Record<string, string>)[field];
    return [`Wybierz pole „${label}”, do którego ma trafić wiadomość.`];
  },
  async run(ctx, params, { dryRun }) {
    const users = await resolveUsers(ctx, params);
    const recipients = [...new Set(users.map(user => user.email).filter((email): email is string => !!email))];
    const output = { recipients, subject: String(params.subject) };
    if (!recipients.length) {
      return { status: 'SKIPPED', message: 'Brak odbiorców z adresem e-mail – wiadomość nie została wysłana.', output };
    }
    if (dryRun) {
      return { status: 'OK', message: `Tryb testowy: wiadomość zostałaby wysłana do ${recipients.length} odbiorców.`, output };
    }
    if (!EmailQueueService.isReady()) {
      return { status: 'SKIPPED', message: 'Kolejka e-mail jest wyłączona (brak konfiguracji SMTP) – wiadomość nie została wysłana.', output };
    }
    await EmailQueueService.addToQueue({
      to: recipients,
      subject: String(params.subject),
      template: EmailTemplate.AUTOMATION_MESSAGE,
      context: { subject: String(params.subject), message: String(params.body) },
      automation: { automated: true },
    });
    return { status: 'OK', message: `Wiadomość przekazano do kolejki wysyłki (odbiorców: ${recipients.length}).`, output };
  },
};
