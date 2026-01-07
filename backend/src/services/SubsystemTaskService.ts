// src/services/SubsystemTaskService.ts
// Serwis zarządzania zadaniami podsystemów z workflow tracking

import { AppDataSource } from '../config/database';
import { SubsystemTask, TaskWorkflowStatus } from '../entities/SubsystemTask';
import { Subsystem } from '../entities/Subsystem';

export class SubsystemTaskService {
  private taskRepository = AppDataSource.getRepository(SubsystemTask);
  private subsystemRepository = AppDataSource.getRepository(Subsystem);

  /**
   * Generuje numer zadania w formacie {SubsystemNumber}-{SeqNo}
   * Przykład: P000010726-001, P000010726-002
   */
  async generateTaskNumber(subsystemNumber: string): Promise<string> {
    // Znajdź ostatni task dla tego podsystemu
    const lastTask = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.taskNumber LIKE :pattern', { pattern: `${subsystemNumber}-%` })
      .orderBy('task.taskNumber', 'DESC')
      .limit(1)
      .getOne();

    let nextSeq = 1;
    if (lastTask && lastTask.taskNumber) {
      // Wyciągnij sekwencję: P000010726-001 -> 001
      const match = lastTask.taskNumber.match(/-(\d{3})$/);
      if (match) {
        const currentSeq = parseInt(match[1], 10);
        nextSeq = currentSeq + 1;
      }
    }

    if (nextSeq > 999) {
      throw new Error(`Maksymalna liczba zadań (999) dla podsystemu ${subsystemNumber}`);
    }

    const paddedSeq = nextSeq.toString().padStart(3, '0');
    return `${subsystemNumber}-${paddedSeq}`;
  }

  /**
   * Utworzenie zadania
   */
  async createTask(data: {
    subsystemId: number;
    taskName: string;
    taskType: string;
    metadata?: Record<string, any>;
  }): Promise<SubsystemTask> {
    // Pobierz numer podsystemu
    const subsystem = await this.subsystemRepository.findOne({
      where: { id: data.subsystemId }
    });

    if (!subsystem) {
      throw new Error('Podsystem nie znaleziony');
    }

    // Wygeneruj numer zadania
    const taskNumber = await this.generateTaskNumber(subsystem.subsystemNumber);

    // Utwórz zadanie
    const task = this.taskRepository.create({
      subsystemId: data.subsystemId,
      taskNumber,
      taskName: data.taskName,
      taskType: data.taskType,
      status: TaskWorkflowStatus.CREATED,
      metadata: data.metadata || {},
      bomGenerated: false,
      bomId: null,
      completionOrderId: null,
      completionStartedAt: null,
      completionCompletedAt: null,
      prefabricationTaskId: null,
      prefabricationStartedAt: null,
      prefabricationCompletedAt: null,
      deploymentScheduledAt: null,
      deploymentCompletedAt: null,
      verificationCompletedAt: null
    });

    return await this.taskRepository.save(task);
  }

  /**
   * Aktualizacja statusu zadania
   */
  async updateStatus(
    taskId: number,
    status: TaskWorkflowStatus,
    additionalData?: Partial<SubsystemTask>
  ): Promise<SubsystemTask> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });

    if (!task) {
      throw new Error('Zadanie nie znalezione');
    }

    task.status = status;
    Object.assign(task, additionalData);

    return await this.taskRepository.save(task);
  }

  /**
   * Aktualizacja statusu wszystkich zadań dla podsystemu
   */
  async updateStatusForSubsystem(
    subsystemId: number,
    status: TaskWorkflowStatus,
    additionalData?: Partial<SubsystemTask>
  ): Promise<void> {
    const tasks = await this.taskRepository.find({
      where: { subsystemId }
    });

    for (const task of tasks) {
      task.status = status;
      if (additionalData) {
        Object.assign(task, additionalData);
      }
      await this.taskRepository.save(task);
    }
  }

  /**
   * Pobranie zadań dla podsystemu
   */
  async getTasksBySubsystem(subsystemId: number): Promise<SubsystemTask[]> {
    return await this.taskRepository.find({
      where: { subsystemId },
      order: { taskNumber: 'ASC' },
      relations: ['bom', 'completionOrder', 'prefabricationTask']
    });
  }

  /**
   * Pobranie zadania po numerze
   */
  async getTaskByNumber(taskNumber: string): Promise<SubsystemTask | null> {
    return await this.taskRepository.findOne({
      where: { taskNumber },
      relations: ['subsystem', 'bom', 'completionOrder', 'prefabricationTask']
    });
  }

  /**
   * Pobranie zadania po ID
   */
  async getTaskById(taskId: number): Promise<SubsystemTask | null> {
    return await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['subsystem', 'bom', 'completionOrder', 'prefabricationTask']
    });
  }
}

export default new SubsystemTaskService();
