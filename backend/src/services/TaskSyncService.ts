// src/services/TaskSyncService.ts
// Serwis synchronizacji statusów między tabelami tasks i subsystem_tasks

import { AppDataSource } from '../config/database';
import { Task } from '../entities/Task';
import { SubsystemTask, TaskWorkflowStatus } from '../entities/SubsystemTask';
import { serverLogger } from '../utils/logger';

// Mapowanie statusów Task -> SubsystemTask
const STATUS_MAP_TO_SUBSYSTEM: Record<string, TaskWorkflowStatus> = {
  'created': TaskWorkflowStatus.CREATED,
  'assigned': TaskWorkflowStatus.CREATED,
  'in_progress': TaskWorkflowStatus.CREATED,
  'configured': TaskWorkflowStatus.BOM_GENERATED,
  'ready_for_completion': TaskWorkflowStatus.COMPLETION_ASSIGNED,
  'completed': TaskWorkflowStatus.COMPLETION_COMPLETED,
  'cancelled': TaskWorkflowStatus.CREATED
};

// Mapowanie statusów SubsystemTask -> Task
const STATUS_MAP_TO_TASK: Record<TaskWorkflowStatus, string> = {
  [TaskWorkflowStatus.CREATED]: 'created',
  [TaskWorkflowStatus.BOM_GENERATED]: 'configured',
  [TaskWorkflowStatus.COMPLETION_ASSIGNED]: 'ready_for_completion',
  [TaskWorkflowStatus.COMPLETION_IN_PROGRESS]: 'ready_for_completion',
  [TaskWorkflowStatus.COMPLETION_COMPLETED]: 'completed',
  [TaskWorkflowStatus.PREFABRICATION_ASSIGNED]: 'completed',
  [TaskWorkflowStatus.PREFABRICATION_IN_PROGRESS]: 'completed',
  [TaskWorkflowStatus.PREFABRICATION_COMPLETED]: 'completed',
  [TaskWorkflowStatus.READY_FOR_DEPLOYMENT]: 'completed',
  [TaskWorkflowStatus.DEPLOYED]: 'completed',
  [TaskWorkflowStatus.VERIFIED]: 'completed',
  [TaskWorkflowStatus.CANCELLED]: 'cancelled'
};

export class TaskSyncService {
  /**
   * Synchronizuje status z tabeli tasks do subsystem_tasks
   */
  static async syncFromTask(taskNumber: string, newStatus: string): Promise<void> {
    try {
      const subsystemTaskRepo = AppDataSource.getRepository(SubsystemTask);

      const subsystemTask = await subsystemTaskRepo.findOne({
        where: { taskNumber }
      });

      if (!subsystemTask) {
        // Brak odpowiadającego rekordu w subsystem_tasks - OK, nie wszystkie zadania mają
        return;
      }

      const mappedStatus = STATUS_MAP_TO_SUBSYSTEM[newStatus];
      if (mappedStatus && subsystemTask.status !== mappedStatus) {
        subsystemTask.status = mappedStatus;
        await subsystemTaskRepo.save(subsystemTask);
        serverLogger.info(`TaskSyncService: Zsynchronizowano status subsystem_task ${taskNumber} na ${mappedStatus}`);
      }
    } catch (error) {
      serverLogger.error(`TaskSyncService: Błąd synchronizacji z tasks do subsystem_tasks dla ${taskNumber}:`, error);
      // Nie rzucamy błędu - synchronizacja jest "best effort"
    }
  }

  /**
   * Synchronizuje status z tabeli subsystem_tasks do tasks
   */
  static async syncFromSubsystemTask(taskNumber: string, newStatus: TaskWorkflowStatus): Promise<void> {
    try {
      const taskRepo = AppDataSource.getRepository(Task);

      const task = await taskRepo.findOne({
        where: { taskNumber, deletedAt: null as any }
      });

      if (!task) {
        // Brak odpowiadającego rekordu w tasks - OK
        return;
      }

      const mappedStatus = STATUS_MAP_TO_TASK[newStatus];
      if (mappedStatus && task.status !== mappedStatus) {
        task.status = mappedStatus;

        // Aktualizuj daty w zależności od statusu
        if (mappedStatus === 'completed' && !task.actualEndDate) {
          task.actualEndDate = new Date();
        }

        await taskRepo.save(task);
        serverLogger.info(`TaskSyncService: Zsynchronizowano status task ${taskNumber} na ${mappedStatus}`);
      }
    } catch (error) {
      serverLogger.error(`TaskSyncService: Błąd synchronizacji z subsystem_tasks do tasks dla ${taskNumber}:`, error);
      // Nie rzucamy błędu - synchronizacja jest "best effort"
    }
  }

  /**
   * Synchronizuje bomId z subsystem_tasks do tasks.metadata
   */
  static async syncBomId(taskNumber: string, bomId: number | null): Promise<void> {
    try {
      const taskRepo = AppDataSource.getRepository(Task);

      const task = await taskRepo.findOne({
        where: { taskNumber, deletedAt: null as any }
      });

      if (!task) return;

      task.metadata = {
        ...task.metadata,
        bomId,
        bomGenerated: bomId !== null
      };

      await taskRepo.save(task);
      serverLogger.info(`TaskSyncService: Zsynchronizowano bomId ${bomId} dla task ${taskNumber}`);
    } catch (error) {
      serverLogger.error(`TaskSyncService: Błąd synchronizacji bomId dla ${taskNumber}:`, error);
    }
  }
}

export default TaskSyncService;
