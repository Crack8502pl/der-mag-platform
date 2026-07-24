import { BomResolverService } from '../../../src/services/BomResolverService';
import { SubsystemType } from '../../../src/entities/BomSubsystemTemplate';
import { QuantitySource } from '../../../src/entities/BomSubsystemTemplateItem';
import { BomSubsystemTemplateService } from '../../../src/services/BomSubsystemTemplateService';
import { RecorderSelectionService } from '../../../src/services/RecorderSelectionService';
import { DiskConfigurationService } from '../../../src/services/DiskConfigurationService';
import { BomTemplateDependencyRuleService } from '../../../src/services/BomTemplateDependencyRuleService';
import { DependencyRuleEngine } from '../../../src/services/DependencyRuleEngine';

jest.mock('../../../src/services/BomSubsystemTemplateService', () => ({
  BomSubsystemTemplateService: {
    getTemplate: jest.fn()
  }
}));

jest.mock('../../../src/services/RecorderSelectionService', () => ({
  RecorderSelectionService: {
    getRecorder: jest.fn(),
    selectRecorder: jest.fn()
  }
}));

jest.mock('../../../src/services/DiskConfigurationService', () => ({
  DiskConfigurationService: {
    calculateRequiredStorage: jest.fn(),
    selectOptimalDisks: jest.fn(),
    getDisk: jest.fn()
  }
}));

jest.mock('../../../src/services/BomTemplateDependencyRuleService', () => ({
  BomTemplateDependencyRuleService: {
    getRulesForTemplate: jest.fn()
  }
}));

jest.mock('../../../src/services/DependencyRuleEngine', () => ({
  DependencyRuleEngine: {
    evaluate: jest.fn()
  }
}));

describe('BomResolverService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (BomSubsystemTemplateService.getTemplate as jest.Mock).mockResolvedValue({
      id: 101,
      templateName: 'SMOKIP A LCS',
      version: 1,
      items: [
        {
          id: 1001,
          materialName: 'Pozycja testowa',
          catalogNumber: null,
          unit: 'szt',
          defaultQuantity: 1,
          quantitySource: QuantitySource.FIXED,
          configParamName: null,
          dependsOnItemId: null,
          dependencyFormula: null,
          requiresIp: false,
          isRequired: true,
          sortOrder: 0,
          notes: null,
          warehouseStockId: null,
          groupName: 'Inne'
        }
      ]
    });
    (RecorderSelectionService.selectRecorder as jest.Mock).mockResolvedValue({
      id: 11,
      warehouseStockId: 111,
      diskSlots: 2
    });
    (DiskConfigurationService.calculateRequiredStorage as jest.Mock).mockReturnValue(1);
    (DiskConfigurationService.selectOptimalDisks as jest.Mock).mockResolvedValue([]);
    (BomTemplateDependencyRuleService.getRulesForTemplate as jest.Mock).mockResolvedValue([]);
    (DependencyRuleEngine.evaluate as jest.Mock).mockResolvedValue(new Map());
  });

  it('selects recorder for SMOKIP_A LCS when cameraCount > 0', async () => {
    const result = await BomResolverService.resolve({
      subsystemType: SubsystemType.SMOKIP_A,
      taskType: 'LCS',
      cameraCount: 8,
      configParams: {}
    });

    expect(RecorderSelectionService.selectRecorder).toHaveBeenCalledWith(8);
    expect(result.recorder?.id).toBe(11);
  });

  it('does not select recorder for SMOKIP_A LCS when cameraCount = 0', async () => {
    const result = await BomResolverService.resolve({
      subsystemType: SubsystemType.SMOKIP_A,
      taskType: 'LCS',
      cameraCount: 0,
      configParams: {}
    });

    expect(RecorderSelectionService.selectRecorder).not.toHaveBeenCalled();
    expect(result.recorder).toBeNull();
  });

  it('passes nested camera aliases in mergedConfigParams for dependency rules', async () => {
    (BomTemplateDependencyRuleService.getRulesForTemplate as jest.Mock).mockResolvedValue([{ id: 1 }]);

    await BomResolverService.resolve({
      subsystemType: SubsystemType.SMOKIP_A,
      taskType: 'LCS',
      cameraCount: 6,
      cameraBreakdown: {
        total: 6,
        ogolna: 4,
        lpr: 1,
        skp: 1
      },
      configParams: {
        lcsConfig: { existing: 'keep' },
        nastawniConfig: { standalone: true }
      }
    });

    expect(DependencyRuleEngine.evaluate).toHaveBeenCalledTimes(1);
    const mergedConfigParams = (DependencyRuleEngine.evaluate as jest.Mock).mock.calls[0][3];
    expect(mergedConfigParams.cameraCount).toBe(6);
    expect(mergedConfigParams['camera.total']).toBe(6);
    expect(mergedConfigParams['camera.total.ip']).toBe(6);
    expect(mergedConfigParams['camera.ip.total']).toBe(6);
    expect(mergedConfigParams['camera.total.ip.ogolna']).toBe(4);
    expect(mergedConfigParams['camera.total.ip.lpr']).toBe(1);
    expect(mergedConfigParams['camera.total.ip.skp']).toBe(1);
    expect(mergedConfigParams['camera.recording.days']).toBe(14);
    expect(mergedConfigParams['camera.bitrate.mbps']).toBe(4);
    expect(mergedConfigParams['camera.storage.tb']).toBe(1);
    expect(mergedConfigParams.lcsConfig).toEqual({
      existing: 'keep',
      iloscKamer: 6
    });
    expect(mergedConfigParams.nastawniConfig).toEqual({
      standalone: true,
      iloscKamer: 6
    });
  });

  it('uses legacy camera.ip.total alias from config params when request camera data is missing', async () => {
    (BomTemplateDependencyRuleService.getRulesForTemplate as jest.Mock).mockResolvedValue([{ id: 1 }]);

    await BomResolverService.resolve({
      subsystemType: SubsystemType.SMOKIP_A,
      taskType: 'LCS',
      configParams: {
        'camera.ip.total': 9
      }
    });

    expect(RecorderSelectionService.selectRecorder).toHaveBeenCalledWith(9);
    const mergedConfigParams = (DependencyRuleEngine.evaluate as jest.Mock).mock.calls[0][3];
    expect(mergedConfigParams['camera.total.ip']).toBe(9);
    expect(mergedConfigParams['camera.ip.total']).toBe(9);
  });

  it('uses cameraBreakdown total when cameraCount is not provided', async () => {
    const result = await BomResolverService.resolve({
      subsystemType: SubsystemType.SMOKIP_A,
      taskType: 'LCS',
      cameraBreakdown: {
        total: 5,
        ogolna: 3,
        lpr: 1,
        skp: 1
      },
      configParams: {}
    });

    expect(RecorderSelectionService.selectRecorder).toHaveBeenCalledWith(5);
    expect(result.cameraCount).toBe(5);
    expect(result.cameraBreakdown).toEqual({
      total: 5,
      ogolna: 3,
      lpr: 1,
      skp: 1
    });
  });

  it('needsRecorder returns true for SMOKIP_A LCS', () => {
    expect(BomResolverService.needsRecorder(SubsystemType.SMOKIP_A, 'LCS')).toBe(true);
  });
});
