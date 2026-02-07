// tests/unit/services/BomSubsystemTemplateService.test.ts
import { BomSubsystemTemplateService } from '../../../src/services/BomSubsystemTemplateService';
import { AppDataSource } from '../../../src/config/database';
import { BomSubsystemTemplate } from '../../../src/entities/BomSubsystemTemplate';
import { createMockRepository } from '../../mocks/database.mock';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('BomSubsystemTemplateService', () => {
  let mockTemplateRepository: any;

  beforeEach(() => {
    mockTemplateRepository = createMockRepository<BomSubsystemTemplate>();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === BomSubsystemTemplate || entity?.name === 'BomSubsystemTemplate') {
        return mockTemplateRepository;
      }
      return createMockRepository();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTemplate', () => {
    it('should return exact match when taskVariant is specified and exists', async () => {
      const mockTemplate: Partial<BomSubsystemTemplate> = {
        id: 1,
        subsystemType: 'PRZEJAZD' as any,
        taskVariant: 'PRZEJAZD_KAT_A',
        isActive: true,
        version: 1
      };

      mockTemplateRepository.findOne.mockResolvedValueOnce(mockTemplate);

      const result = await BomSubsystemTemplateService.getTemplate('PRZEJAZD' as any, 'PRZEJAZD_KAT_A');

      expect(result).toEqual(mockTemplate);
      expect(mockTemplateRepository.findOne).toHaveBeenCalledWith({
        where: { subsystemType: 'PRZEJAZD', taskVariant: 'PRZEJAZD_KAT_A', isActive: true },
        relations: ['items', 'items.warehouseStock', 'items.dependsOnItem'],
        order: {
          version: 'DESC',
          items: { sortOrder: 'ASC' }
        }
      });
    });

    it('should fallback to general template when specific variant not found', async () => {
      const mockGeneralTemplate: Partial<BomSubsystemTemplate> = {
        id: 2,
        subsystemType: 'PRZEJAZD' as any,
        taskVariant: null,
        isActive: true,
        version: 1
      };

      // First call (exact match) returns null, second call (fallback) returns general template
      mockTemplateRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockGeneralTemplate);

      const result = await BomSubsystemTemplateService.getTemplate('PRZEJAZD' as any, 'PRZEJAZD_KAT_A');

      expect(result).toEqual(mockGeneralTemplate);
      expect(mockTemplateRepository.findOne).toHaveBeenCalledTimes(2);
      
      // First call: exact match
      expect(mockTemplateRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: { subsystemType: 'PRZEJAZD', taskVariant: 'PRZEJAZD_KAT_A', isActive: true },
        relations: ['items', 'items.warehouseStock', 'items.dependsOnItem'],
        order: {
          version: 'DESC',
          items: { sortOrder: 'ASC' }
        }
      });
      
      // Second call: fallback to general
      expect(mockTemplateRepository.findOne).toHaveBeenNthCalledWith(2, expect.objectContaining({
        relations: ['items', 'items.warehouseStock', 'items.dependsOnItem'],
        order: {
          version: 'DESC',
          items: { sortOrder: 'ASC' }
        }
      }));
    });

    it('should return general template when no taskVariant specified', async () => {
      const mockGeneralTemplate: Partial<BomSubsystemTemplate> = {
        id: 3,
        subsystemType: 'SMW' as any,
        taskVariant: null,
        isActive: true,
        version: 1
      };

      mockTemplateRepository.findOne.mockResolvedValueOnce(mockGeneralTemplate);

      const result = await BomSubsystemTemplateService.getTemplate('SMW' as any);

      expect(result).toEqual(mockGeneralTemplate);
      expect(mockTemplateRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should return null when no templates exist at all', async () => {
      mockTemplateRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await BomSubsystemTemplateService.getTemplate('PRZEJAZD' as any, 'PRZEJAZD_KAT_A');

      expect(result).toBeNull();
      expect(mockTemplateRepository.findOne).toHaveBeenCalledTimes(2);
    });

    it('should handle taskVariant as empty string', async () => {
      const mockGeneralTemplate: Partial<BomSubsystemTemplate> = {
        id: 4,
        subsystemType: 'PRZEJAZD' as any,
        taskVariant: null,
        isActive: true,
        version: 1
      };

      mockTemplateRepository.findOne.mockResolvedValueOnce(mockGeneralTemplate);

      const result = await BomSubsystemTemplateService.getTemplate('PRZEJAZD' as any, null);

      expect(result).toEqual(mockGeneralTemplate);
      expect(mockTemplateRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });
});
