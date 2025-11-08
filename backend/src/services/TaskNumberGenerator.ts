// src/services/TaskNumberGenerator.ts
// Serwis generowania unikalnych 9-cyfrowych numerów zadań

import { AppDataSource } from '../config/database';
import { Task } from '../entities/Task';
import { TASK_NUMBER_FORMAT } from '../config/constants';

export class TaskNumberGenerator {
  private static readonly MAX_RETRIES = 10;

  /**
   * Generuje unikalny 9-cyfrowy numer zadania
   */
  static async generate(): Promise<string> {
    const taskRepository = AppDataSource.getRepository(Task);
    
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      const taskNumber = this.generateRandomNumber();
      
      // Sprawdź czy numer już istnieje
      const existing = await taskRepository.findOne({
        where: { taskNumber }
      });
      
      if (!existing) {
        return taskNumber;
      }
    }
    
    throw new Error('Nie udało się wygenerować unikalnego numeru zadania po wielu próbach');
  }

  /**
   * Generuje losowy 9-cyfrowy numer
   */
  private static generateRandomNumber(): string {
    const { MIN, MAX } = TASK_NUMBER_FORMAT;
    const randomNum = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
    return randomNum.toString();
  }

  /**
   * Waliduje format numeru zadania
   */
  static validate(taskNumber: string): boolean {
    if (!taskNumber || taskNumber.length !== TASK_NUMBER_FORMAT.LENGTH) {
      return false;
    }
    
    const num = parseInt(taskNumber);
    return !isNaN(num) && num >= TASK_NUMBER_FORMAT.MIN && num <= TASK_NUMBER_FORMAT.MAX;
  }
}
