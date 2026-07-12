/**
 * Unit tests – IpVariableProvider (PR-5)
 *
 * Covers:
 * - ip.range
 * - ip.gateway
 * - ip.subnet.mask
 * - ip.hosts.total
 * - ip.hosts.used
 * - ip.hosts.free
 * - ip.first
 * - ip.last
 * - soft-fail on unknown fields
 * - soft-fail when entityId is missing or non-numeric
 * - soft-fail when data service returns undefined
 * - edge cases: entityId = 0, string numeric entityId
 */

import { IpVariableProvider } from '../../../../src/modules/variable-engine/providers/ip/IpVariableProvider';
import type { IIpDataService, IpData } from '../../../../src/modules/variable-engine/providers/ip/IIpDataService';
import type { VariableContext } from '../../../../src/modules/variable-engine/contracts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_DATA: IpData = {
  allocatedRange: '172.16.1.0/24',
  gateway: '172.16.1.1',
  subnetMask: '255.255.255.0',
  totalHosts: 254,
  usedHosts: 10,
  freeHosts: 244,
  firstUsableIp: '172.16.1.3',
  lastUsableIp: '172.16.1.254',
};

function makeService(data: IpData = DEFAULT_DATA): IIpDataService {
  return {
    getIpData: jest.fn().mockResolvedValue(data),
  };
}

function makeServiceReturningNoData(): IIpDataService {
  return {
    getIpData: jest.fn().mockResolvedValue(undefined),
  };
}

function ctx(entityId: number | string | undefined, entityType = 'subsystem'): VariableContext {
  return { entityId, entityType };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('IpVariableProvider', () => {
  // ── Contract ─────────────────────────────────────────────────────────────────

  it('declares the "ip" namespace', () => {
    const provider = new IpVariableProvider(makeService());
    expect(provider.namespaces).toContain('ip');
  });

  // ── ip.range ─────────────────────────────────────────────────────────────────

  describe('ip.range', () => {
    it('returns the allocated CIDR range', async () => {
      const provider = new IpVariableProvider(makeService());
      expect(await provider.resolve('ip.range', ctx(1))).toBe('172.16.1.0/24');
    });

    it('passes entityId and entityType to the service', async () => {
      const service = makeService();
      const provider = new IpVariableProvider(service);
      await provider.resolve('ip.range', ctx(2, 'contract'));
      expect(service.getIpData).toHaveBeenCalledWith(2, 'contract');
    });

    it('accepts a string numeric entityId', async () => {
      const service = makeService();
      const provider = new IpVariableProvider(service);
      expect(await provider.resolve('ip.range', ctx('15'))).toBe('172.16.1.0/24');
      expect(service.getIpData).toHaveBeenCalledWith(15, 'subsystem');
    });
  });

  // ── ip.gateway ───────────────────────────────────────────────────────────────

  describe('ip.gateway', () => {
    it('returns the gateway address', async () => {
      const provider = new IpVariableProvider(makeService());
      expect(await provider.resolve('ip.gateway', ctx(1))).toBe('172.16.1.1');
    });
  });

  // ── ip.subnet.mask ───────────────────────────────────────────────────────────

  describe('ip.subnet.mask', () => {
    it('returns the subnet mask', async () => {
      const provider = new IpVariableProvider(makeService());
      expect(await provider.resolve('ip.subnet.mask', ctx(1))).toBe('255.255.255.0');
    });
  });

  // ── ip.hosts.total ───────────────────────────────────────────────────────────

  describe('ip.hosts.total', () => {
    it('returns total host slots', async () => {
      const provider = new IpVariableProvider(makeService());
      expect(await provider.resolve('ip.hosts.total', ctx(1))).toBe(254);
    });
  });

  // ── ip.hosts.used ────────────────────────────────────────────────────────────

  describe('ip.hosts.used', () => {
    it('returns used host slots', async () => {
      const provider = new IpVariableProvider(makeService());
      expect(await provider.resolve('ip.hosts.used', ctx(1))).toBe(10);
    });
  });

  // ── ip.hosts.free ────────────────────────────────────────────────────────────

  describe('ip.hosts.free', () => {
    it('returns free host slots', async () => {
      const provider = new IpVariableProvider(makeService());
      expect(await provider.resolve('ip.hosts.free', ctx(1))).toBe(244);
    });
  });

  // ── ip.first ─────────────────────────────────────────────────────────────────

  describe('ip.first', () => {
    it('returns first usable IP', async () => {
      const provider = new IpVariableProvider(makeService());
      expect(await provider.resolve('ip.first', ctx(1))).toBe('172.16.1.3');
    });
  });

  // ── ip.last ──────────────────────────────────────────────────────────────────

  describe('ip.last', () => {
    it('returns last usable IP', async () => {
      const provider = new IpVariableProvider(makeService());
      expect(await provider.resolve('ip.last', ctx(1))).toBe('172.16.1.254');
    });
  });

  // ── Soft-fail cases ───────────────────────────────────────────────────────────

  describe('soft-fail', () => {
    it('returns undefined for an unknown field', async () => {
      const provider = new IpVariableProvider(makeService());
      expect(await provider.resolve('ip.unknown', ctx(1))).toBeUndefined();
    });

    it('returns undefined for a partially matching field', async () => {
      const provider = new IpVariableProvider(makeService());
      expect(await provider.resolve('ip.hosts', ctx(1))).toBeUndefined();
    });

    it('returns undefined when entityId is missing', async () => {
      const provider = new IpVariableProvider(makeService());
      expect(await provider.resolve('ip.range', ctx(undefined))).toBeUndefined();
    });

    it('returns undefined when entityId is a non-numeric string', async () => {
      const provider = new IpVariableProvider(makeService());
      expect(await provider.resolve('ip.range', ctx('abc'))).toBeUndefined();
    });

    it('returns undefined when the data service returns undefined', async () => {
      const provider = new IpVariableProvider(makeServiceReturningNoData());
      expect(await provider.resolve('ip.range', ctx(1))).toBeUndefined();
    });

    it('returns undefined for an expression with no field segment', async () => {
      const provider = new IpVariableProvider(makeService());
      expect(await provider.resolve('ip', ctx(1))).toBeUndefined();
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles entityId = 0', async () => {
      const service = makeService();
      const provider = new IpVariableProvider(service);
      await provider.resolve('ip.range', ctx(0));
      expect(service.getIpData).toHaveBeenCalledWith(0, 'subsystem');
    });

    it('uses empty string as entityType when not provided in context', async () => {
      const service = makeService();
      const provider = new IpVariableProvider(service);
      await provider.resolve('ip.gateway', { entityId: 1 });
      expect(service.getIpData).toHaveBeenCalledWith(1, '');
    });

    it('service is called only once per resolve call', async () => {
      const service = makeService();
      const provider = new IpVariableProvider(service);
      await provider.resolve('ip.hosts.total', ctx(1));
      expect(service.getIpData).toHaveBeenCalledTimes(1);
    });
  });
});
