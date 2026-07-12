/**
 * Unit tests – SwitchVariableProvider (PR-5)
 *
 * Covers:
 * - switch.total
 * - switch.total.poe
 * - switch.total.managed
 * - switch.ports.total
 * - switch.ports.poe
 * - soft-fail on unknown fields
 * - soft-fail when entityId is missing or non-numeric
 * - soft-fail when data service returns undefined
 * - edge cases: entityId = 0, string numeric entityId
 */

import { SwitchVariableProvider } from '../../../../src/modules/variable-engine/providers/switch/SwitchVariableProvider';
import type { ISwitchDataService, SwitchData } from '../../../../src/modules/variable-engine/providers/switch/ISwitchDataService';
import type { VariableContext } from '../../../../src/modules/variable-engine/contracts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_DATA: SwitchData = {
  total: 5,
  totalPoe: 3,
  totalPorts: 120,
  totalPoePorts: 72,
  managed: 2,
};

function makeService(data: SwitchData = DEFAULT_DATA): ISwitchDataService {
  return {
    getSwitchData: jest.fn().mockResolvedValue(data),
  };
}

function makeServiceReturningNoData(): ISwitchDataService {
  return {
    getSwitchData: jest.fn().mockResolvedValue(undefined),
  };
}

function ctx(entityId: number | string | undefined, entityType = 'subsystem'): VariableContext {
  return { entityId, entityType };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SwitchVariableProvider', () => {
  // ── Contract ─────────────────────────────────────────────────────────────────

  it('declares the "switch" namespace', () => {
    const provider = new SwitchVariableProvider(makeService());
    expect(provider.namespaces).toContain('switch');
  });

  // ── switch.total ─────────────────────────────────────────────────────────────

  describe('switch.total', () => {
    it('returns total switch count', async () => {
      const provider = new SwitchVariableProvider(makeService());
      expect(await provider.resolve('switch.total', ctx(1))).toBe(5);
    });

    it('passes entityId and entityType to the service', async () => {
      const service = makeService();
      const provider = new SwitchVariableProvider(service);
      await provider.resolve('switch.total', ctx(3, 'contract'));
      expect(service.getSwitchData).toHaveBeenCalledWith(3, 'contract');
    });

    it('accepts a string numeric entityId', async () => {
      const service = makeService();
      const provider = new SwitchVariableProvider(service);
      expect(await provider.resolve('switch.total', ctx('9'))).toBe(5);
      expect(service.getSwitchData).toHaveBeenCalledWith(9, 'subsystem');
    });
  });

  // ── switch.total.poe ─────────────────────────────────────────────────────────

  describe('switch.total.poe', () => {
    it('returns PoE switch count', async () => {
      const provider = new SwitchVariableProvider(makeService());
      expect(await provider.resolve('switch.total.poe', ctx(1))).toBe(3);
    });
  });

  // ── switch.total.managed ──────────────────────────────────────────────────────

  describe('switch.total.managed', () => {
    it('returns managed switch count', async () => {
      const provider = new SwitchVariableProvider(makeService());
      expect(await provider.resolve('switch.total.managed', ctx(1))).toBe(2);
    });
  });

  // ── switch.ports.total ────────────────────────────────────────────────────────

  describe('switch.ports.total', () => {
    it('returns total port count', async () => {
      const provider = new SwitchVariableProvider(makeService());
      expect(await provider.resolve('switch.ports.total', ctx(1))).toBe(120);
    });
  });

  // ── switch.ports.poe ─────────────────────────────────────────────────────────

  describe('switch.ports.poe', () => {
    it('returns PoE port count', async () => {
      const provider = new SwitchVariableProvider(makeService());
      expect(await provider.resolve('switch.ports.poe', ctx(1))).toBe(72);
    });
  });

  // ── Soft-fail cases ───────────────────────────────────────────────────────────

  describe('soft-fail', () => {
    it('returns undefined for an unknown field', async () => {
      const provider = new SwitchVariableProvider(makeService());
      expect(await provider.resolve('switch.unknown', ctx(1))).toBeUndefined();
    });

    it('returns undefined when entityId is missing', async () => {
      const provider = new SwitchVariableProvider(makeService());
      expect(await provider.resolve('switch.total', ctx(undefined))).toBeUndefined();
    });

    it('returns undefined when entityId is a non-numeric string', async () => {
      const provider = new SwitchVariableProvider(makeService());
      expect(await provider.resolve('switch.total', ctx('abc'))).toBeUndefined();
    });

    it('returns undefined when the data service returns undefined', async () => {
      const provider = new SwitchVariableProvider(makeServiceReturningNoData());
      expect(await provider.resolve('switch.total', ctx(1))).toBeUndefined();
    });

    it('returns undefined for an expression with no field segment', async () => {
      const provider = new SwitchVariableProvider(makeService());
      expect(await provider.resolve('switch', ctx(1))).toBeUndefined();
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles entityId = 0', async () => {
      const service = makeService();
      const provider = new SwitchVariableProvider(service);
      await provider.resolve('switch.total', ctx(0));
      expect(service.getSwitchData).toHaveBeenCalledWith(0, 'subsystem');
    });

    it('uses empty string as entityType when not provided in context', async () => {
      const service = makeService();
      const provider = new SwitchVariableProvider(service);
      await provider.resolve('switch.total', { entityId: 1 });
      expect(service.getSwitchData).toHaveBeenCalledWith(1, '');
    });

    it('service is called only once per resolve call', async () => {
      const service = makeService();
      const provider = new SwitchVariableProvider(service);
      await provider.resolve('switch.total', ctx(1));
      expect(service.getSwitchData).toHaveBeenCalledTimes(1);
    });
  });
});
