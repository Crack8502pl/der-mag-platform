import { BomResolverService } from '../../../src/services/BomResolverService';
import { SubsystemType } from '../../../src/entities/BomSubsystemTemplate';
import { QuantitySource } from '../../../src/entities/BomSubsystemTemplateItem';
import { BomSubsystemTemplateService } from '../../../src/services/BomSubsystemTemplateService';
import { RecorderSelectionService } from '../../../src/services/RecorderSelectionService';
import { DiskConfigurationService } from '../../../src/services/DiskConfigurationService';
import { BomTemplateDependencyRuleService } from '../../../src/services/BomTemplateDependencyRuleService';
import { DependencyRuleEngine } from '../../../src/services/DependencyRuleEngine';
import { SlicanAudioResolverService } from '../../../src/modules/slican-audio/services/slican-audio-resolver.service';

jest.mock('../../../src/services/BomSubsystemTemplateService', () => ({
  BomSubsystemTemplateService: {
    getTemplate: jest.fn()
  }
}));

jest.mock('../../../src/services/RecorderSelectionService', () => ({
  RecorderSelectionService: {
    getRecorder: jest.fn(),
    selectRecorder: jest.fn(),
    getAllRecorders: jest.fn()
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

const mockResolveSlicanAudio = jest.fn();
jest.mock('../../../src/modules/slican-audio/services/slican-audio-resolver.service', () => ({
  SlicanAudioResolverService: jest.fn().mockImplementation(() => ({
    resolveForSmokA: mockResolveSlicanAudio
  }))
}));

describe('BomResolverService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveSlicanAudio.mockResolvedValue({
      centralRecommendation: { warehouseStockId: 500, modelName: 'NCP-CM300P' },
      licenses: [{ type: 'AUDIO', items: [{ warehouseStockId: 600, quantity: 2 }] }],
      warnings: [],
      bomItems: [
        { warehouseStockId: 500, quantity: 1 },
        { warehouseStockId: 501, quantity: 0 },
        { warehouseStockId: 600, quantity: 2 }
      ]
    });

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

  describe('recorder mapped to BOM quantity', () => {
    const recorderItem = (id: number, stockId: number) => ({
      id,
      materialName: `Rejestrator ${stockId}`,
      catalogNumber: null,
      unit: 'szt',
      defaultQuantity: 1,
      quantitySource: QuantitySource.DEPENDENT,
      configParamName: null,
      dependsOnItemId: null,
      dependencyFormula: null,
      requiresIp: false,
      isRequired: false,
      sortOrder: id,
      notes: null,
      warehouseStockId: stockId,
      groupName: 'Rejestratory'
    });

    beforeEach(() => {
      (BomSubsystemTemplateService.getTemplate as jest.Mock).mockResolvedValue({
        id: 102,
        templateName: 'SMOKIP A LCS',
        version: 1,
        items: [recorderItem(1, 101), recorderItem(2, 300)]
      });
      (RecorderSelectionService.getAllRecorders as jest.Mock).mockResolvedValue([
        { id: 1, warehouseStockId: 101, diskSlots: 1 },
        { id: 2, warehouseStockId: 300, diskSlots: 4 }
      ]);
    });

    const quantities = (result: any) =>
      Object.fromEntries(result.items.map((i: any) => [i.warehouseStockId, Number(i.resolvedQuantity)]));

    it('sets quantity 1 for selected recorder (10 cameras) and 0 for alternatives', async () => {
      (RecorderSelectionService.selectRecorder as jest.Mock).mockResolvedValue({
        id: 2, warehouseStockId: 300, diskSlots: 4
      });
      const result = await BomResolverService.resolve({
        subsystemType: SubsystemType.SMOKIP_A,
        taskType: 'LCS',
        cameraCount: 10,
        configParams: {}
      });
      expect(quantities(result)).toEqual({ 101: 0, 300: 1 });
    });

    it('selects the small recorder for 2 cameras', async () => {
      (RecorderSelectionService.selectRecorder as jest.Mock).mockResolvedValue({
        id: 1, warehouseStockId: 101, diskSlots: 1
      });
      const result = await BomResolverService.resolve({
        subsystemType: SubsystemType.SMOKIP_A,
        taskType: 'LCS',
        cameraCount: 2,
        configParams: {}
      });
      expect(quantities(result)).toEqual({ 101: 1, 300: 0 });
    });
  });

  it('needsRecorder returns true for SMOKIP_A LCS', () => {
    expect(BomResolverService.needsRecorder(SubsystemType.SMOKIP_A, 'LCS')).toBe(true);
  });

  it('maps selected audio central and licenses into SMOKIP_A BOM items', async () => {
    (BomSubsystemTemplateService.getTemplate as jest.Mock).mockResolvedValue({
      id: 103,
      templateName: 'SMOKIP A',
      version: 1,
      items: [500, 501, 600].map((warehouseStockId, index) => ({
        id: index + 1,
        materialName: `Stock ${warehouseStockId}`,
        catalogNumber: null,
        unit: 'szt',
        defaultQuantity: 1,
        quantitySource: QuantitySource.FIXED,
        requiresIp: false,
        isRequired: false,
        sortOrder: index,
        warehouseStockId,
        groupName: 'Audio'
      }))
    });
    const result = await BomResolverService.resolve({
      subsystemType: SubsystemType.SMOKIP_A,
      taskType: 'LCS',
      audioBreakdown: {
        dphIpDevices: 0,
        audioIpDevices: 2,
        cts220IpDevices: 0,
        ivrChannels: 0,
        conferenceChannels: 0
      },
      configParams: {}
    });

    expect(result.centralRecommendation?.warehouseStockId).toBe(500);
    expect(result.licenses?.[0].items[0].quantity).toBe(2);
    expect(result.items.map(item => [item.warehouseStockId, item.resolvedQuantity])).toEqual([
      [500, 1],
      [501, 0],
      [600, 2]
    ]);
  });

  it('does not run Slican audio resolution for SMOKIP_B or CCTV, or infer demand from cameras', async () => {
    await BomResolverService.resolve({
      subsystemType: SubsystemType.SMOKIP_B,
      cameraBreakdown: { total: 5, ogolna: 5, lpr: 0, skp: 0 },
      configParams: {}
    });
    await BomResolverService.resolve({
      subsystemType: SubsystemType.CCTV,
      cameraCount: 5,
      configParams: {}
    });
    expect(mockResolveSlicanAudio).not.toHaveBeenCalled();
  });

  it('resolves hierarchical audio demand only for the LCS owner or standalone Nastawnia', async () => {
    const audioBreakdown = {
      dphIpDevices: 0,
      audioIpDevices: 1,
      cts220IpDevices: 0,
      ivrChannels: 0,
      conferenceChannels: 0
    };
    await BomResolverService.resolve({
      subsystemType: SubsystemType.SMOKIP_A,
      taskType: 'NASTAWNIA',
      isStandaloneNastawnia: false,
      audioBreakdown,
      configParams: {}
    });
    expect(mockResolveSlicanAudio).not.toHaveBeenCalled();

    await BomResolverService.resolve({
      subsystemType: SubsystemType.SMOKIP_A,
      taskType: 'NASTAWNIA',
      isStandaloneNastawnia: true,
      audioBreakdown,
      configParams: {}
    });
    expect(mockResolveSlicanAudio).toHaveBeenCalledTimes(1);

    mockResolveSlicanAudio.mockClear();
    await BomResolverService.resolve({
      subsystemType: SubsystemType.SMOKIP_A,
      audioBreakdown,
      configParams: {}
    });
    expect(mockResolveSlicanAudio).toHaveBeenCalledTimes(1);
  });
});
