// tests/unit/services/AssetNumberingService.test.ts
import { AssetNumberingService } from '../../../src/services/AssetNumberingService';
import { Asset } from '../../../src/entities/Asset';
import { createMockRepository, createMockQueryBuilder } from '../../mocks/database.mock';

describe('AssetNumberingService', () => {
  let mockAssetRepository: any;
  let mockDataSource: any;
  let service: AssetNumberingService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAssetRepository = createMockRepository<Asset>();

    // Mock DataSource with transaction support
    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockAssetRepository),
      transaction: jest.fn().mockImplementation(async (callback: any) => {
        const manager = {
          getRepository: jest.fn().mockReturnValue(mockAssetRepository),
        };
        return callback(manager);
      }),
    };

    service = new AssetNumberingService(mockDataSource);
  });

  describe('generateAssetNumber', () => {
    it('should generate first asset number when no assets exist', async () => {
      const mockQb = createMockQueryBuilder<Asset>();
      mockQb.getOne.mockResolvedValue(null);
      mockAssetRepository.createQueryBuilder.mockReturnValue(mockQb);

      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);

      const result = await service.generateAssetNumber();

      expect(result).toBe(`OBJ-000001${month}${year}`);
    });

    it('should increment sequence for same month', async () => {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);

      const mockQb = createMockQueryBuilder<Asset>();
      mockQb.getOne.mockResolvedValue({ assetNumber: `OBJ-000001${month}${year}` } as Asset);
      mockAssetRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.generateAssetNumber();

      expect(result).toBe(`OBJ-000002${month}${year}`);
    });

    it('should handle large sequence numbers correctly', async () => {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);

      const mockQb = createMockQueryBuilder<Asset>();
      mockQb.getOne.mockResolvedValue({ assetNumber: `OBJ-123456${month}${year}` } as Asset);
      mockAssetRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.generateAssetNumber();

      expect(result).toBe(`OBJ-123457${month}${year}`);
    });

    it('should throw error when capacity exceeded', async () => {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);

      const mockQb = createMockQueryBuilder<Asset>();
      mockQb.getOne.mockResolvedValue({ assetNumber: `OBJ-999999${month}${year}` } as Asset);
      mockAssetRepository.createQueryBuilder.mockReturnValue(mockQb);

      await expect(service.generateAssetNumber()).rejects.toThrow('capacity exceeded');
    });

    it('should use transaction for thread safety', async () => {
      const mockQb = createMockQueryBuilder<Asset>();
      mockQb.getOne.mockResolvedValue(null);
      mockAssetRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.generateAssetNumber();

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should format sequence with leading zeros', async () => {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);

      const mockQb = createMockQueryBuilder<Asset>();
      mockQb.getOne.mockResolvedValue({ assetNumber: `OBJ-000009${month}${year}` } as Asset);
      mockAssetRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.generateAssetNumber();

      expect(result).toBe(`OBJ-000010${month}${year}`);
    });

    it('should include correct month and year suffix', async () => {
      const mockQb = createMockQueryBuilder<Asset>();
      mockQb.getOne.mockResolvedValue(null);
      mockAssetRepository.createQueryBuilder.mockReturnValue(mockQb);

      const now = new Date();
      const expectedMonth = String(now.getMonth() + 1).padStart(2, '0');
      const expectedYear = String(now.getFullYear()).slice(-2);

      const result = await service.generateAssetNumber();

      expect(result.substring(10, 12)).toBe(expectedMonth);
      expect(result.substring(12, 14)).toBe(expectedYear);
    });

    it('should query with correct LIKE pattern for current month/year', async () => {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);

      const mockQb = createMockQueryBuilder<Asset>();
      mockQb.getOne.mockResolvedValue(null);
      mockAssetRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.generateAssetNumber();

      expect(mockQb.where).toHaveBeenCalledWith(
        'asset.asset_number LIKE :pattern',
        { pattern: `OBJ-______${month}${year}` }
      );
    });
  });

  describe('validateAssetNumber', () => {
    it('should validate correct format', () => {
      expect(service.validateAssetNumber('OBJ-0000010426')).toBe(true);
      expect(service.validateAssetNumber('OBJ-9999991231')).toBe(true);
      expect(service.validateAssetNumber('OBJ-1234560126')).toBe(true);
    });

    it('should reject too short asset numbers', () => {
      expect(service.validateAssetNumber('OBJ-00001426')).toBe(false);
    });

    it('should reject too long asset numbers', () => {
      expect(service.validateAssetNumber('OBJ-00000010426')).toBe(false);
    });

    it('should reject invalid month 13', () => {
      expect(service.validateAssetNumber('OBJ-0000011326')).toBe(false);
    });

    it('should reject invalid month 00', () => {
      expect(service.validateAssetNumber('OBJ-0000010026')).toBe(false);
    });

    it('should reject wrong prefix', () => {
      expect(service.validateAssetNumber('ABC-0000010426')).toBe(false);
    });

    it('should reject non-numeric sequence', () => {
      expect(service.validateAssetNumber('OBJ-ABCDEF0426')).toBe(false);
    });

    it('should accept all valid months (01-12)', () => {
      for (let m = 1; m <= 12; m++) {
        const month = String(m).padStart(2, '0');
        expect(service.validateAssetNumber(`OBJ-000001${month}26`)).toBe(true);
      }
    });
  });

  describe('parseAssetNumber', () => {
    it('should parse valid asset number correctly', () => {
      const result = service.parseAssetNumber('OBJ-0123450426');
      expect(result).toEqual({
        sequence: 12345,
        month: 4,
        year: 26,
      });
    });

    it('should parse asset number with leading zeros in sequence', () => {
      const result = service.parseAssetNumber('OBJ-0000010426');
      expect(result).toEqual({
        sequence: 1,
        month: 4,
        year: 26,
      });
    });

    it('should parse max sequence asset number', () => {
      const result = service.parseAssetNumber('OBJ-9999991231');
      expect(result).toEqual({
        sequence: 999999,
        month: 12,
        year: 31,
      });
    });

    it('should return null for invalid format', () => {
      expect(service.parseAssetNumber('INVALID')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(service.parseAssetNumber('')).toBeNull();
    });

    it('should return null for wrong prefix', () => {
      expect(service.parseAssetNumber('ABC-0000010426')).toBeNull();
    });
  });
});
