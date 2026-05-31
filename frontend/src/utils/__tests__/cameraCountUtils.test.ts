import { describe, expect, it } from 'vitest';
import { extractCameraCount, sumCamerasFromConfigValues } from '../cameraCountUtils';

describe('cameraCountUtils', () => {
  describe('sumCamerasFromConfigValues', () => {
    it('sums only camera-like numeric keys and ignores model/selected keys', () => {
      const result = sumCamerasFromConfigValues({
        Kamera_iloscKamerOgolnych: 6,
        LPR_iloscKamerLPR: '2',
        Kamera_selectedModels: 999,
        Kamera_modelType: 777,
        Inne_iloscSlupow: 10,
      });

      expect(result).toBe(8);
    });

    it('returns 0 for invalid values', () => {
      expect(sumCamerasFromConfigValues({ abc: 1, kameraA: -2, kameraB: 'x' })).toBe(0);
    });
  });

  describe('extractCameraCount', () => {
    it('uses live configValues first for LCS SMOKIP_A', () => {
      const count = extractCameraCount({
        taskTypeCode: 'LCS',
        subsystemType: 'SMOKIP_A',
        configValues: { Kamera_iloscKamerOgolnych: 6, LPR_iloscKamerLPR: 2 },
        metadata: { lcsConfig: { iloscKamer: 1 } },
        isStandaloneNastawnia: false,
      });
      expect(count).toBe(8);
    });

    it('falls back to metadata lcsConfig.iloscKamer for LCS SMOKIP_A', () => {
      const count = extractCameraCount({
        taskTypeCode: 'LCS',
        subsystemType: 'SMOKIP_A',
        configValues: {},
        metadata: { lcsConfig: { iloscKamer: 9 } },
        isStandaloneNastawnia: false,
      });
      expect(count).toBe(9);
    });

    it('uses serwerObrazu.maxKamer for LCS SMOKIP_B', () => {
      const count = extractCameraCount({
        taskTypeCode: 'LCS',
        subsystemType: 'SMOKIP_B',
        configValues: {},
        metadata: { lcsConfig: { serwerObrazu: { maxKamer: 12 } } },
        isStandaloneNastawnia: false,
      });
      expect(count).toBe(12);
    });

    it('handles standalone NASTAWNIA', () => {
      const count = extractCameraCount({
        taskTypeCode: 'NASTAWNIA',
        subsystemType: 'SMOKIP_A',
        configValues: {},
        metadata: { nastawniConfig: { iloscKamer: 4 } },
        isStandaloneNastawnia: true,
      });
      expect(count).toBe(4);
    });

    it('handles subordinate NASTAWNIA by assigned cameras length', () => {
      const count = extractCameraCount({
        taskTypeCode: 'NASTAWNIA',
        subsystemType: 'SMOKIP_A',
        configValues: {},
        metadata: { nastawniConfig: { stacjaOperatorska: { przypisaneKamery: [1, 2, 3] } } },
        isStandaloneNastawnia: false,
      });
      expect(count).toBe(3);
    });

    it('returns 0 for empty data', () => {
      const count = extractCameraCount({
        taskTypeCode: '',
        subsystemType: '',
        configValues: {},
        metadata: {},
        isStandaloneNastawnia: false,
      });
      expect(count).toBe(0);
    });

    it('never throws on garbage/null-like input', () => {
      expect(() =>
        extractCameraCount({
          taskTypeCode: 'LCS',
          subsystemType: 'SMOKIP_A',
          configValues: null as unknown as Record<string, unknown>,
          metadata: undefined as unknown as Record<string, unknown>,
          isStandaloneNastawnia: false,
        })
      ).not.toThrow();
    });
  });
});
