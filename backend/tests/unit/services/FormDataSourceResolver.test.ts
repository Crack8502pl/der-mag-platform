import { FormDataSourceResolver } from '../../../src/services/FormDataSourceResolver';
import { Contract } from '../../../src/entities/Contract';
import { User } from '../../../src/entities/User';

const task = {
  id: 8,
  taskNumber: 'TSK-0008',
  status: 'in_progress',
  title: 'Montaż kamery',
  priority: 2,
  plannedEndDate: new Date('2026-10-15T00:00:00.000Z'),
  completedAt: null,
  location: 'Warszawa',
  client: 'PKP S.A.',
  taskType: { name: 'Montaż' },
  contract: { contractNumber: 'C-2026-01', status: 'ACTIVE', technicalSpecs: {} },
  subsystem: { systemType: 'CCTV' },
  brigade: { name: 'Brygada A' },
  assignments: [{
    user: {
      firstName: 'Jan',
      lastName: 'Kowalski',
      email: 'jan@example.test',
      role: { name: 'Technik' },
    },
  }],
  metrics: [{ metricType: 'progress', metricValue: '65.5' }],
};

function resolverFor(
  taskRecord: unknown,
  contractRecord: unknown = { id: 12, contractNumber: 'C-12', status: 'ACTIVE', technicalSpecs: {}, orderDate: null },
  userRecord: unknown = { id: 4, firstName: 'Anna', lastName: 'Nowak', email: 'anna@example.test', role: { name: 'Koordynator' } },
) {
  const taskRepository = { findOne: jest.fn().mockResolvedValue(taskRecord) };
  const contractRepository = { findOne: jest.fn().mockResolvedValue(contractRecord) };
  const userRepository = { findOne: jest.fn().mockResolvedValue(userRecord) };
  const manager = {
    getRepository: jest.fn((entity: unknown) =>
      entity === Contract ? contractRepository : entity === User ? userRepository : taskRepository),
  };
  return {
    resolver: new FormDataSourceResolver(manager as any),
    taskRepository,
    contractRepository,
    userRepository,
  };
}

describe('FormDataSourceResolver', () => {
  it('resolves supported task variables through the Variable Engine with typed values', async () => {
    const { resolver, taskRepository } = resolverFor(task);
    await expect(resolver.resolve('task.location', { taskId: 8 })).resolves.toBe('Warszawa');
    await expect(resolver.resolve('task.progress', { taskId: 8 })).resolves.toBe(65.5);
    await expect(resolver.resolve('task.subsystem.name', { taskId: 8 })).resolves.toBe('CCTV');
    await expect(resolver.resolve('contract.number', { taskId: 8 })).resolves.toBe('C-2026-01');
    await expect(resolver.resolve('contract.customer.name', { taskId: 8 })).resolves.toBe('PKP S.A.');
    await expect(resolver.resolve('user.name', { taskId: 8 })).resolves.toBe('Jan Kowalski');
    expect(taskRepository.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 8 },
      relations: expect.arrayContaining(['taskType', 'contract', 'subsystem', 'brigade']),
    }));
  });

  it('resolves contract and user sources from their own linked IDs when no task is present', async () => {
    const { resolver, contractRepository, userRepository } = resolverFor(null);
    await expect(resolver.resolve('contract.number', { contractId: 12 })).resolves.toBe('C-12');
    await expect(resolver.resolve('user.name', { userId: 4 })).resolves.toBe('Anna Nowak');
    expect(contractRepository.findOne).toHaveBeenCalledWith({ where: { id: 12 } });
    expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 4 }, relations: ['role'] });
  });

  it('returns null for unavailable and non-form sources without inventing a value', async () => {
    const missing = resolverFor(null);
    await expect(missing.resolver.resolve('task.location', { taskId: 8 })).resolves.toBeNull();
    const unsupported = resolverFor(task);
    await expect(unsupported.resolver.resolve('contract.customer.nip', { taskId: 8 })).resolves.toBeNull();
    expect(unsupported.taskRepository.findOne).not.toHaveBeenCalled();
  });
});
