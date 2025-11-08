// src/services/TaskService.ts
// Serwis logiki biznesowej zadań

import { AppDataSource } from '../config/database';
import { Task } from '../entities/Task';
import { TaskType } from '../entities/TaskType';
import { TaskMaterial } from '../entities/TaskMaterial';
import { BOMTemplate } from '../entities/BOMTemplate';
import { TaskActivity } from '../entities/TaskActivity';
import { ActivityTemplate } from '../entities/ActivityTemplate';
import { TaskNumberGenerator } from './TaskNumberGenerator';
import { CreateTaskDto } from '../dto/CreateTaskDto';

export class TaskService {
  /**
   * Tworzy nowe zadanie z automatyczną inicjalizacją BOM i aktywności
   */
  static async createTask(data: CreateTaskDto): Promise<Task> {
    const taskRepository = AppDataSource.getRepository(Task);
    const taskTypeRepository = AppDataSource.getRepository(TaskType);

    // Sprawdź czy typ zadania istnieje
    const taskType = await taskTypeRepository.findOne({
      where: { id: data.taskTypeId, active: true }
    });

    if (!taskType) {
      throw new Error('Nieznany typ zadania');
    }

    // Generuj unikalny numer zadania
    const taskNumber = await TaskNumberGenerator.generate();

    // Utwórz zadanie
    const task = taskRepository.create({
      ...data,
      taskNumber,
      status: 'created'
    });

    await taskRepository.save(task);

    // Inicjalizuj BOM z szablonów
    await this.initializeTaskBOM(task.id, data.taskTypeId);

    // Inicjalizuj aktywności z szablonów
    await this.initializeTaskActivities(task.id, data.taskTypeId);

    // Pobierz zadanie z relacjami
    return await taskRepository.findOne({
      where: { id: task.id },
      relations: ['taskType', 'materials', 'activities']
    }) as Task;
  }

  /**
   * Inicjalizuje BOM zadania na podstawie szablonów
   */
  private static async initializeTaskBOM(taskId: number, taskTypeId: number): Promise<void> {
    const bomTemplateRepository = AppDataSource.getRepository(BOMTemplate);
    const taskMaterialRepository = AppDataSource.getRepository(TaskMaterial);

    const templates = await bomTemplateRepository.find({
      where: { taskTypeId, active: true }
    });

    for (const template of templates) {
      const material = taskMaterialRepository.create({
        taskId,
        bomTemplateId: template.id,
        materialName: template.materialName,
        plannedQuantity: template.defaultQuantity,
        usedQuantity: 0,
        unit: template.unit,
        category: template.category
      });

      await taskMaterialRepository.save(material);
    }
  }

  /**
   * Inicjalizuje aktywności zadania na podstawie szablonów
   */
  private static async initializeTaskActivities(taskId: number, taskTypeId: number): Promise<void> {
    const activityTemplateRepository = AppDataSource.getRepository(ActivityTemplate);
    const taskActivityRepository = AppDataSource.getRepository(TaskActivity);

    const templates = await activityTemplateRepository.find({
      where: { taskTypeId, active: true },
      order: { sequence: 'ASC' }
    });

    for (const template of templates) {
      const activity = taskActivityRepository.create({
        taskId,
        activityTemplateId: template.id,
        name: template.name,
        description: template.description,
        sequence: template.sequence,
        requiresPhoto: template.requiresPhoto,
        isCompleted: false
      });

      await taskActivityRepository.save(activity);
    }
  }

  /**
   * Aktualizuje status zadania
   */
  static async updateTaskStatus(taskNumber: string, status: string, userId: number): Promise<Task> {
    const taskRepository = AppDataSource.getRepository(Task);

    const task = await taskRepository.findOne({
      where: { taskNumber }
    });

    if (!task) {
      throw new Error('Zadanie nie znalezione');
    }

    task.status = status;

    // Ustawia daty w zależności od statusu
    if (status === 'started' && !task.actualStartDate) {
      task.actualStartDate = new Date();
    } else if (status === 'completed' && !task.actualEndDate) {
      task.actualEndDate = new Date();
    }

    await taskRepository.save(task);

    return task;
  }
}
