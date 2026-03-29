// tests/unit/services/SymfoniaCarSyncService.test.ts

import { SymfoniaCarSyncService } from '../../../src/services/SymfoniaCarSyncService';
import { AppDataSource } from '../../../src/config/database';
import { Car } from '../../../src/entities/Car';
import { BrigadeService } from '../../../src/services/BrigadeService';
import { createMockRepository } from '../../mocks/database.mock';

// Mock the database
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

// Mock mssql to avoid real DB connections in unit tests
jest.mock('mssql', () => ({
  connect: jest.fn(),
  ConnectionPool: jest.fn(),
}));

// Mock BrigadeService
jest.mock('../../../src/services/BrigadeService');

describe('SymfoniaCarSyncService', () => {
  describe('parseCarTitle', () => {
    it('should parse standard format "S00144 Samochód CB144RX"', () => {
      const result = SymfoniaCarSyncService.parseCarTitle('S00144 Samochód CB144RX');
      expect(result).toEqual({ lp: 'S00144', registration: 'CB144RX' });
    });

    it('should parse format without diacritics "S00153 Samochod CB153PU"', () => {
      const result = SymfoniaCarSyncService.parseCarTitle('S00153 Samochod CB153PU');
      expect(result).toEqual({ lp: 'S00153', registration: 'CB153PU' });
    });

    it('should return uppercase LP and registration', () => {
      const result = SymfoniaCarSyncService.parseCarTitle('S00190 Samochód CB190PP');
      expect(result).toEqual({ lp: 'S00190', registration: 'CB190PP' });
    });

    it('should return null for invalid format (no LP)', () => {
      expect(SymfoniaCarSyncService.parseCarTitle('Samochód CB144RX')).toBeNull();
    });

    it('should return null for invalid format (wrong separator)', () => {
      expect(SymfoniaCarSyncService.parseCarTitle('S00144-Samochód-CB144RX')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(SymfoniaCarSyncService.parseCarTitle('')).toBeNull();
    });

    it('should return null for completely different format', () => {
      expect(SymfoniaCarSyncService.parseCarTitle('R0010125_A kontrakty')).toBeNull();
    });

    it('should handle lowercase input and return uppercase output', () => {
      const result = SymfoniaCarSyncService.parseCarTitle('s00144 samochód cb144rx');
      expect(result).toEqual({ lp: 'S00144', registration: 'CB144RX' });
    });

    it('should return null when registration contains special characters', () => {
      expect(SymfoniaCarSyncService.parseCarTitle('S00144 Samochód CB 144RX')).toBeNull();
    });
  });

  describe('syncCars', () => {
    let mockCarRepository: any;

    beforeEach(() => {
      jest.clearAllMocks();
      mockCarRepository = createMockRepository<Car>();
      (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockCarRepository);

      // Reset the sync running flag by mocking internal state
      // fetchSymfoniaCarData returns empty array by default
      jest.spyOn(SymfoniaCarSyncService, 'fetchSymfoniaCarData').mockResolvedValue([]);
    });

    it('should create a new car when not found in database', async () => {
      const symfoniaData = [
        { elementId: 100, title: 'S00144 Samochód CB144RX', active: true },
      ];
      jest.spyOn(SymfoniaCarSyncService, 'fetchSymfoniaCarData').mockResolvedValue(symfoniaData);

      mockCarRepository.findOne.mockResolvedValue(null);
      mockCarRepository.create.mockImplementation((data: any) => data);
      mockCarRepository.save.mockResolvedValue({ id: 1, ...symfoniaData[0] });
      mockCarRepository.find.mockResolvedValue([]);

      const result = await SymfoniaCarSyncService.syncCars();

      expect(result.success).toBe(true);
      expect(result.stats.created).toBe(1);
      expect(result.stats.archived).toBe(0);
      expect(result.stats.errors).toBe(0);
      expect(mockCarRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ symfoniaLp: 'S00144', registration: 'CB144RX' })
      );
    });

    it('should archive a car that is no longer in Symfonia', async () => {
      jest.spyOn(SymfoniaCarSyncService, 'fetchSymfoniaCarData').mockResolvedValue([]);

      const existingCar: Partial<Car> = {
        id: 1,
        symfoniaLp: 'S00144',
        registration: 'CB144RX',
        active: true,
        brigadeId: null,
        archivedAt: null,
      };
      mockCarRepository.find.mockResolvedValue([existingCar]);
      mockCarRepository.save.mockResolvedValue({ ...existingCar, active: false });

      const result = await SymfoniaCarSyncService.syncCars();

      expect(result.stats.archived).toBe(1);
      expect(mockCarRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ active: false, archivedAt: expect.any(Date) })
      );
    });

    it('should reactivate a previously archived car', async () => {
      const symfoniaData = [
        { elementId: 100, title: 'S00144 Samochód CB144RX', active: true },
      ];
      jest.spyOn(SymfoniaCarSyncService, 'fetchSymfoniaCarData').mockResolvedValue(symfoniaData);

      const archivedCar: Partial<Car> = {
        id: 1,
        symfoniaLp: 'S00144',
        registration: 'CB144RX',
        active: false,
        archivedAt: new Date('2026-01-01'),
        brigadeId: null,
        symfoniaElementId: 100,
      };
      mockCarRepository.findOne.mockResolvedValue(archivedCar);
      mockCarRepository.save.mockResolvedValue({ ...archivedCar, active: true, archivedAt: null });
      mockCarRepository.find.mockResolvedValue([]);

      const result = await SymfoniaCarSyncService.syncCars();

      expect(result.stats.updated).toBe(1);
      expect(mockCarRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ active: true, archivedAt: null })
      );
    });

    it('should skip records with inactive status in Symfonia', async () => {
      const symfoniaData = [
        { elementId: 100, title: 'S00144 Samochód CB144RX', active: false },
      ];
      jest.spyOn(SymfoniaCarSyncService, 'fetchSymfoniaCarData').mockResolvedValue(symfoniaData);
      mockCarRepository.find.mockResolvedValue([]);

      const result = await SymfoniaCarSyncService.syncCars();

      expect(result.stats.skipped).toBe(1);
      expect(result.stats.created).toBe(0);
      expect(mockCarRepository.findOne).not.toHaveBeenCalled();
    });

    it('should count parse errors and continue processing', async () => {
      const symfoniaData = [
        { elementId: 100, title: 'Niepoprawny format', active: true },
        { elementId: 101, title: 'S00153 Samochód CB153PU', active: true },
      ];
      jest.spyOn(SymfoniaCarSyncService, 'fetchSymfoniaCarData').mockResolvedValue(symfoniaData);

      mockCarRepository.findOne.mockResolvedValue(null);
      mockCarRepository.create.mockImplementation((data: any) => data);
      mockCarRepository.save.mockResolvedValue({ id: 2 });
      mockCarRepository.find.mockResolvedValue([]);

      const result = await SymfoniaCarSyncService.syncCars();

      expect(result.stats.errors).toBe(1);
      expect(result.stats.created).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Niepoprawny format');
    });

    it('should update car fields when registration changes in Symfonia', async () => {
      const symfoniaData = [
        { elementId: 100, title: 'S00144 Samochód CB999XX', active: true },
      ];
      jest.spyOn(SymfoniaCarSyncService, 'fetchSymfoniaCarData').mockResolvedValue(symfoniaData);

      const existingCar: Partial<Car> = {
        id: 1,
        symfoniaLp: 'S00144',
        registration: 'CB144RX', // Old registration
        active: true,
        brigadeId: null,
        symfoniaElementId: 100,
      };
      mockCarRepository.findOne.mockResolvedValue(existingCar);
      mockCarRepository.save.mockResolvedValue({ ...existingCar, registration: 'CB999XX' });
      mockCarRepository.find.mockResolvedValue([{ ...existingCar, symfoniaLp: 'S00144' }]);

      const result = await SymfoniaCarSyncService.syncCars();

      expect(result.stats.updated).toBe(1);
      expect(result.stats.skipped).toBe(0);
    });

    it('should throw error when sync is already running', async () => {
      // Simulate a long-running sync by mocking fetchSymfoniaCarData to hang
      let resolveFirst!: () => void;
      const hangPromise = new Promise<any[]>((resolve) => {
        resolveFirst = () => resolve([]);
      });
      jest.spyOn(SymfoniaCarSyncService, 'fetchSymfoniaCarData').mockReturnValueOnce(hangPromise);
      mockCarRepository.find.mockResolvedValue([]);

      // Start first sync (won't complete yet)
      const firstSync = SymfoniaCarSyncService.syncCars();

      // Second concurrent sync should throw
      await expect(SymfoniaCarSyncService.syncCars()).rejects.toThrow(
        'Synchronizacja samochodów jest już uruchomiona'
      );

      // Resolve the first sync
      resolveFirst();
      await firstSync;
    });
  });

  describe('toggleBrigade', () => {
    let mockCarRepository: any;
    let mockBrigadeService: jest.Mocked<BrigadeService>;

    beforeEach(() => {
      jest.clearAllMocks();
      mockCarRepository = createMockRepository<Car>();
      (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockCarRepository);

      mockBrigadeService = {
        createBrigade: jest.fn(),
        getBrigadeById: jest.fn(),
        getBrigadeByCode: jest.fn(),
        getBrigades: jest.fn(),
        updateBrigade: jest.fn(),
      } as any;
      (BrigadeService as jest.MockedClass<typeof BrigadeService>).mockImplementation(
        () => mockBrigadeService
      );
    });

    it('should create brigade and attach it to car when createBrigade=true', async () => {
      const car: Partial<Car> = {
        id: 1,
        symfoniaLp: 'S00144',
        registration: 'CB144RX',
        active: true,
        brigadeId: null,
      };
      mockCarRepository.findOne.mockResolvedValue(car);
      mockBrigadeService.getBrigadeByCode.mockResolvedValue(null);
      mockBrigadeService.createBrigade.mockResolvedValue({ id: 10, code: 'CB144RX' } as any);
      mockCarRepository.save.mockResolvedValue({ ...car, brigadeId: 10 });

      const result = await SymfoniaCarSyncService.toggleBrigade(1, true);

      expect(mockBrigadeService.getBrigadeByCode).toHaveBeenCalledWith('CB144RX');
      expect(mockBrigadeService.createBrigade).toHaveBeenCalledWith({
        code: 'CB144RX',
        name: 'CB144RX',
        description: '',
        active: true,
      });
      expect(mockCarRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ brigadeId: 10 })
      );
      expect(result).toBeDefined();
    });

    it('should reuse existing brigade when createBrigade=true and brigade already exists', async () => {
      const car: Partial<Car> = {
        id: 1,
        symfoniaLp: 'S00144',
        registration: 'CB144RX',
        active: true,
        brigadeId: null,
      };
      mockCarRepository.findOne.mockResolvedValue(car);
      mockBrigadeService.getBrigadeByCode.mockResolvedValue({ id: 5, code: 'CB144RX' } as any);
      mockCarRepository.save.mockResolvedValue({ ...car, brigadeId: 5 });

      await SymfoniaCarSyncService.toggleBrigade(1, true);

      expect(mockBrigadeService.createBrigade).not.toHaveBeenCalled();
      expect(mockCarRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ brigadeId: 5 })
      );
    });

    it('should detach brigade from car when createBrigade=false', async () => {
      const car: Partial<Car> = {
        id: 1,
        symfoniaLp: 'S00144',
        registration: 'CB144RX',
        active: true,
        brigadeId: 10,
      };
      mockCarRepository.findOne.mockResolvedValue(car);
      mockCarRepository.save.mockResolvedValue({ ...car, brigadeId: null });

      const result = await SymfoniaCarSyncService.toggleBrigade(1, false);

      expect(mockCarRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ brigadeId: null })
      );
      expect(result).toBeDefined();
    });

    it('should throw an error when car is not found', async () => {
      mockCarRepository.findOne.mockResolvedValue(null);

      await expect(SymfoniaCarSyncService.toggleBrigade(999, true)).rejects.toThrow(
        'Samochód nie znaleziony'
      );
    });

    it('should do nothing when createBrigade=true but brigade already attached', async () => {
      const car: Partial<Car> = {
        id: 1,
        symfoniaLp: 'S00144',
        registration: 'CB144RX',
        active: true,
        brigadeId: 10, // already has a brigade
      };
      mockCarRepository.findOne.mockResolvedValue(car);

      await SymfoniaCarSyncService.toggleBrigade(1, true);

      expect(mockBrigadeService.getBrigadeByCode).not.toHaveBeenCalled();
      expect(mockCarRepository.save).not.toHaveBeenCalled();
    });
  });
});
