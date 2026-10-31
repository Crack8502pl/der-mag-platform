import { EntityManager } from 'typeorm';
import { Contract } from '../entities/Contract';
import { Task } from '../entities/Task';
import { User } from '../entities/User';
import type { IContractDataService, ContractData } from '../modules/variable-engine/providers/contract/IContractDataService';
import type { ITaskDataService, TaskData } from '../modules/variable-engine/providers/task/ITaskDataService';
import type { IUserDataService, UserData } from '../modules/variable-engine/providers/user/IUserDataService';

export class FormVariableDataServices implements ITaskDataService, IContractDataService, IUserDataService {
  private readonly tasks = new Map<number, Promise<Task | undefined>>();

  constructor(private readonly manager: EntityManager) {}

  async getTaskData(entityId: number, entityType: string): Promise<TaskData | undefined> {
    if (entityType !== 'task') return undefined;
    const task = await this.getTask(entityId);
    if (!task) return undefined;

    const assignee = task.assignments?.[0]?.user;
    const progressMetric = task.metrics?.find(metric => metric.metricType.toLowerCase() === 'progress');
    const metricProgress = Number(progressMetric?.metricValue);
    return {
      number: task.taskNumber,
      status: task.status,
      title: task.title,
      priority: String(task.priority),
      assigneeName: assignee ? `${assignee.firstName} ${assignee.lastName}`.trim() : '',
      dueDate: task.plannedEndDate ? new Date(task.plannedEndDate).toISOString() : '',
      progress: Number.isFinite(metricProgress) ? metricProgress : task.completedAt ? 100 : 0,
      location: task.location || '',
      typeName: task.taskType?.name || '',
      contractNumber: task.contract?.contractNumber || task.contractNumber || '',
      subsystemName: task.subsystem?.systemType || '',
      brigadeName: task.brigade?.name || '',
    };
  }

  async getContractData(entityId: number, entityType: string): Promise<ContractData | undefined> {
    const contract = entityType === 'task'
      ? (await this.getTask(entityId))?.contract
      : entityType === 'contract'
        ? await this.manager.getRepository(Contract).findOne({ where: { id: entityId } })
        : undefined;
    if (!contract) return undefined;
    const task = entityType === 'task' ? await this.getTask(entityId) : undefined;
    const specifications = contract.technicalSpecs || {};
    const customerName = task?.client ?? specifications.customer_name ?? specifications.customerName;
    const customerNip = specifications.customer_nip ?? specifications.customerNip;
    return {
      number: contract.contractNumber,
      status: contract.status,
      customerName: typeof customerName === 'string' ? customerName : undefined,
      customerNip: typeof customerNip === 'string' ? customerNip : undefined,
      dateStart: contract.orderDate ? contract.orderDate.toISOString().slice(0, 10) : undefined,
    };
  }

  async getUserData(entityId: number, entityType: string): Promise<UserData | undefined> {
    const user = entityType === 'task'
      ? (await this.getTask(entityId))?.assignments?.[0]?.user
      : entityType === 'user'
        ? await this.manager.getRepository(User).findOne({ where: { id: entityId }, relations: ['role'] })
        : undefined;
    if (!user) return undefined;
    return {
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      role: user.role?.name || '',
    };
  }

  private getTask(entityId: number): Promise<Task | undefined> {
    let task = this.tasks.get(entityId);
    if (!task) {
      task = this.manager.getRepository(Task).findOne({
        where: { id: entityId },
        relations: [
          'taskType', 'contract', 'subsystem', 'brigade',
          'assignments', 'assignments.user', 'assignments.user.role', 'metrics',
        ],
        order: {
          assignments: { assignedAt: 'ASC', id: 'ASC' },
          metrics: { recordedAt: 'DESC' },
        },
      }).then(value => value ?? undefined);
      this.tasks.set(entityId, task);
    }
    return task;
  }
}
