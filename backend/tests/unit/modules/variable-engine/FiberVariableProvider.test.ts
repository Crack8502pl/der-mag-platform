/**
 * Unit tests – FiberVariableProvider (PR-5)
 *
 * Covers:
 * - fiber.length.total
 * - fiber.strands.total
 * - fiber.connections.total
 * - fiber.connections.duplex
 * - fiber.connections.wdm
 * - soft-fail on unknown fields
 * - soft-fail when entityId is missing or non-numeric
 * - soft-fail when data service returns undefined
 * - edge cases: entityId = 0, string numeric entityId
 */

import { FiberVariableProvider } from '../../../../src/modules/variable-engine/providers/fiber/FiberVariableProvider';
import type { IFiberDataService, FiberData } from '../../../../src/modules/variable-engine/providers/fiber/IFiberDataService';
import type { VariableContext } from '../../../../src/modules/variable-engine/contracts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_DATA: FiberData = {
  lengthKm: 15.4,
  strandCount: 24,
  connectionCount: 6,
  duplexCount: 4,
  wdmCount: 2,
};

function makeService(data: FiberData = DEFAULT_DATA): IFiberDataService {
  return {
    getFiberData: jest.fn().mockResolvedValue(data),
  };
}

function makeServiceReturningNoData(): IFiberDataService {
  return {
    getFiberData: jest.fn().mockResolvedValue(undefined),
  };
}

function ctx(entityId: number | string | undefined, entityType = 'subsystem'): VariableContext {
  return { entityId, entityType };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FiberVariableProvider', () => {
  // ── Contract ─────────────────────────────────────────────────────────────────

  it('declares the "fiber" namespace', () => {
    const provider = new FiberVariableProvider(makeService());
    expect(provider.namespaces).toContain('fiber');
  });

  // ── fiber.length.total ───────────────────────────────────────────────────────

  describe('fiber.length.total', () => {
    it('returns total cable length in km', async () => {
      const provider = new FiberVariableProvider(makeService());
      expect(await provider.resolve('fiber.length.total', ctx(1))).toBe(15.4);
    });

    it('passes entityId and entityType to the service', async () => {
      const service = makeService();
      const provider = new FiberVariableProvider(service);
      await provider.resolve('fiber.length.total', ctx(4, 'contract'));
      expect(service.getFiberData).toHaveBeenCalledWith(4, 'contract');
    });

    it('accepts a string numeric entityId', async () => {
      const service = makeService();
      const provider = new FiberVariableProvider(service);
      expect(await provider.resolve('fiber.length.total', ctx('12'))).toBe(15.4);
      expect(service.getFiberData).toHaveBeenCalledWith(12, 'subsystem');
    });
  });

  // ── fiber.strands.total ──────────────────────────────────────────────────────

  describe('fiber.strands.total', () => {
    it('returns total fiber strand count', async () => {
      const provider = new FiberVariableProvider(makeService());
      expect(await provider.resolve('fiber.strands.total', ctx(1))).toBe(24);
    });
  });

  // ── fiber.connections.total ───────────────────────────────────────────────────

  describe('fiber.connections.total', () => {
    it('returns total connection count', async () => {
      const provider = new FiberVariableProvider(makeService());
      expect(await provider.resolve('fiber.connections.total', ctx(1))).toBe(6);
    });
  });

  // ── fiber.connections.duplex ──────────────────────────────────────────────────

  describe('fiber.connections.duplex', () => {
    it('returns DUPLEX connection count', async () => {
      const provider = new FiberVariableProvider(makeService());
      expect(await provider.resolve('fiber.connections.duplex', ctx(1))).toBe(4);
    });
  });

  // ── fiber.connections.wdm ─────────────────────────────────────────────────────

  describe('fiber.connections.wdm', () => {
    it('returns WDM connection count', async () => {
      const provider = new FiberVariableProvider(makeService());
      expect(await provider.resolve('fiber.connections.wdm', ctx(1))).toBe(2);
    });
  });

  // ── Soft-fail cases ───────────────────────────────────────────────────────────

  describe('soft-fail', () => {
    it('returns undefined for an unknown field', async () => {
      const provider = new FiberVariableProvider(makeService());
      expect(await provider.resolve('fiber.unknown', ctx(1))).toBeUndefined();
    });

    it('returns undefined for a partially matching field', async () => {
      const provider = new FiberVariableProvider(makeService());
      expect(await provider.resolve('fiber.length', ctx(1))).toBeUndefined();
    });

    it('returns undefined when entityId is missing', async () => {
      const provider = new FiberVariableProvider(makeService());
      expect(await provider.resolve('fiber.length.total', ctx(undefined))).toBeUndefined();
    });

    it('returns undefined when entityId is a non-numeric string', async () => {
      const provider = new FiberVariableProvider(makeService());
      expect(await provider.resolve('fiber.length.total', ctx('abc'))).toBeUndefined();
    });

    it('returns undefined when the data service returns undefined', async () => {
      const provider = new FiberVariableProvider(makeServiceReturningNoData());
      expect(await provider.resolve('fiber.length.total', ctx(1))).toBeUndefined();
    });

    it('returns undefined for an expression with no field segment', async () => {
      const provider = new FiberVariableProvider(makeService());
      expect(await provider.resolve('fiber', ctx(1))).toBeUndefined();
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles entityId = 0', async () => {
      const service = makeService();
      const provider = new FiberVariableProvider(service);
      await provider.resolve('fiber.length.total', ctx(0));
      expect(service.getFiberData).toHaveBeenCalledWith(0, 'subsystem');
    });

    it('uses empty string as entityType when not provided in context', async () => {
      const service = makeService();
      const provider = new FiberVariableProvider(service);
      await provider.resolve('fiber.length.total', { entityId: 1 });
      expect(service.getFiberData).toHaveBeenCalledWith(1, '');
    });

    it('service is called only once per resolve call', async () => {
      const service = makeService();
      const provider = new FiberVariableProvider(service);
      await provider.resolve('fiber.strands.total', ctx(1));
      expect(service.getFiberData).toHaveBeenCalledTimes(1);
    });
  });
});
