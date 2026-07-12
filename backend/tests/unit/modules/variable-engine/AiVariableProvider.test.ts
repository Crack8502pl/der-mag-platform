/**
 * Unit tests – AiVariableProvider (PR-6)
 *
 * Covers:
 * - ai.summary
 * - ai.recommendation
 * - ai.risk.level
 * - ai.risk.score
 * - soft-fail on unknown fields
 * - soft-fail when entityId is missing or non-numeric
 * - soft-fail when data service returns undefined
 * - edge cases: entityId = 0, string numeric entityId
 */

import { AiVariableProvider } from '../../../../src/modules/variable-engine/providers/ai/AiVariableProvider';
import type { IAiDataService, AiData } from '../../../../src/modules/variable-engine/providers/ai/IAiDataService';
import type { VariableContext } from '../../../../src/modules/variable-engine/contracts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_DATA: AiData = {
  summary: 'Project is on track with minor delays in fiber installation.',
  recommendation: 'Prioritise fiber backbone completion before Q3.',
  riskLevel: 'medium',
  riskScore: 45,
};

function makeService(data: AiData = DEFAULT_DATA): IAiDataService {
  return {
    getAiData: jest.fn().mockResolvedValue(data),
  };
}

function makeServiceReturningNoData(): IAiDataService {
  return {
    getAiData: jest.fn().mockResolvedValue(undefined),
  };
}

function ctx(entityId: number | string | undefined, entityType = 'contract'): VariableContext {
  return { entityId, entityType };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AiVariableProvider', () => {
  // ── Contract ─────────────────────────────────────────────────────────────────

  it('declares the "ai" namespace', () => {
    const provider = new AiVariableProvider(makeService());
    expect(provider.namespaces).toContain('ai');
  });

  // ── ai.summary ────────────────────────────────────────────────────────────────

  describe('ai.summary', () => {
    it('returns AI summary', async () => {
      const provider = new AiVariableProvider(makeService());
      expect(await provider.resolve('ai.summary', ctx(1))).toBe(
        'Project is on track with minor delays in fiber installation.'
      );
    });

    it('passes entityId and entityType to the service', async () => {
      const service = makeService();
      const provider = new AiVariableProvider(service);
      await provider.resolve('ai.summary', ctx(2, 'task'));
      expect(service.getAiData).toHaveBeenCalledWith(2, 'task');
    });

    it('accepts a string numeric entityId', async () => {
      const service = makeService();
      const provider = new AiVariableProvider(service);
      expect(await provider.resolve('ai.summary', ctx('8'))).toBe(
        'Project is on track with minor delays in fiber installation.'
      );
      expect(service.getAiData).toHaveBeenCalledWith(8, 'contract');
    });
  });

  // ── ai.recommendation ────────────────────────────────────────────────────────

  describe('ai.recommendation', () => {
    it('returns AI recommendation', async () => {
      const provider = new AiVariableProvider(makeService());
      expect(await provider.resolve('ai.recommendation', ctx(1))).toBe(
        'Prioritise fiber backbone completion before Q3.'
      );
    });
  });

  // ── ai.risk.level ─────────────────────────────────────────────────────────────

  describe('ai.risk.level', () => {
    it('returns risk level label', async () => {
      const provider = new AiVariableProvider(makeService());
      expect(await provider.resolve('ai.risk.level', ctx(1))).toBe('medium');
    });
  });

  // ── ai.risk.score ─────────────────────────────────────────────────────────────

  describe('ai.risk.score', () => {
    it('returns numeric risk score', async () => {
      const provider = new AiVariableProvider(makeService());
      expect(await provider.resolve('ai.risk.score', ctx(1))).toBe(45);
    });
  });

  // ── Soft-fail cases ───────────────────────────────────────────────────────────

  describe('soft-fail', () => {
    it('returns undefined for an unknown field', async () => {
      const provider = new AiVariableProvider(makeService());
      expect(await provider.resolve('ai.unknown', ctx(1))).toBeUndefined();
    });

    it('returns undefined for a partial field match', async () => {
      const provider = new AiVariableProvider(makeService());
      expect(await provider.resolve('ai.risk', ctx(1))).toBeUndefined();
    });

    it('returns undefined when entityId is missing', async () => {
      const provider = new AiVariableProvider(makeService());
      expect(await provider.resolve('ai.summary', ctx(undefined))).toBeUndefined();
    });

    it('returns undefined when entityId is a non-numeric string', async () => {
      const provider = new AiVariableProvider(makeService());
      expect(await provider.resolve('ai.summary', ctx('not-a-number'))).toBeUndefined();
    });

    it('returns undefined when the data service returns undefined', async () => {
      const provider = new AiVariableProvider(makeServiceReturningNoData());
      expect(await provider.resolve('ai.summary', ctx(1))).toBeUndefined();
    });

    it('returns undefined for an expression with no field segment', async () => {
      const provider = new AiVariableProvider(makeService());
      expect(await provider.resolve('ai', ctx(1))).toBeUndefined();
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles entityId = 0', async () => {
      const service = makeService();
      const provider = new AiVariableProvider(service);
      await provider.resolve('ai.summary', ctx(0));
      expect(service.getAiData).toHaveBeenCalledWith(0, 'contract');
    });

    it('uses empty string as entityType when not provided in context', async () => {
      const service = makeService();
      const provider = new AiVariableProvider(service);
      await provider.resolve('ai.risk.score', { entityId: 1 });
      expect(service.getAiData).toHaveBeenCalledWith(1, '');
    });

    it('service is called only once per resolve call', async () => {
      const service = makeService();
      const provider = new AiVariableProvider(service);
      await provider.resolve('ai.recommendation', ctx(1));
      expect(service.getAiData).toHaveBeenCalledTimes(1);
    });
  });
});
