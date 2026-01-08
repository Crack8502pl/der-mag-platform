// src/services/ServiceTaskService.ts
// Service for managing service tasks

import { AppDataSource } from '../config/database';
import { ServiceTask, ServiceTaskStatus, ServiceTaskVariant } from '../entities/ServiceTask';
import { ServiceTaskActivity } from '../entities/ServiceTaskActivity';
import { Brigade } from '../entities/Brigade';
import { Contract } from '../entities/Contract';
import { Subsystem } from '../entities/Subsystem';
import { IsNull } from 'typeorm';

export class ServiceTaskService {
  private taskRepository = AppDataSource.getRepository(ServiceTask);
  private activityRepository = AppDataSource.getRepository(ServiceTaskActivity);

  /**
   * Generate unique task number in format SRV-XXXXXX
   */
  async generateTaskNumber(): Promise<string> {
    const lastTask = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.taskNumber LIKE :pattern', { pattern: 'SRV-%' })
      .orderBy('task.taskNumber', 'DESC')
      .limit(1)
      .getOne();

    let nextNum = 1;
    if (lastTask && lastTask.taskNumber) {
      const match = lastTask.taskNumber.match(/SRV-(\d{6})$/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    const paddedNum = nextNum.toString().padStart(6, '0');
    return `SRV-${paddedNum}`;
  }

  /**
   * Create a new service task
   */
  async createTask(data: {
    title: string;
    description?: string;
    variant: ServiceTaskVariant;
    contractId?: number;
    subsystemId?: number;
    brigadeId?: number;
    plannedStartDate?: Date;
    plannedEndDate?: Date;
    priority?: number;
    metadata?: Record<string, any>;
    createdById: number;
  }): Promise<ServiceTask> {
    const taskNumber = await this.generateTaskNumber();

    const task = this.taskRepository.create({
      taskNumber,
      title: data.title,
      description: data.description,
      variant: data.variant,
      status: ServiceTaskStatus.CREATED,
      contractId: data.contractId,
      subsystemId: data.subsystemId,
      brigadeId: data.brigadeId,
      plannedStartDate: data.plannedStartDate,
      plannedEndDate: data.plannedEndDate,
      priority: data.priority || 0,
      metadata: data.metadata || {},
      createdById: data.createdById,
    });

    return await this.taskRepository.save(task);
  }

  /**
   * Get service task by ID
   */
  async getTaskById(id: number): Promise<ServiceTask | null> {
    return await this.taskRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['contract', 'subsystem', 'brigade', 'createdBy'],
    });
  }

  /**
   * Get service task by task number
   */
  async getTaskByNumber(taskNumber: string): Promise<ServiceTask | null> {
    return await this.taskRepository.findOne({
      where: { taskNumber, deletedAt: IsNull() },
      relations: ['contract', 'subsystem', 'brigade', 'createdBy'],
    });
  }

