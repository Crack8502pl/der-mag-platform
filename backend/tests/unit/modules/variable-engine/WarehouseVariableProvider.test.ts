/**
 * Unit tests – WarehouseVariableProvider (PR-6)
 *
 * Covers:
 * - warehouse.items.total
 * - warehouse.items.reserved
 * - warehouse.items.available
 * - warehouse.value.total
 * - warehouse.location
 * - soft-fail on unknown fields
 * - soft-fail when entityId is missing or non-numeric
 * - soft-fail when data service returns undefined
 * - edge cases: entityId = 0, string numeric entityId
 */

import { WarehouseVariableProvider } from '../../../../src/modules/variable-engine/providers/warehouse/WarehouseVariableProvider';
import type { IWarehouseDataService, WarehouseData } from '../../../../src/modules/variable-engine/providers/warehouse/IWarehouseDataService';
import type { VariableContext } from '../../../../src/modules/variable-engine/contracts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_DATA: WarehouseData = {
  itemsTotal: 250,
  itemsReserved: 80,
  itemsAvailable: 170,
  valueTotal: 45000,
  location: 'Building A / Room 3',
};

function makeService(data: WarehouseData = DEFAULT_DATA): IWarehouseDataService {
  return {
    getWarehouseData: jest.fn().mockResolvedValue(data),
  };
}

function makeServiceReturningNoData(): IWarehouseDataService {
  return {
    getWarehouseData: jest.fn().mockResolvedValue(undefined),
  };
}

function ctx(entityId: number | string | undefined, entityType = 'contract'): VariableContext {
  return { entityId, entityType };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WarehouseVariableProvider', () => {
  // ── Contract ─────────────────────────────────────────────────────────────────

  it('declares the "warehouse" namespace', () => {
    const provider = new WarehouseVariableProvider(makeService());
    expect(provider.namespaces).toContain('warehouse');
  });

  // ── warehouse.items.total ────────────────────────────────────────────────────

  describe('warehouse.items.total', () => {
    it('returns total item count', async () => {
      const provider = new WarehouseVariableProvider(makeService());
      expect(await provider.resolve('warehouse.items.total', ctx(1))).toBe(250);
    });

    it('passes entityId and entityType to the service', async () => {
      const service = makeService();
      const provider = new WarehouseVariableProvider(service);
      await provider.resolve('warehouse.items.total', ctx(3, 'subsystem'));
      expect(service.getWarehouseData).toHaveBeenCalledWith(3, 'subsystem');
    });

    it('accepts a string numeric entityId', async () => {
      const service = makeService();
      const provider = new WarehouseVariableProvider(service);
      expect(await provider.resolve('warehouse.items.total', ctx('9'))).toBe(250);
      expect(service.getWarehouseData).toHaveBeenCalledWith(9, 'contract');
    });
  });

  // ── warehouse.items.reserved ─────────────────────────────────────────────────

  describe('warehouse.items.reserved', () => {
    it('returns reserved item count', async () => {
      const provider = new WarehouseVariableProvider(makeService());
      expect(await provider.resolve('warehouse.items.reserved', ctx(1))).toBe(80);
    });
  });

  // ── warehouse.items.available ────────────────────────────────────────────────

  describe('warehouse.items.available', () => {
    it('returns available item count', async () => {
      const provider = new WarehouseVariableProvider(makeService());
      expect(await provider.resolve('warehouse.items.available', ctx(1))).toBe(170);
    });
  });

  // ── warehouse.value.total ────────────────────────────────────────────────────

  describe('warehouse.value.total', () => {
    it('returns total value of items', async () => {
      const provider = new WarehouseVariableProvider(makeService());
      expect(await provider.resolve('warehouse.value.total', ctx(1))).toBe(45000);
    });
  });

  // ── warehouse.location ───────────────────────────────────────────────────────

  describe('warehouse.location', () => {
    it('returns warehouse location', async () => {
      const provider = new WarehouseVariableProvider(makeService());
      expect(await provider.resolve('warehouse.location', ctx(1))).toBe('Building A / Room 3');
    });
  });

  // ── Soft-fail cases ───────────────────────────────────────────────────────────

  describe('soft-fail', () => {
    it('returns undefined for an unknown field', async () => {
      const provider = new WarehouseVariableProvider(makeService());
      expect(await provider.resolve('warehouse.unknown', ctx(1))).toBeUndefined();
    });

    it('returns undefined for a partial field match', async () => {
      const provider = new WarehouseVariableProvider(makeService());
      expect(await provider.resolve('warehouse.items', ctx(1))).toBeUndefined();
    });

    it('returns undefined when entityId is missing', async () => {
      const provider = new WarehouseVariableProvider(makeService());
      expect(await provider.resolve('warehouse.items.total', ctx(undefined))).toBeUndefined();
    });

    it('returns undefined when entityId is a non-numeric string', async () => {
      const provider = new WarehouseVariableProvider(makeService());
      expect(await provider.resolve('warehouse.items.total', ctx('xyz'))).toBeUndefined();
    });

    it('returns undefined when the data service returns undefined', async () => {
      const provider = new WarehouseVariableProvider(makeServiceReturningNoData());
      expect(await provider.resolve('warehouse.items.total', ctx(1))).toBeUndefined();
    });

    it('returns undefined for an expression with no field segment', async () => {
      const provider = new WarehouseVariableProvider(makeService());
      expect(await provider.resolve('warehouse', ctx(1))).toBeUndefined();
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles entityId = 0', async () => {
      const service = makeService();
      const provider = new WarehouseVariableProvider(service);
      await provider.resolve('warehouse.items.total', ctx(0));
      expect(service.getWarehouseData).toHaveBeenCalledWith(0, 'contract');
    });

    it('uses empty string as entityType when not provided in context', async () => {
      const service = makeService();
      const provider = new WarehouseVariableProvider(service);
      await provider.resolve('warehouse.location', { entityId: 1 });
      expect(service.getWarehouseData).toHaveBeenCalledWith(1, '');
    });

    it('service is called only once per resolve call', async () => {
      const service = makeService();
      const provider = new WarehouseVariableProvider(service);
      await provider.resolve('warehouse.items.reserved', ctx(1));
      expect(service.getWarehouseData).toHaveBeenCalledTimes(1);
    });
  });
});
