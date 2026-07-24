/**
 * Unit tests – CameraVariableProvider (PR-5)
 *
 * Covers:
 * - camera.total
 * - camera.total.ip
 * - camera.ip.total (legacy alias)
 * - camera.total.ip.ogolna
 * - camera.total.ip.lpr
 * - camera.total.ip.skp
 * - camera.total.analog
 * - camera.storage.tb
 * - camera.recording.days
 * - camera.bitrate.mbps
 * - soft-fail on unknown fields
 * - soft-fail when entityId is missing or non-numeric
 * - soft-fail when data service returns undefined
 * - edge cases: entityId = 0, string numeric entityId
 */

import { CameraVariableProvider } from '../../../../src/modules/variable-engine/providers/camera/CameraVariableProvider';
import type { ICameraDataService, CameraData } from '../../../../src/modules/variable-engine/providers/camera/ICameraDataService';
import type { VariableContext } from '../../../../src/modules/variable-engine/contracts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_DATA: CameraData = {
  total: 10,
  totalIp: 8,
  totalIpOgolna: 5,
  totalIpLpr: 2,
  totalIpSkp: 1,
  totalAnalog: 2,
  storageTb: 12.5,
  recordingDays: 30,
  bitrateMbps: 4.0,
};

function makeService(data: CameraData = DEFAULT_DATA): ICameraDataService {
  return {
    getCameraData: jest.fn().mockResolvedValue(data),
  };
}

function makeServiceReturningNoData(): ICameraDataService {
  return {
    getCameraData: jest.fn().mockResolvedValue(undefined),
  };
}

function ctx(entityId: number | string | undefined, entityType = 'subsystem'): VariableContext {
  return { entityId, entityType };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CameraVariableProvider', () => {
  // ── Contract ─────────────────────────────────────────────────────────────────

  it('declares the "camera" namespace', () => {
    const provider = new CameraVariableProvider(makeService());
    expect(provider.namespaces).toContain('camera');
  });

  // ── camera.total ─────────────────────────────────────────────────────────────

  describe('camera.total', () => {
    it('returns total camera count', async () => {
      const provider = new CameraVariableProvider(makeService());
      expect(await provider.resolve('camera.total', ctx(1))).toBe(10);
    });

    it('passes entityId and entityType to the service', async () => {
      const service = makeService();
      const provider = new CameraVariableProvider(service);
      await provider.resolve('camera.total', ctx(5, 'contract'));
      expect(service.getCameraData).toHaveBeenCalledWith(5, 'contract');
    });

    it('accepts a string numeric entityId', async () => {
      const service = makeService();
      const provider = new CameraVariableProvider(service);
      expect(await provider.resolve('camera.total', ctx('7'))).toBe(10);
      expect(service.getCameraData).toHaveBeenCalledWith(7, 'subsystem');
    });
  });

  // ── camera.total.ip ──────────────────────────────────────────────────────────

  describe('camera.total.ip', () => {
    it('returns IP camera count', async () => {
      const provider = new CameraVariableProvider(makeService());
      expect(await provider.resolve('camera.total.ip', ctx(1))).toBe(8);
    });
  });

  describe('camera.ip.total', () => {
    it('returns IP camera count for legacy alias', async () => {
      const provider = new CameraVariableProvider(makeService());
      expect(await provider.resolve('camera.ip.total', ctx(1))).toBe(8);
    });
  });

  // ── camera.total.ip.ogolna ───────────────────────────────────────────────────

  describe('camera.total.ip.ogolna', () => {
    it('returns general-purpose IP camera count', async () => {
      const provider = new CameraVariableProvider(makeService());
      expect(await provider.resolve('camera.total.ip.ogolna', ctx(1))).toBe(5);
    });
  });

  // ── camera.total.ip.lpr ──────────────────────────────────────────────────────

  describe('camera.total.ip.lpr', () => {
    it('returns LPR IP camera count', async () => {
      const provider = new CameraVariableProvider(makeService());
      expect(await provider.resolve('camera.total.ip.lpr', ctx(1))).toBe(2);
    });
  });

  // ── camera.total.ip.skp ──────────────────────────────────────────────────────

  describe('camera.total.ip.skp', () => {
    it('returns SKP IP camera count', async () => {
      const provider = new CameraVariableProvider(makeService());
      expect(await provider.resolve('camera.total.ip.skp', ctx(1))).toBe(1);
    });
  });

  // ── camera.total.analog ───────────────────────────────────────────────────────

  describe('camera.total.analog', () => {
    it('returns analog camera count', async () => {
      const provider = new CameraVariableProvider(makeService());
      expect(await provider.resolve('camera.total.analog', ctx(1))).toBe(2);
    });
  });

  // ── camera.storage.tb ────────────────────────────────────────────────────────

  describe('camera.storage.tb', () => {
    it('returns required storage in TB', async () => {
      const provider = new CameraVariableProvider(makeService());
      expect(await provider.resolve('camera.storage.tb', ctx(1))).toBe(12.5);
    });
  });

  // ── camera.recording.days ────────────────────────────────────────────────────

  describe('camera.recording.days', () => {
    it('returns recording retention in days', async () => {
      const provider = new CameraVariableProvider(makeService());
      expect(await provider.resolve('camera.recording.days', ctx(1))).toBe(30);
    });
  });

  // ── camera.bitrate.mbps ──────────────────────────────────────────────────────

  describe('camera.bitrate.mbps', () => {
    it('returns average bitrate in Mbps', async () => {
      const provider = new CameraVariableProvider(makeService());
      expect(await provider.resolve('camera.bitrate.mbps', ctx(1))).toBe(4.0);
    });
  });

  // ── Soft-fail cases ───────────────────────────────────────────────────────────

  describe('soft-fail', () => {
    it('returns undefined for an unknown field', async () => {
      const provider = new CameraVariableProvider(makeService());
      expect(await provider.resolve('camera.unknown', ctx(1))).toBeUndefined();
    });

    it('returns undefined when entityId is missing', async () => {
      const provider = new CameraVariableProvider(makeService());
      expect(await provider.resolve('camera.total', ctx(undefined))).toBeUndefined();
    });

    it('returns undefined when entityId is a non-numeric string', async () => {
      const provider = new CameraVariableProvider(makeService());
      expect(await provider.resolve('camera.total', ctx('abc'))).toBeUndefined();
    });

    it('returns undefined when the data service returns undefined', async () => {
      const provider = new CameraVariableProvider(makeServiceReturningNoData());
      expect(await provider.resolve('camera.total', ctx(1))).toBeUndefined();
    });

    it('returns undefined for an expression with no field segment', async () => {
      const provider = new CameraVariableProvider(makeService());
      expect(await provider.resolve('camera', ctx(1))).toBeUndefined();
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles entityId = 0', async () => {
      const service = makeService();
      const provider = new CameraVariableProvider(service);
      await provider.resolve('camera.total', ctx(0));
      expect(service.getCameraData).toHaveBeenCalledWith(0, 'subsystem');
    });

    it('uses empty string as entityType when not provided in context', async () => {
      const service = makeService();
      const provider = new CameraVariableProvider(service);
      await provider.resolve('camera.total', { entityId: 1 });
      expect(service.getCameraData).toHaveBeenCalledWith(1, '');
    });

    it('service is called only once per resolve call', async () => {
      const service = makeService();
      const provider = new CameraVariableProvider(service);
      await provider.resolve('camera.total', ctx(1));
      expect(service.getCameraData).toHaveBeenCalledTimes(1);
    });
  });
});