  /**
   * Get all service tasks with filters
   */
  async getTasks(filters?: {
    status?: ServiceTaskStatus;
    variant?: ServiceTaskVariant;
    contractId?: number;
    subsystemId?: number;
    brigadeId?: number;
    createdById?: number;
    page?: number;
    limit?: number;
  }): Promise<{ tasks: ServiceTask[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.contract', 'contract')
      .leftJoinAndSelect('task.subsystem', 'subsystem')
      .leftJoinAndSelect('task.brigade', 'brigade')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .where('task.deletedAt IS NULL');

    if (filters?.status) {
      queryBuilder.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters?.variant) {
      queryBuilder.andWhere('task.variant = :variant', { variant: filters.variant });
    }

    if (filters?.contractId) {
      queryBuilder.andWhere('task.contractId = :contractId', { contractId: filters.contractId });
    }

    if (filters?.subsystemId) {
      queryBuilder.andWhere('task.subsystemId = :subsystemId', { subsystemId: filters.subsystemId });
    }

    if (filters?.brigadeId) {
      queryBuilder.andWhere('task.brigadeId = :brigadeId', { brigadeId: filters.brigadeId });
    }

    if (filters?.createdById) {
      queryBuilder.andWhere('task.createdById = :createdById', { createdById: filters.createdById });
    }

    queryBuilder
      .orderBy('task.priority', 'DESC')
      .addOrderBy('task.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [tasks, total] = await queryBuilder.getManyAndCount();

    return { tasks, total };
  }

  /**
   * Update service task
   */
  async updateTask(
    id: number,
    data: Partial<ServiceTask>
  ): Promise<ServiceTask | null> {
    const task = await this.getTaskById(id);
    if (!task) {
      throw new Error('Zadanie nie znalezione');
    }

    const oldPriority = task.priority;

    Object.assign(task, data);
    const updatedTask = await this.taskRepository.save(task);

    // NOWE: Jeśli zmienił się priorytet - powiadom brygadę
    if (data.priority !== undefined && data.priority !== oldPriority && task.brigadeId) {
      const BrigadeNotificationService = (await import('./BrigadeNotificationService')).default;
      // Use a dummy performedById - ideally this should be passed as parameter
      await BrigadeNotificationService.notifyPriorityChanged(id, oldPriority, data.priority, task.createdById);
    }

    return updatedTask;
  }

  /**
   * Update task status
   */
  async updateStatus(
    id: number,
    status: ServiceTaskStatus,
    performedById: number
  ): Promise<ServiceTask> {
    const task = await this.getTaskById(id);
    if (!task) {
      throw new Error('Zadanie nie znalezione');
    }

    const oldStatus = task.status;
    task.status = status;

    // Update timestamps based on status
    if (status === ServiceTaskStatus.IN_PROGRESS && !task.actualStartDate) {
      task.actualStartDate = new Date();
    } else if (status === ServiceTaskStatus.COMPLETED && !task.actualEndDate) {
      task.actualEndDate = new Date();
    }

    await this.taskRepository.save(task);

    // Log status change
    await this.addActivity(id, {
      description: `Status zmieniony z ${oldStatus} na ${status}`,
      activityType: 'status_change',
      performedById,
      metadata: { oldStatus, newStatus: status },
    });

    return task;
  }

  /**
   * Assign brigade to task
   */
  async assignBrigade(
    taskId: number,
    brigadeId: number,
    performedById: number
  ): Promise<ServiceTask> {
    const task = await this.getTaskById(taskId);
    if (!task) {
      throw new Error('Zadanie nie znalezione');
    }

    const oldBrigadeId = task.brigadeId;
    task.brigadeId = brigadeId;
    task.status = ServiceTaskStatus.ASSIGNED;

    await this.taskRepository.save(task);

    // NOWE: Wysyłka powiadomień
    const BrigadeNotificationService = (await import('./BrigadeNotificationService')).default;
    
    if (oldBrigadeId && oldBrigadeId !== brigadeId) {
      // Zmiana brygady
      await BrigadeNotificationService.notifyBrigadeChanged(taskId, oldBrigadeId, brigadeId, performedById);
    } else if (!oldBrigadeId) {
      // Pierwsze przypisanie
      await BrigadeNotificationService.notifyTaskAssigned(brigadeId, taskId, performedById);
    }

    // Log brigade assignment
    await this.addActivity(taskId, {
      description: oldBrigadeId
        ? `Brygada zmieniona z ${oldBrigadeId} na ${brigadeId}`
        : `Przypisano brygadę ${brigadeId}`,
      activityType: 'brigade_assignment',
      performedById,
      metadata: { oldBrigadeId, newBrigadeId: brigadeId },
    });

    return task;
  }

  /**
   * Add activity to service task
   */
  async addActivity(
    taskId: number,
    data: {
      description: string;
      activityType: string;
      performedById: number;
      metadata?: Record<string, any>;
    }
  ): Promise<ServiceTaskActivity> {
    const activity = this.activityRepository.create({
      serviceTaskId: taskId,
      description: data.description,
      activityType: data.activityType,
      performedById: data.performedById,
      metadata: data.metadata || {},
    });

    return await this.activityRepository.save(activity);
  }

  /**
   * Get activities for a task
   */
  async getTaskActivities(taskId: number): Promise<ServiceTaskActivity[]> {
    return await this.activityRepository.find({
      where: { serviceTaskId: taskId },
      relations: ['performedBy'],
      order: { performedAt: 'DESC' },
    });
  }

  /**
   * Soft delete a task
   */
  async deleteTask(id: number): Promise<void> {
    const task = await this.getTaskById(id);
    if (!task) {
      throw new Error('Zadanie nie znalezione');
    }

    task.deletedAt = new Date();
    await this.taskRepository.save(task);
  }

  /**
   * Get tasks statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byVariant: Record<string, number>;
  }> {
    const tasks = await this.taskRepository.find({
      where: { deletedAt: IsNull() },
    });

    const byStatus: Record<string, number> = {};
    const byVariant: Record<string, number> = {};

    tasks.forEach((task) => {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      byVariant[task.variant] = (byVariant[task.variant] || 0) + 1;
    });

    return {
      total: tasks.length,
      byStatus,
      byVariant,
    };
  }
}

export default new ServiceTaskService();
