/**
 * Unit tests – UserVariableProvider (PR-6)
 *
 * Covers:
 * - user.name
 * - user.email
 * - user.role
 * - soft-fail on unknown fields
 * - soft-fail when entityId is missing or non-numeric
 * - soft-fail when data service returns undefined
 * - edge cases: entityId = 0, string numeric entityId
 */

import { UserVariableProvider } from '../../../../src/modules/variable-engine/providers/user/UserVariableProvider';
import type { IUserDataService, UserData } from '../../../../src/modules/variable-engine/providers/user/IUserDataService';
import type { VariableContext } from '../../../../src/modules/variable-engine/contracts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_DATA: UserData = {
  name: 'Anna Nowak',
  email: 'anna.nowak@example.com',
  role: 'technician',
};

function makeService(data: UserData = DEFAULT_DATA): IUserDataService {
  return {
    getUserData: jest.fn().mockResolvedValue(data),
  };
}

function makeServiceReturningNoData(): IUserDataService {
  return {
    getUserData: jest.fn().mockResolvedValue(undefined),
  };
}

function ctx(entityId: number | string | undefined, entityType = 'contract'): VariableContext {
  return { entityId, entityType };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UserVariableProvider', () => {
  // ── Contract ─────────────────────────────────────────────────────────────────

  it('declares the "user" namespace', () => {
    const provider = new UserVariableProvider(makeService());
    expect(provider.namespaces).toContain('user');
  });

  // ── user.name ─────────────────────────────────────────────────────────────────

  describe('user.name', () => {
    it('returns user full name', async () => {
      const provider = new UserVariableProvider(makeService());
      expect(await provider.resolve('user.name', ctx(1))).toBe('Anna Nowak');
    });

    it('passes entityId and entityType to the service', async () => {
      const service = makeService();
      const provider = new UserVariableProvider(service);
      await provider.resolve('user.name', ctx(6, 'task'));
      expect(service.getUserData).toHaveBeenCalledWith(6, 'task');
    });

    it('accepts a string numeric entityId', async () => {
      const service = makeService();
      const provider = new UserVariableProvider(service);
      expect(await provider.resolve('user.name', ctx('3'))).toBe('Anna Nowak');
      expect(service.getUserData).toHaveBeenCalledWith(3, 'contract');
    });
  });

  // ── user.email ────────────────────────────────────────────────────────────────

  describe('user.email', () => {
    it('returns user email address', async () => {
      const provider = new UserVariableProvider(makeService());
      expect(await provider.resolve('user.email', ctx(1))).toBe('anna.nowak@example.com');
    });
  });

  // ── user.role ─────────────────────────────────────────────────────────────────

  describe('user.role', () => {
    it('returns user role', async () => {
      const provider = new UserVariableProvider(makeService());
      expect(await provider.resolve('user.role', ctx(1))).toBe('technician');
    });
  });

  // ── Soft-fail cases ───────────────────────────────────────────────────────────

  describe('soft-fail', () => {
    it('returns undefined for an unknown field', async () => {
      const provider = new UserVariableProvider(makeService());
      expect(await provider.resolve('user.unknown', ctx(1))).toBeUndefined();
    });

    it('returns undefined when entityId is missing', async () => {
      const provider = new UserVariableProvider(makeService());
      expect(await provider.resolve('user.name', ctx(undefined))).toBeUndefined();
    });

    it('returns undefined when entityId is a non-numeric string', async () => {
      const provider = new UserVariableProvider(makeService());
      expect(await provider.resolve('user.name', ctx('bad-id'))).toBeUndefined();
    });

    it('returns undefined when the data service returns undefined', async () => {
      const provider = new UserVariableProvider(makeServiceReturningNoData());
      expect(await provider.resolve('user.name', ctx(1))).toBeUndefined();
    });

    it('returns undefined for an expression with no field segment', async () => {
      const provider = new UserVariableProvider(makeService());
      expect(await provider.resolve('user', ctx(1))).toBeUndefined();
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles entityId = 0', async () => {
      const service = makeService();
      const provider = new UserVariableProvider(service);
      await provider.resolve('user.name', ctx(0));
      expect(service.getUserData).toHaveBeenCalledWith(0, 'contract');
    });

    it('uses empty string as entityType when not provided in context', async () => {
      const service = makeService();
      const provider = new UserVariableProvider(service);
      await provider.resolve('user.email', { entityId: 1 });
      expect(service.getUserData).toHaveBeenCalledWith(1, '');
    });

    it('service is called only once per resolve call', async () => {
      const service = makeService();
      const provider = new UserVariableProvider(service);
      await provider.resolve('user.role', ctx(1));
      expect(service.getUserData).toHaveBeenCalledTimes(1);
    });
  });
});
