/**
 * Unit tests – ContractVariableProvider (PR-6)
 *
 * Covers:
 * - contract.number
 * - contract.status
 * - contract.customer.name
 * - contract.customer.nip
 * - contract.value.net
 * - contract.value.gross
 * - contract.date.start
 * - contract.date.end
 * - soft-fail on unknown fields
 * - soft-fail when entityId is missing or non-numeric
 * - soft-fail when data service returns undefined
 * - edge cases: entityId = 0, string numeric entityId
 */

import { ContractVariableProvider } from '../../../../src/modules/variable-engine/providers/contract/ContractVariableProvider';
import type { IContractDataService, ContractData } from '../../../../src/modules/variable-engine/providers/contract/IContractDataService';
import type { VariableContext } from '../../../../src/modules/variable-engine/contracts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_DATA: ContractData = {
  number: 'CNT-2024-001',
  status: 'active',
  customerName: 'Acme Corp',
  customerNip: '1234567890',
  valueNet: 100000,
  valueGross: 123000,
  dateStart: '2024-01-01',
  dateEnd: '2024-12-31',
};

function makeService(data: ContractData = DEFAULT_DATA): IContractDataService {
  return {
    getContractData: jest.fn().mockResolvedValue(data),
  };
}

function makeServiceReturningNoData(): IContractDataService {
  return {
    getContractData: jest.fn().mockResolvedValue(undefined),
  };
}

function ctx(entityId: number | string | undefined, entityType = 'contract'): VariableContext {
  return { entityId, entityType };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ContractVariableProvider', () => {
  // ── Contract ─────────────────────────────────────────────────────────────────

  it('declares the "contract" namespace', () => {
    const provider = new ContractVariableProvider(makeService());
    expect(provider.namespaces).toContain('contract');
  });

  // ── contract.number ───────────────────────────────────────────────────────────

  describe('contract.number', () => {
    it('returns contract number', async () => {
      const provider = new ContractVariableProvider(makeService());
      expect(await provider.resolve('contract.number', ctx(1))).toBe('CNT-2024-001');
    });

    it('passes entityId and entityType to the service', async () => {
      const service = makeService();
      const provider = new ContractVariableProvider(service);
      await provider.resolve('contract.number', ctx(5, 'contract'));
      expect(service.getContractData).toHaveBeenCalledWith(5, 'contract');
    });

    it('accepts a string numeric entityId', async () => {
      const service = makeService();
      const provider = new ContractVariableProvider(service);
      expect(await provider.resolve('contract.number', ctx('7'))).toBe('CNT-2024-001');
      expect(service.getContractData).toHaveBeenCalledWith(7, 'contract');
    });
  });

  // ── contract.status ───────────────────────────────────────────────────────────

  describe('contract.status', () => {
    it('returns contract status', async () => {
      const provider = new ContractVariableProvider(makeService());
      expect(await provider.resolve('contract.status', ctx(1))).toBe('active');
    });
  });

  // ── contract.customer.name ───────────────────────────────────────────────────

  describe('contract.customer.name', () => {
    it('returns customer name', async () => {
      const provider = new ContractVariableProvider(makeService());
      expect(await provider.resolve('contract.customer.name', ctx(1))).toBe('Acme Corp');
    });
  });

  // ── contract.customer.nip ────────────────────────────────────────────────────

  describe('contract.customer.nip', () => {
    it('returns customer NIP', async () => {
      const provider = new ContractVariableProvider(makeService());
      expect(await provider.resolve('contract.customer.nip', ctx(1))).toBe('1234567890');
    });
  });

  // ── contract.value.net ───────────────────────────────────────────────────────

  describe('contract.value.net', () => {
    it('returns net contract value', async () => {
      const provider = new ContractVariableProvider(makeService());
      expect(await provider.resolve('contract.value.net', ctx(1))).toBe(100000);
    });
  });

  // ── contract.value.gross ─────────────────────────────────────────────────────

  describe('contract.value.gross', () => {
    it('returns gross contract value', async () => {
      const provider = new ContractVariableProvider(makeService());
      expect(await provider.resolve('contract.value.gross', ctx(1))).toBe(123000);
    });
  });

  // ── contract.date.start ──────────────────────────────────────────────────────

  describe('contract.date.start', () => {
    it('returns contract start date', async () => {
      const provider = new ContractVariableProvider(makeService());
      expect(await provider.resolve('contract.date.start', ctx(1))).toBe('2024-01-01');
    });
  });

  // ── contract.date.end ────────────────────────────────────────────────────────

  describe('contract.date.end', () => {
    it('returns contract end date', async () => {
      const provider = new ContractVariableProvider(makeService());
      expect(await provider.resolve('contract.date.end', ctx(1))).toBe('2024-12-31');
    });
  });

  // ── Soft-fail cases ───────────────────────────────────────────────────────────

  describe('soft-fail', () => {
    it('returns undefined for an unknown field', async () => {
      const provider = new ContractVariableProvider(makeService());
      expect(await provider.resolve('contract.unknown', ctx(1))).toBeUndefined();
    });

    it('returns undefined for a partial field match', async () => {
      const provider = new ContractVariableProvider(makeService());
      expect(await provider.resolve('contract.customer', ctx(1))).toBeUndefined();
    });

    it('returns undefined when entityId is missing', async () => {
      const provider = new ContractVariableProvider(makeService());
      expect(await provider.resolve('contract.number', ctx(undefined))).toBeUndefined();
    });

    it('returns undefined when entityId is a non-numeric string', async () => {
      const provider = new ContractVariableProvider(makeService());
      expect(await provider.resolve('contract.number', ctx('abc'))).toBeUndefined();
    });

    it('returns undefined when the data service returns undefined', async () => {
      const provider = new ContractVariableProvider(makeServiceReturningNoData());
      expect(await provider.resolve('contract.number', ctx(1))).toBeUndefined();
    });

    it('returns undefined for an expression with no field segment', async () => {
      const provider = new ContractVariableProvider(makeService());
      expect(await provider.resolve('contract', ctx(1))).toBeUndefined();
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles entityId = 0', async () => {
      const service = makeService();
      const provider = new ContractVariableProvider(service);
      await provider.resolve('contract.number', ctx(0));
      expect(service.getContractData).toHaveBeenCalledWith(0, 'contract');
    });

    it('uses empty string as entityType when not provided in context', async () => {
      const service = makeService();
      const provider = new ContractVariableProvider(service);
      await provider.resolve('contract.number', { entityId: 1 });
      expect(service.getContractData).toHaveBeenCalledWith(1, '');
    });

    it('service is called only once per resolve call', async () => {
      const service = makeService();
      const provider = new ContractVariableProvider(service);
      await provider.resolve('contract.status', ctx(1));
      expect(service.getContractData).toHaveBeenCalledTimes(1);
    });
  });
});
