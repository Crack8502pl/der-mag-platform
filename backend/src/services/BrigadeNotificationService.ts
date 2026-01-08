// src/services/BrigadeNotificationService.ts
// Service for brigade-related notifications

import { AppDataSource } from '../config/database';
import { Brigade } from '../entities/Brigade';
import { BrigadeMember } from '../entities/BrigadeMember';
import { ServiceTask } from '../entities/ServiceTask';
import { User } from '../entities/User';
import EmailQueueService from './EmailQueueService';
import { EmailTemplate } from '../types/EmailTypes';

export class BrigadeNotificationService {
  private brigadeRepository = AppDataSource.getRepository(Brigade);
  private memberRepository = AppDataSource.getRepository(BrigadeMember);
  private taskRepository = AppDataSource.getRepository(ServiceTask);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Get brigade members with their email addresses
   */
  private async getMembersWithEmails(brigadeId: number): Promise<BrigadeMember[]> {
    return await this.memberRepository.find({
      where: { brigadeId, active: true },
      relations: ['user', 'brigade'],
    });
  }

  /**
   * Get task details with all relations
   */
  private async getTaskDetails(taskId: number): Promise<ServiceTask> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['contract', 'subsystem', 'brigade'],
    });

    if (!task) {
      throw new Error('Zadanie nie znalezione');
    }

    return task;
  }

  /**
   * Get task with brigade relation
   */
  private async getTaskWithBrigade(taskId: number): Promise<ServiceTask> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['brigade'],
    });

    if (!task) {
      throw new Error('Zadanie nie znalezione');
    }

    return task;
  }

  /**
   * Get user by ID
   */
  private async getUserById(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Użytkownik nie znaleziony');
    }

    return user;
  }

  /**
   * Get brigade by ID
   */
  private async getBrigadeById(brigadeId: number): Promise<Brigade> {
    const brigade = await this.brigadeRepository.findOne({
      where: { id: brigadeId },
    });

    if (!brigade) {
      throw new Error('Brygada nie znaleziona');
    }

    return brigade;
  }

  /**
   * Get brigade with tasks
   */
  private async getBrigadeWithTasks(brigadeId: number): Promise<Brigade> {
    const brigade = await this.brigadeRepository.findOne({
      where: { id: brigadeId },
      relations: ['serviceTasks'],
    });

    if (!brigade) {
      throw new Error('Brygada nie znaleziona');
    }

    return brigade;
  }

  /**
   * Get priority label
   */
  private getPriorityLabel(priority: number): string {
    if (priority >= 8) return 'Wysoki';
    if (priority >= 5) return 'Średni';
    return 'Niski';
  }

  /**
   * Notification: Task assigned to brigade
   */
  async notifyTaskAssigned(
    brigadeId: number,
    taskId: number,
    assignedById: number
  ): Promise<void> {
    try {
      const members = await this.getMembersWithEmails(brigadeId);
      const task = await this.getTaskDetails(taskId);
      const assignedBy = await this.getUserById(assignedById);

      for (const member of members) {
        if (!member.user?.email) continue;

        await EmailQueueService.addToQueue({
          to: member.user.email,
          subject: `Nowe zadanie dla Twojej brygady: ${task.taskNumber}`,
          template: EmailTemplate.BRIGADE_TASK_ASSIGNED,
          context: {
            userName: member.user.firstName,
            brigadeName: member.brigade.name,
            brigadeCode: member.brigade.code,
            taskNumber: task.taskNumber,
            taskTitle: task.title,
            taskVariant: task.variant,
            taskPriority: task.priority,
            priorityLabel: this.getPriorityLabel(task.priority),
            assignedBy: `${assignedBy.firstName} ${assignedBy.lastName}`,
            taskUrl: `${process.env.FRONTEND_URL}/service-tasks/${task.id}`,
            platformName: 'Grover Platform',
            currentYear: new Date().getFullYear(),
          },
        });
      }

      console.log(`✅ Wysłano powiadomienia o przypisaniu zadania ${task.taskNumber} do brygady ${brigadeId}`);
    } catch (error) {
      console.error('❌ Błąd wysyłania powiadomień o przypisaniu zadania:', error);
    }
  }

  /**
   * Notification: Task removed from brigade
   */
  async notifyTaskRemoved(
    brigadeId: number,
    taskId: number,
    removedById: number
  ): Promise<void> {
    try {
      const members = await this.getMembersWithEmails(brigadeId);
      const task = await this.getTaskDetails(taskId);
      const removedBy = await this.getUserById(removedById);

      for (const member of members) {
        if (!member.user?.email) continue;

        await EmailQueueService.addToQueue({
          to: member.user.email,
          subject: `Zadanie usunięte z Twojej brygady: ${task.taskNumber}`,
          template: EmailTemplate.BRIGADE_TASK_REMOVED,
          context: {
            userName: member.user.firstName,
            brigadeName: member.brigade.name,
            brigadeCode: member.brigade.code,
            taskNumber: task.taskNumber,
            taskTitle: task.title,
            removedBy: `${removedBy.firstName} ${removedBy.lastName}`,
            platformName: 'Grover Platform',
            currentYear: new Date().getFullYear(),
          },
        });
      }

      console.log(`✅ Wysłano powiadomienia o usunięciu zadania ${task.taskNumber} z brygady ${brigadeId}`);
    } catch (error) {
      console.error('❌ Błąd wysyłania powiadomień o usunięciu zadania:', error);
    }
  }

  /**
   * Notification: Brigade changed for task
   */
  async notifyBrigadeChanged(
    taskId: number,
    oldBrigadeId: number,
    newBrigadeId: number,
    changedById: number
  ): Promise<void> {
    try {
      const task = await this.getTaskDetails(taskId);
      const changedBy = await this.getUserById(changedById);

      // Notify old brigade
      const oldMembers = await this.getMembersWithEmails(oldBrigadeId);
      const oldBrigade = await this.getBrigadeById(oldBrigadeId);

      for (const member of oldMembers) {
        if (!member.user?.email) continue;

        await EmailQueueService.addToQueue({
          to: member.user.email,
          subject: `Zadanie przeniesione do innej brygady: ${task.taskNumber}`,
          template: EmailTemplate.BRIGADE_TASK_CHANGED,
          context: {
            userName: member.user.firstName,
            brigadeName: oldBrigade.name,
            brigadeCode: oldBrigade.code,
            taskNumber: task.taskNumber,
            taskTitle: task.title,
            changeType: 'removed',
            changedBy: `${changedBy.firstName} ${changedBy.lastName}`,
            platformName: 'Grover Platform',
            currentYear: new Date().getFullYear(),
          },
        });
      }

      // Notify new brigade
      const newMembers = await this.getMembersWithEmails(newBrigadeId);
      const newBrigade = await this.getBrigadeById(newBrigadeId);

      for (const member of newMembers) {
        if (!member.user?.email) continue;

        await EmailQueueService.addToQueue({
          to: member.user.email,
          subject: `Nowe zadanie dla Twojej brygady: ${task.taskNumber}`,
          template: EmailTemplate.BRIGADE_TASK_CHANGED,
          context: {
            userName: member.user.firstName,
            brigadeName: newBrigade.name,
            brigadeCode: newBrigade.code,
            taskNumber: task.taskNumber,
            taskTitle: task.title,
            taskVariant: task.variant,
            taskPriority: task.priority,
            priorityLabel: this.getPriorityLabel(task.priority),
            changeType: 'assigned',
            changedBy: `${changedBy.firstName} ${changedBy.lastName}`,
            taskUrl: `${process.env.FRONTEND_URL}/service-tasks/${task.id}`,
            platformName: 'Grover Platform',
            currentYear: new Date().getFullYear(),
          },
        });
      }

      console.log(`✅ Wysłano powiadomienia o zmianie brygady dla zadania ${task.taskNumber}`);
    } catch (error) {
      console.error('❌ Błąd wysyłania powiadomień o zmianie brygady:', error);
    }
  }

  /**
   * Notification: Task priority changed
   */
  async notifyPriorityChanged(
    taskId: number,
    oldPriority: number,
    newPriority: number,
    changedById: number
  ): Promise<void> {
    try {
      const task = await this.getTaskWithBrigade(taskId);
      
      if (!task.brigadeId) {
        // No brigade assigned, nothing to notify
        return;
      }

      const members = await this.getMembersWithEmails(task.brigadeId);
      const changedBy = await this.getUserById(changedById);

      for (const member of members) {
        if (!member.user?.email) continue;

        await EmailQueueService.addToQueue({
          to: member.user.email,
          subject: `Zmiana priorytetu zadania: ${task.taskNumber}`,
          template: EmailTemplate.BRIGADE_TASK_PRIORITY_CHANGED,
          context: {
            userName: member.user.firstName,
            taskNumber: task.taskNumber,
            taskTitle: task.title,
            oldPriority,
            newPriority,
            oldPriorityLabel: this.getPriorityLabel(oldPriority),
            newPriorityLabel: this.getPriorityLabel(newPriority),
            priorityLabel: this.getPriorityLabel(newPriority),
            changedBy: `${changedBy.firstName} ${changedBy.lastName}`,
            taskUrl: `${process.env.FRONTEND_URL}/service-tasks/${task.id}`,
            platformName: 'Grover Platform',
            currentYear: new Date().getFullYear(),
          },
        });
      }

      console.log(`✅ Wysłano powiadomienia o zmianie priorytetu zadania ${task.taskNumber}`);
    } catch (error) {
      console.error('❌ Błąd wysyłania powiadomień o zmianie priorytetu:', error);
    }
  }

  /**
   * Notification: Member added to brigade (with active tasks)
   */
  async notifyMemberAdded(brigadeId: number, userId: number): Promise<void> {
    try {
      const brigade = await this.getBrigadeWithTasks(brigadeId);
      
      if (!brigade.serviceTasks || brigade.serviceTasks.length === 0) {
        // No tasks, no notification needed
        return;
      }

      const user = await this.getUserById(userId);

      if (!user.email) {
        console.warn(`⚠️ User ${userId} has no email address`);
        return;
      }

      await EmailQueueService.addToQueue({
        to: user.email,
        subject: `Dołączyłeś do brygady ${brigade.name} - masz nowe zadania!`,
        template: EmailTemplate.BRIGADE_MEMBER_ADDED_WITH_TASKS,
        context: {
          userName: user.firstName,
          brigadeName: brigade.name,
          brigadeCode: brigade.code,
          tasksCount: brigade.serviceTasks.length,
          tasks: brigade.serviceTasks.slice(0, 5).map(t => ({
            taskNumber: t.taskNumber,
            title: t.title,
            priority: t.priority,
            priorityLabel: this.getPriorityLabel(t.priority),
          })),
          hasMoreTasks: brigade.serviceTasks.length > 5,
          brigadeUrl: `${process.env.FRONTEND_URL}/brigades/${brigadeId}`,
          platformName: 'Grover Platform',
          currentYear: new Date().getFullYear(),
        },
      });

      console.log(`✅ Wysłano powiadomienie o dodaniu członka ${userId} do brygady ${brigadeId}`);
    } catch (error) {
      console.error('❌ Błąd wysyłania powiadomienia o dodaniu członka:', error);
    }
  }

  /**
   * Notification: Member removed from brigade (with tasks)
   */
  async notifyMemberRemoved(
    brigadeId: number,
    userId: number,
    tasksCount: number
  ): Promise<void> {
    try {
      if (tasksCount === 0) {
        // No tasks, no notification needed
        return;
      }

      const user = await this.getUserById(userId);
      const brigade = await this.getBrigadeById(brigadeId);

      if (!user.email) {
        console.warn(`⚠️ User ${userId} has no email address`);
        return;
      }

      await EmailQueueService.addToQueue({
        to: user.email,
        subject: `Zostałeś usunięty z brygady ${brigade.name}`,
        template: EmailTemplate.BRIGADE_MEMBER_REMOVED_WITH_TASKS,
        context: {
          userName: user.firstName,
          brigadeName: brigade.name,
          brigadeCode: brigade.code,
          tasksCount,
          platformName: 'Grover Platform',
          currentYear: new Date().getFullYear(),
        },
      });

      console.log(`✅ Wysłano powiadomienie o usunięciu członka ${userId} z brygady ${brigadeId}`);
    } catch (error) {
      console.error('❌ Błąd wysyłania powiadomienia o usunięciu członka:', error);
    }
  }
}

export default new BrigadeNotificationService();
