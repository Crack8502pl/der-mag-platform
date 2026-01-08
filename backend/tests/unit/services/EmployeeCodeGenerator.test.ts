// tests/unit/services/EmployeeCodeGenerator.test.ts
// Unit tests for EmployeeCodeGenerator service

import { EmployeeCodeGenerator } from '../../../src/services/EmployeeCodeGenerator';
import { AppDataSource } from '../../../src/config/database';
import { User } from '../../../src/entities/User';
import { Repository } from 'typeorm';

// Mock the database connection
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('EmployeeCodeGenerator', () => {
  let mockUserRepository: Partial<Repository<User>>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock repository
    mockUserRepository = {
      findOne: jest.fn(),
    };
    
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockUserRepository);
  });

  describe('generate', () => {
    it('should generate 3-character code (Level 1) when no collision', async () => {
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);
      
      const code = await EmployeeCodeGenerator.generate('Remigiusz', 'Krakowski');
      
      expect(code).toBe('RKR');
      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should generate 4-character code (Level 2) when Level 1 collides', async () => {
      (mockUserRepository.findOne as jest.Mock)
        .mockResolvedValueOnce({ id: 1, employeeCode: 'RKR' }) // First call returns collision
        .mockResolvedValueOnce(null); // Second call returns no collision
      
      const code = await EmployeeCodeGenerator.generate('Remigiusz', 'Krakowski');
      
      expect(code).toBe('REKR');
      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(2);
    });

    it('should generate 5-character code (Level 3) when Level 1 and 2 collide', async () => {
      (mockUserRepository.findOne as jest.Mock)
        .mockResolvedValueOnce({ id: 1, employeeCode: 'RKR' })  // Level 1 collision
        .mockResolvedValueOnce({ id: 2, employeeCode: 'REKR' }) // Level 2 collision
        .mockResolvedValueOnce(null); // Level 3 success
      
      const code = await EmployeeCodeGenerator.generate('Remigiusz', 'Krakowski');
      
      expect(code).toBe('REMKR');
      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(3);
    });

    it('should generate numeric suffix code (Level 4) when all levels collide', async () => {
      (mockUserRepository.findOne as jest.Mock)
        .mockResolvedValueOnce({ id: 1, employeeCode: 'RKR' })    // Level 1 collision
        .mockResolvedValueOnce({ id: 2, employeeCode: 'REKR' })   // Level 2 collision
        .mockResolvedValueOnce({ id: 3, employeeCode: 'REMKR' })  // Level 3 collision
        .mockResolvedValueOnce(null); // Level 4 success
      
      const code = await EmployeeCodeGenerator.generate('Remigiusz', 'Krakowski');
      
      expect(code).toBe('REK01');
      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(4);
    });

    it('should convert to uppercase and remove non-letter characters', async () => {
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);
      
      const code = await EmployeeCodeGenerator.generate('jan-paul', 'kowalski123');
      
      expect(code).toBe('JKO');
    });

    it('should handle Polish characters correctly', async () => {
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);
      
      const code = await EmployeeCodeGenerator.generate('Łukasz', 'Śmiałek');
      
      expect(code).toBe('ŁŚM');
    });

    it('should handle short names correctly', async () => {
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);
      
      const code = await EmployeeCodeGenerator.generate('A', 'Be');
      
      expect(code).toBe('ABE');
    });

    it('should throw error if name is too short', async () => {
      await expect(
        EmployeeCodeGenerator.generate('A', 'B')
      ).rejects.toThrow('Imię musi mieć minimum 1 literę, nazwisko minimum 2 litery');
    });

    it('should throw error if unable to generate unique code after 99 attempts', async () => {
      // Mock all attempts to return existing codes
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue({ id: 1 });
      
      await expect(
        EmployeeCodeGenerator.generate('Jan', 'Kowalski')
      ).rejects.toThrow('Nie udało się wygenerować unikalnego kodu pracownika');
    });
  });

  describe('validateCode', () => {
    it('should validate correct 3-character code', () => {
      const result = EmployeeCodeGenerator.validateCode('ABC');
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate correct 5-character code with digits', () => {
      const result = EmployeeCodeGenerator.validateCode('AB01C');
      
      expect(result.valid).toBe(true);
    });

    it('should reject code that is too short', () => {
      const result = EmployeeCodeGenerator.validateCode('AB');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Kod musi mieć 3-5 znaków');
    });

    it('should reject code that is too long', () => {
      const result = EmployeeCodeGenerator.validateCode('ABCDEF');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Kod musi mieć 3-5 znaków');
    });

    it('should reject code with special characters', () => {
      const result = EmployeeCodeGenerator.validateCode('AB@C');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Kod może zawierać tylko wielkie litery i cyfry');
    });

    it('should reject code with lowercase letters', () => {
      const result = EmployeeCodeGenerator.validateCode('abc');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Kod może zawierać tylko wielkie litery i cyfry');
    });

    it('should accept Polish characters', () => {
      const result = EmployeeCodeGenerator.validateCode('ŁŚŻ');
      
      expect(result.valid).toBe(true);
    });
  });

  describe('isCodeAvailable', () => {
    it('should return true if code does not exist', async () => {
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);
      
      const available = await EmployeeCodeGenerator.isCodeAvailable('ABC');
      
      expect(available).toBe(true);
    });

    it('should return false if code exists', async () => {
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue({ id: 1, employeeCode: 'ABC' });
      
      const available = await EmployeeCodeGenerator.isCodeAvailable('ABC');
      
      expect(available).toBe(false);
    });

    it('should return true if code belongs to the user being updated', async () => {
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue({ id: 5, employeeCode: 'ABC' });
      
      const available = await EmployeeCodeGenerator.isCodeAvailable('ABC', 5);
      
      expect(available).toBe(true);
    });

    it('should return false if code belongs to a different user', async () => {
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue({ id: 3, employeeCode: 'ABC' });
      
      const available = await EmployeeCodeGenerator.isCodeAvailable('ABC', 5);
      
      expect(available).toBe(false);
    });
  });
});
