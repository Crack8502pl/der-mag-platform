// src/services/EmployeeCodeGenerator.ts
// Service for generating unique employee codes (3-5 characters)

import { AppDataSource } from '../config/database';
import { User } from '../entities/User';

export class EmployeeCodeGenerator {
  /**
   * Generuje unikalny kod pracownika (3-5 znaków, DUŻE LITERY)
   * 
   * Algorytm:
   * - Poziom 1: [1 imię][2 nazwisko] → RKR (3 znaki)
   * - Poziom 2: [2 imię][2 nazwisko] → REKR (4 znaki) 
   * - Poziom 3: [3 imię][2 nazwisko] → REMKR (5 znaków)
   * - Fallback: [2 imię][1 nazwisko][2 cyfry] → RE01, RE02, etc.
   * 
   * @param firstName - Imię pracownika
   * @param lastName - Nazwisko pracownika
   * @returns Promise<string> - Unikalny kod pracownika
   */
  static async generate(firstName: string, lastName: string): Promise<string> {
    const userRepository = AppDataSource.getRepository(User);
    
    // Normalizacja - usunięcie znaków specjalnych, wielkie litery
    const cleanFirst = firstName
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Usuń diakrytyki
      .replace(/[^A-Z]/g, ''); // Pozostaw tylko litery A-Z
    
    const cleanLast = lastName
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z]/g, '');
    
    if (cleanFirst.length === 0 || cleanLast.length === 0) {
      throw new Error('Imię i nazwisko muszą zawierać co najmniej jedną literę');
    }
    
    // Poziom 1: 1+2 = 3 znaki
    let code = cleanFirst.substring(0, 1) + cleanLast.substring(0, 2);
    let exists = await userRepository.findOne({ 
      where: { employeeCode: code },
      withDeleted: false
    });
    
    if (!exists) {
      return code;
    }
    
    // Poziom 2: 2+2 = 4 znaki
    if (cleanFirst.length >= 2) {
      code = cleanFirst.substring(0, 2) + cleanLast.substring(0, 2);
      exists = await userRepository.findOne({ 
        where: { employeeCode: code },
        withDeleted: false
      });
      
      if (!exists) {
        return code;
      }
    }
    
    // Poziom 3: 3+2 = 5 znaków
    if (cleanFirst.length >= 3) {
      code = cleanFirst.substring(0, 3) + cleanLast.substring(0, 2);
      exists = await userRepository.findOne({ 
        where: { employeeCode: code },
        withDeleted: false
      });
      
      if (!exists) {
        return code;
      }
    }
    
    // Fallback: 2 litery + 2 cyfry (format: AB01, AB02, etc.)
    const baseCode = cleanFirst.substring(0, Math.min(2, cleanFirst.length)) + 
                     cleanLast.substring(0, Math.min(1, cleanLast.length));
    
    let counter = 1;
    while (counter <= 99) {
      code = baseCode + counter.toString().padStart(2, '0');
      
      // Upewnij się, że kod ma maksymalnie 5 znaków
      if (code.length > 5) {
        code = code.substring(0, 5);
      }
      
      exists = await userRepository.findOne({ 
        where: { employeeCode: code },
        withDeleted: false
      });
      
      if (!exists) {
        return code;
      }
      
      counter++;
    }
    
    throw new Error('Nie udało się wygenerować unikalnego kodu pracownika po 99 próbach');
  }
}
