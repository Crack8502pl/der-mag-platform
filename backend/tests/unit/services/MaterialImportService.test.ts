import * as fs from 'fs';
import { MaterialImportService } from '../../../src/services/MaterialImportService';
import { AppDataSource } from '../../../src/config/database';
import { MaterialStock, StockSource } from '../../../src/entities/MaterialStock';
import { MaterialImportLog, ImportStatus } from '../../../src/entities/MaterialImportLog';
import { createMockRepository } from '../../mocks/database.mock';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
    compare: jest.fn(),
  },
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn(),
}));

describe('MaterialImportService', () => {
  let mockStockRepo: any;
  let mockImportLogRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStockRepo = createMockRepository<MaterialStock>();
    mockImportLogRepo = createMockRepository<MaterialImportLog>();

    mockStockRepo.create.mockImplementation((data: any) => data);
    mockImportLogRepo.create.mockImplementation((data: any) => ({ id: 1, ...data }));
    mockImportLogRepo.save.mockImplementation(async (value: any) => value);
    mockStockRepo.save.mockImplementation(async (value: any) => value);

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === MaterialStock) return mockStockRepo;
      if (entity === MaterialImportLog) return mockImportLogRepo;
      return createMockRepository();
    });
  });

  describe('generateCSVTemplate', () => {
    it('returns csv template with expected headers', () => {
      const result = MaterialImportService.generateCSVTemplate();

      expect(result).toContain('Indeks;Nazwa;Stan;JM;Cena;Magazyn;Dostawca;KodKreskowy;EAN');
      expect(result).toContain('MAT-001;Przykładowy materiał;100;szt;25.50');
    });
  });

  describe('getColumnMappings', () => {
    it('returns mappings with aliases for key columns', () => {
      const result = MaterialImportService.getColumnMappings();

      expect(result.partNumber).toContain('Indeks');
      expect(result.name).toContain('Nazwa');
      expect(result.quantity).toContain('Qty');
    });
  });

  describe('checkAvailability', () => {
    it('reports available, partial and missing materials', async () => {
      mockStockRepo.find.mockResolvedValue([
        {
          partNumber: 'MAT-1',
          name: 'Kabel',
          quantityAvailable: 10,
          quantityReserved: 2,
          warehouseLocation: 'A-01',
        },
        {
          partNumber: 'MAT-2',
          name: 'Switch',
          quantityAvailable: 3,
          quantityReserved: 1,
          warehouseLocation: 'B-01',
        },
      ]);

      const result = await MaterialImportService.checkAvailability([
        { partNumber: 'MAT-1', quantity: 5 },
        { partNumber: 'MAT-2', quantity: 3 },
        { partNumber: 'MAT-3', quantity: 1 },
      ]);

      expect(result).toEqual([
        expect.objectContaining({ partNumber: 'MAT-1', status: 'available', available: 8 }),
        expect.objectContaining({ partNumber: 'MAT-2', status: 'partial', available: 2 }),
        expect.objectContaining({ partNumber: 'MAT-3', status: 'not_found', available: 0 }),
      ]);
    });
  });

  describe('reserveMaterials', () => {
    it('reserves materials successfully', async () => {
      const stock = { partNumber: 'MAT-1', quantityAvailable: 10, quantityReserved: 2 };
      mockStockRepo.find.mockResolvedValue([stock]);

      await MaterialImportService.reserveMaterials([{ partNumber: 'MAT-1', quantity: 4 }], 'ORD-1');

      expect(stock.quantityReserved).toBe(6);
      expect(mockStockRepo.save).toHaveBeenCalledWith([stock]);
    });

    it('throws when material does not exist', async () => {
      mockStockRepo.find.mockResolvedValue([]);

      await expect(
        MaterialImportService.reserveMaterials([{ partNumber: 'MAT-404', quantity: 1 }])
      ).rejects.toThrow('Materiał MAT-404 nie znaleziony');
    });
  });

  describe('releaseMaterials', () => {
    it('releases reservations and never goes below zero', async () => {
      const stock = { partNumber: 'MAT-1', quantityAvailable: 10, quantityReserved: 2 };
      mockStockRepo.find.mockResolvedValue([stock]);

      await MaterialImportService.releaseMaterials([{ partNumber: 'MAT-1', quantity: 5 }]);

      expect(stock.quantityReserved).toBe(0);
      expect(mockStockRepo.save).toHaveBeenCalledWith([stock]);
    });
  });

  describe('getImportHistory', () => {
    it('returns import history with provided limit', async () => {
      mockImportLogRepo.find.mockResolvedValue([{ id: 5 }]);

      const result = await MaterialImportService.getImportHistory(10);

      expect(mockImportLogRepo.find).toHaveBeenCalledWith({
        relations: ['importedBy'],
        order: { createdAt: 'DESC' },
        take: 10,
      });
      expect(result).toEqual([{ id: 5 }]);
    });
  });

  describe('getImportDetails', () => {
    it('returns import details when found', async () => {
      mockImportLogRepo.findOne.mockResolvedValue({ id: 2 });

      const result = await MaterialImportService.getImportDetails(2);

      expect(mockImportLogRepo.findOne).toHaveBeenCalledWith({
        where: { id: 2 },
        relations: ['importedBy'],
      });
      expect(result).toEqual({ id: 2 });
    });

    it('returns null when import details are missing', async () => {
      mockImportLogRepo.findOne.mockResolvedValue(null);

      await expect(MaterialImportService.getImportDetails(999)).resolves.toBeNull();
    });
  });

  describe('importFromCSV', () => {
    it('parses CSV rows into material stock data through public import method', async () => {
      const csv = [
        'Indeks;Nazwa;Stan;JM;Cena;Magazyn;Dostawca;KodKreskowy;EAN;Opis',
        'MAT-1;Kabel LAN;10,5;m;25,50;A-01;DerMag;12345;5901234567890;Opis materiału',
      ].join('\n');
      (fs.readFileSync as jest.Mock).mockReturnValue(csv);
      mockStockRepo.find.mockResolvedValue([]);

      const result = await MaterialImportService.importFromCSV('/tmp/materials.csv', 'materials.csv', 123, 7);

      expect(mockStockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        partNumber: 'MAT-1',
        name: 'Kabel LAN',
        description: 'Opis materiału',
        quantityAvailable: 10.5,
        unit: 'm',
        unitPrice: 25.5,
        warehouseLocation: 'A-01',
        supplier: 'DerMag',
        barcode: '12345',
        eanCode: '5901234567890',
        source: StockSource.CSV_IMPORT,
        lastImportFile: 'materials.csv',
        isActive: true,
      }));
      expect(result.importedCount).toBe(1);
      expect(result.updatedCount).toBe(0);
      expect(result.errorCount).toBe(0);
      expect(result.importLog.status).toBe(ImportStatus.COMPLETED);
    });

    it('marks import as failed when every row is invalid', async () => {
      const csv = [
        'Indeks;Nazwa;Stan',
        ';Brak indeksu;4',
      ].join('\n');
      (fs.readFileSync as jest.Mock).mockReturnValue(csv);
      mockStockRepo.find.mockResolvedValue([]);

      const result = await MaterialImportService.importFromCSV('/tmp/materials.csv', 'materials.csv', 123, 7);

      expect(result.importedCount).toBe(0);
      expect(result.errorCount).toBe(1);
      expect(result.importLog.status).toBe(ImportStatus.FAILED);
      expect(result.importLog.errors).toEqual([
        expect.objectContaining({ message: 'Brak wymaganego numeru katalogowego lub nazwy' }),
      ]);
    });
  });
});
