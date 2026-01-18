// src/services/TaskNumberGenerator.ts
// Serwis generowania unikalnych numerów zadań w formacie ZXXXXMMRR

import { AppDataSource } from '../config/database';
import { Task } from '../entities/Task';

export class TaskNumberGenerator {
  /**
   * Generuje unikalny numer zadania w formacie ZXXXXMMRR
   * Z - Zadanie
   * XXXX - kolejny numer w obrębie miesiąca (0001-9999)
   * MM - miesiąc stworzenia (01-12)
   * RR - rok stworzenia (ostatnie 2 cyfry)
   */
  static async generate(): Promise<string> {
    const taskRepository = AppDataSource.getRepository(Task);
    
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 01-12
    const year = String(now.getFullYear()).slice(-2); // Ostatnie 2 cyfry
    const monthYearSuffix = `${month}${year}`; // np. "0126"
    
    // Znajdź ostatnie zadanie w tym miesiącu
    const lastTask = await taskRepository
      .createQueryBuilder('task')
      .where('task.taskNumber LIKE :pattern', { 
        pattern: `Z%${monthYearSuffix}` 
      })
      .orderBy('task.taskNumber', 'DESC')
      .getOne();
    
    let nextSequence = 1;
    
    if (lastTask && lastTask.taskNumber) {
      // Wyciągnij sekwencję: Z00150126 -> 0015
      const match = lastTask.taskNumber.match(/^Z(\d{4})/);
      if (match) {
        const currentSeq = parseInt(match[1], 10);
        nextSequence = currentSeq + 1;
      }
    }
    
    if (nextSequence > 9999) {
      throw new Error(`Maksymalna liczba zadań (9999) osiągnięta dla miesiąca ${month}/${year}`);
    }
    
    const paddedSequence = String(nextSequence).padStart(4, '0');
    const taskNumber = `Z${paddedSequence}${monthYearSuffix}`;
    
    return taskNumber;
  }

  /**
   * Waliduje format numeru zadania ZXXXXMMRR
   */
  static validate(taskNumber: string): boolean {
    if (!taskNumber || taskNumber.length !== 9) {
      return false;
    }
    
    // Musi zaczynać się od 'Z'
    if (!taskNumber.startsWith('Z')) {
      return false;
    }
    
    // Format: Z + 4 cyfry + 2 cyfry miesiąca + 2 cyfry roku
    const regex = /^Z\d{4}(0[1-9]|1[0-2])\d{2}$/;
    return regex.test(taskNumber);
  }
}
