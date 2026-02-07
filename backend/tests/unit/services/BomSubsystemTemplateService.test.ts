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
      
      // Second call: fallback to general - verify the where clause explicitly
      const secondCall = mockTemplateRepository.findOne.mock.calls[1][0];
      expect(secondCall.where.subsystemType).toBe('PRZEJAZD');
      expect(secondCall.where.isActive).toBe(true);
      // taskVariant should be In([null, '_GENERAL'])
      expect(secondCall.where.taskVariant).toBeDefined();
      expect(secondCall.relations).toEqual(['items', 'items.warehouseStock', 'items.dependsOnItem']);
      expect(secondCall.order).toEqual({
        version: 'DESC',
        items: { sortOrder: 'ASC' }
      });
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

    it('should handle taskVariant as null', async () => {
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

  describe('updateTemplate', () => {
    let mockItemRepository: any;

    beforeEach(() => {
      mockItemRepository = createMockRepository();
      
      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
        if (entity === BomSubsystemTemplate || entity?.name === 'BomSubsystemTemplate') {
          return mockTemplateRepository;
        }
        return mockItemRepository;
      });
    });

    it('should update template fields without touching items', async () => {
      const existingTemplate = {
        id: 1,
        templateName: 'Old Name',
        description: 'Old Description',
        isActive: true,
        items: []
      };

      mockTemplateRepository.findOne.mockResolvedValueOnce(existingTemplate);
      mockTemplateRepository.save.mockResolvedValueOnce({
        ...existingTemplate,
        templateName: 'New Name',
        description: 'New Description'
      });

      const result = await BomSubsystemTemplateService.updateTemplate(1, {
        templateName: 'New Name',
        description: 'New Description'
      });

      expect(result.templateName).toBe('New Name');
      expect(result.description).toBe('New Description');
      expect(mockItemRepository.remove).not.toHaveBeenCalled();
      expect(mockTemplateRepository.save).toHaveBeenCalled();
    });

    it('should preserve existing item IDs when updating items', async () => {
      const existingItem1 = { id: 10, materialName: 'Item 1', defaultQuantity: 5 };
      const existingItem2 = { id: 20, materialName: 'Item 2', defaultQuantity: 10 };
      
      const existingTemplate = {
        id: 1,
        templateName: 'Test Template',
        items: [existingItem1, existingItem2]
      };

      mockTemplateRepository.findOne.mockResolvedValueOnce(existingTemplate);
      mockItemRepository.findOne
        .mockResolvedValueOnce(existingItem1)
        .mockResolvedValueOnce(existingItem2);
      mockTemplateRepository.save.mockResolvedValueOnce(existingTemplate);

      const updatedItem1 = { id: 10, materialName: 'Updated Item 1', defaultQuantity: 7 };
      const updatedItem2 = { id: 20, materialName: 'Updated Item 2', defaultQuantity: 12 };

      await BomSubsystemTemplateService.updateTemplate(1, {
        items: [updatedItem1, updatedItem2]
      });

      // Should fetch existing items to update them
      expect(mockItemRepository.findOne).toHaveBeenCalledWith({ where: { id: 10 } });
      expect(mockItemRepository.findOne).toHaveBeenCalledWith({ where: { id: 20 } });
      
      // Should not remove any items
      expect(mockItemRepository.remove).not.toHaveBeenCalled();
    });

    it('should create new items without IDs', async () => {
      const existingTemplate = {
        id: 1,
        templateName: 'Test Template',
        items: []
      };

      mockTemplateRepository.findOne.mockResolvedValueOnce(existingTemplate);
      mockItemRepository.create.mockImplementation((data: any) => data);
      mockTemplateRepository.save.mockResolvedValueOnce(existingTemplate);

      const newItem = { materialName: 'New Item', defaultQuantity: 5 };

      await BomSubsystemTemplateService.updateTemplate(1, {
        items: [newItem]
      });

      // Should create new item
      expect(mockItemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 1,
          materialName: 'New Item',
          defaultQuantity: 5
        })
      );
    });

    it('should delete removed items', async () => {
      const existingItem1 = { id: 10, materialName: 'Item 1' };
      const existingItem2 = { id: 20, materialName: 'Item 2' };
      const existingItem3 = { id: 30, materialName: 'Item 3' };
      
      const existingTemplate = {
        id: 1,
        templateName: 'Test Template',
        items: [existingItem1, existingItem2, existingItem3]
      };

      mockTemplateRepository.findOne.mockResolvedValueOnce(existingTemplate);
      mockItemRepository.findOne
        .mockResolvedValueOnce(existingItem1)
        .mockResolvedValueOnce(existingItem2);
      mockTemplateRepository.save.mockResolvedValueOnce(existingTemplate);

      // Only keep items 1 and 2, remove item 3
      await BomSubsystemTemplateService.updateTemplate(1, {
        items: [
          { id: 10, materialName: 'Item 1', defaultQuantity: 5 },
          { id: 20, materialName: 'Item 2', defaultQuantity: 10 }
        ]
      });

      // Should remove item 3
      expect(mockItemRepository.remove).toHaveBeenCalledWith([existingItem3]);
    });

    it('should handle mix of new and existing items', async () => {
      const existingItem = { id: 10, materialName: 'Existing Item' };
      
      const existingTemplate = {
        id: 1,
        templateName: 'Test Template',
        items: [existingItem]
      };

      mockTemplateRepository.findOne.mockResolvedValueOnce(existingTemplate);
      mockItemRepository.findOne.mockResolvedValueOnce(existingItem);
      mockItemRepository.create.mockImplementation((data: any) => data);
      mockTemplateRepository.save.mockResolvedValueOnce(existingTemplate);

      await BomSubsystemTemplateService.updateTemplate(1, {
        items: [
          { id: 10, materialName: 'Updated Existing Item', defaultQuantity: 7 },
          { materialName: 'New Item', defaultQuantity: 5 }
        ]
      });

      // Should update existing item
      expect(mockItemRepository.findOne).toHaveBeenCalledWith({ where: { id: 10 } });
      
      // Should create new item
      expect(mockItemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          materialName: 'New Item',
          defaultQuantity: 5
        })
      );
    });

    it('should throw error when template not found', async () => {
      mockTemplateRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        BomSubsystemTemplateService.updateTemplate(999, { templateName: 'Test' })
      ).rejects.toThrow('Template not found');
    });
  });
});
