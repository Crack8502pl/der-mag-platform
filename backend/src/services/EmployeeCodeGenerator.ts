// src/services/EmployeeCodeGenerator.ts
// Service for generating unique employee codes

import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { IsNull } from 'typeorm';

export class EmployeeCodeGenerator {
  /**
   * Generuje unikalny kod pracownika na podstawie imienia i nazwiska
   * Format: 3-5 znaków UPPERCASE
   * Poziom 1: [1 imię][2 nazwisko] = RKR (3 znaki)
   * Poziom 2: [2 imię][2 nazwisko] = ROKR (4 znaki, jeśli kolizja)
   * Poziom 3: [3 imię][2 nazwisko] = REMKR (5 znaków, jeśli kolizja)
   * Poziom 4: [2 imię][1 nazwisko][2 cyfry] = RK01-RK99 (jeśli nadal kolizja)
   */
  static async generate(firstName: string, lastName: string): Promise<string> {
    const userRepository = AppDataSource.getRepository(User);
    
    // Clean and uppercase input, remove non-letter characters
    // Support Polish characters: ĄĆĘŁŃÓŚŹŻ
    const cleanFirst = firstName.trim().toUpperCase().replace(/[^A-ZĄĆĘŁŃÓŚŹŻ]/g, '');
    const cleanLast = lastName.trim().toUpperCase().replace(/[^A-ZĄĆĘŁŃÓŚŹŻ]/g, '');
    
    // Validate minimum length
    if (cleanFirst.length < 1 || cleanLast.length < 2) {
      throw new Error('Imię musi mieć minimum 1 literę, nazwisko minimum 2 litery');
    }
    
    // Poziom 1: 1+2 = 3 znaki (np. RKR)
    let code = cleanFirst.substring(0, 1) + cleanLast.substring(0, 2);
    let existing = await userRepository.findOne({ 
      where: { employeeCode: code, deletedAt: IsNull() } 
    });
    if (!existing) return code;
    
    // Poziom 2: 2+2 = 4 znaki (np. ROKR)
    if (cleanFirst.length >= 2) {
      code = cleanFirst.substring(0, 2) + cleanLast.substring(0, 2);
      existing = await userRepository.findOne({ 
        where: { employeeCode: code, deletedAt: IsNull() } 
      });
      if (!existing) return code;
    }
    
    // Poziom 3: 3+2 = 5 znaków (np. REMKR)
    if (cleanFirst.length >= 3) {
      code = cleanFirst.substring(0, 3) + cleanLast.substring(0, 2);
      existing = await userRepository.findOne({ 
        where: { employeeCode: code, deletedAt: IsNull() } 
      });
      if (!existing) return code;
    }
    
    // Poziom 4: Jeśli nadal kolizja - dodaj cyfrę (2+1+2 cyfry = 5 znaków)
    // Przykład: RK01, RK02, ..., RK99
    let counter = 1;
    const baseCode = cleanFirst.substring(0, Math.min(2, cleanFirst.length)) + 
                     cleanLast.substring(0, 1);
    
    while (counter < 100) {
      code = baseCode + counter.toString().padStart(2, '0');
      existing = await userRepository.findOne({ 
        where: { employeeCode: code, deletedAt: IsNull() } 
      });
      if (!existing) return code;
      counter++;
    }
    
    // Jeśli wyczerpano wszystkie możliwości (bardzo mało prawdopodobne)
    throw new Error('Nie udało się wygenerować unikalnego kodu pracownika. Proszę podać kod ręcznie.');
  }
  
  /**
   * Sprawdza czy kod pracownika jest dostępny (unikalny)
   */
  static async isCodeAvailable(code: string, excludeUserId?: number): Promise<boolean> {
    const userRepository = AppDataSource.getRepository(User);
    const query: any = { employeeCode: code, deletedAt: IsNull() };
    
    const existing = await userRepository.findOne({ where: query });
    
    // Code is available if not found, or if it belongs to the user being updated
    return !existing || (excludeUserId !== undefined && existing.id === excludeUserId);
  }
  
  /**
   * Waliduje format kodu pracownika
   */
  static validateCode(code: string): { valid: boolean; error?: string } {
    if (!code || code.length < 3 || code.length > 5) {
      return { valid: false, error: 'Kod musi mieć 3-5 znaków' };
    }
    
    // Only uppercase letters and digits allowed
    if (!/^[A-ZĄĆĘŁŃÓŚŹŻ0-9]+$/.test(code)) {
      return { valid: false, error: 'Kod może zawierać tylko wielkie litery i cyfry' };
    }
    
    return { valid: true };
  }
}
