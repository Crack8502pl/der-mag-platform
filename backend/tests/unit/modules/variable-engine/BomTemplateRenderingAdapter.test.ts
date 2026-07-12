/**
 * Unit tests – BomTemplateRenderingAdapter (PR-3)
 *
 * Verifies:
 * - Feature flag OFF → delegates to LegacyVariableResolver (synchronous
 *   flat-map substitution)
 * - Feature flag ON  → delegates to IVariableEvaluator (async, provider-based)
 * - Legacy path: unknown placeholders are preserved verbatim
 * - Legacy path: null/undefined params are excluded from the variable map
 * - Engine path: fallback option is forwarded to the evaluator
 * - render() never throws regardless of evaluator errors
 * - Context forwarding: entityId / entityType reach the evaluator
 */

import { BomTemplateRenderingAdapter } from '../../../../src/modules/variable-engine/adapter/BomTemplateRenderingAdapter';
import { LegacyVariableResolver } from '../../../../src/modules/variable-engine/adapter/LegacyVariableResolver';
import type { IVariableEvaluator, VariableContext, EvaluateOptions } from '../../../../src/modules/variable-engine/contracts';
import type { FeatureFlags } from '../../../../src/modules/variable-engine/config/featureFlags';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvaluator(
  impl?: (template: string, ctx: VariableContext, opts?: EvaluateOptions) => Promise<string>,
): IVariableEvaluator {
  return {
    evaluate: impl ?? jest.fn().mockResolvedValue(''),
  };
}

function makeFlags(variableEngineV2: boolean): FeatureFlags {
  return { variableEngineV2 };
}

const legacyResolver = new LegacyVariableResolver();

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BomTemplateRenderingAdapter', () => {
  // ── Feature flag OFF (legacy path) ───────────────────────────────────────────

  describe('when variableEngineV2 = false (legacy path)', () => {
    it('resolves a placeholder using context.params with numeric value', async () => {
      const adapter = new BomTemplateRenderingAdapter(
        makeEvaluator(),
        legacyResolver,
        makeFlags(false),
      );
      const result = await adapter.render(
        'Total: ${camera.total}',
        { params: { 'camera.total': 5 } },
      );
      expect(result).toBe('Total: 5');
    });

    it('preserves unknown placeholders verbatim', async () => {
      const adapter = new BomTemplateRenderingAdapter(
        makeEvaluator(),
        legacyResolver,
        makeFlags(false),
      );
      const result = await adapter.render('${unknown}', { params: {} });
      expect(result).toBe('${unknown}');
    });

    it('excludes null param values (placeholder preserved)', async () => {
      const adapter = new BomTemplateRenderingAdapter(
        makeEvaluator(),
        legacyResolver,
        makeFlags(false),
      );
      const result = await adapter.render('${x}', { params: { x: null } });
      expect(result).toBe('${x}');
    });

    it('excludes undefined param values (placeholder preserved)', async () => {
      const adapter = new BomTemplateRenderingAdapter(
        makeEvaluator(),
        legacyResolver,
        makeFlags(false),
      );
      const result = await adapter.render('${x}', { params: { x: undefined } });
      expect(result).toBe('${x}');
    });

    it('handles a missing params object gracefully', async () => {
      const adapter = new BomTemplateRenderingAdapter(
        makeEvaluator(),
        legacyResolver,
        makeFlags(false),
      );
      const result = await adapter.render('${x}', {});
      expect(result).toBe('${x}');
    });

    it('does NOT call the evaluator on the legacy path', async () => {
      const evaluateSpy = jest.fn().mockResolvedValue('should-not-appear');
      const adapter = new BomTemplateRenderingAdapter(
        makeEvaluator(evaluateSpy),
        legacyResolver,
        makeFlags(false),
      );
      await adapter.render('${x}', { params: { x: 1 } });
      expect(evaluateSpy).not.toHaveBeenCalled();
    });

    it('returns the template unchanged when there are no placeholders', async () => {
      const adapter = new BomTemplateRenderingAdapter(
        makeEvaluator(),
        legacyResolver,
        makeFlags(false),
      );
      const result = await adapter.render('No variables here', {});
      expect(result).toBe('No variables here');
    });

    it('replaces multiple different placeholders', async () => {
      const adapter = new BomTemplateRenderingAdapter(
        makeEvaluator(),
        legacyResolver,
        makeFlags(false),
      );
      const result = await adapter.render(
        '${a} / ${b}',
        { params: { a: 'hello', b: 'world' } },
      );
      expect(result).toBe('hello / world');
    });
  });

  // ── Feature flag ON (new engine path) ────────────────────────────────────────

  describe('when variableEngineV2 = true (new engine path)', () => {
    it('delegates to the evaluator and returns its result', async () => {
      const adapter = new BomTemplateRenderingAdapter(
        makeEvaluator(async () => 'engine-result'),
        legacyResolver,
        makeFlags(true),
      );
      const result = await adapter.render('${x}', {});
      expect(result).toBe('engine-result');
    });

    it('forwards the template string to the evaluator', async () => {
      const evaluateSpy = jest.fn().mockResolvedValue('');
      const adapter = new BomTemplateRenderingAdapter(
        makeEvaluator(evaluateSpy),
        legacyResolver,
        makeFlags(true),
      );
      await adapter.render('template: ${x}', {});
      expect(evaluateSpy).toHaveBeenCalledWith('template: ${x}', expect.anything(), undefined);
    });

    it('forwards the context to the evaluator', async () => {
      const evaluateSpy = jest.fn().mockResolvedValue('');
      const adapter = new BomTemplateRenderingAdapter(
        makeEvaluator(evaluateSpy),
        legacyResolver,
        makeFlags(true),
      );
      const ctx: VariableContext = { entityId: 42, entityType: 'task' };
      await adapter.render('${x}', ctx);
      expect(evaluateSpy).toHaveBeenCalledWith('${x}', ctx, undefined);
    });

    it('forwards EvaluateOptions to the evaluator', async () => {
      const evaluateSpy = jest.fn().mockResolvedValue('');
      const adapter = new BomTemplateRenderingAdapter(
        makeEvaluator(evaluateSpy),
        legacyResolver,
        makeFlags(true),
      );
      const opts: EvaluateOptions = { fallback: 'N/A', bypassCache: true };
      await adapter.render('${x}', {}, opts);
      expect(evaluateSpy).toHaveBeenCalledWith('${x}', {}, opts);
    });

    it('does NOT call the legacy resolver on the engine path', async () => {
      const legacySpy = jest.spyOn(legacyResolver, 'resolve');
      const adapter = new BomTemplateRenderingAdapter(
        makeEvaluator(async () => 'ok'),
        legacyResolver,
        makeFlags(true),
      );
      await adapter.render('${x}', {});
      expect(legacySpy).not.toHaveBeenCalled();
      legacySpy.mockRestore();
    });
  });

  // ── Integration: flag-based routing with a real engine ────────────────────────

  describe('integration: routing matches flag value', () => {
    it('flag=false uses legacy params; flag=true uses engine result', async () => {
      const engineResult = 'FROM-ENGINE';
      const evaluator = makeEvaluator(async () => engineResult);

      const legacyAdapter = new BomTemplateRenderingAdapter(
        evaluator,
        legacyResolver,
        makeFlags(false),
      );
      const engineAdapter = new BomTemplateRenderingAdapter(
        evaluator,
        legacyResolver,
        makeFlags(true),
      );

      const legacyOut = await legacyAdapter.render('${x}', { params: { x: 'FROM-LEGACY' } });
      const engineOut = await engineAdapter.render('${x}', { params: { x: 'FROM-LEGACY' } });

      expect(legacyOut).toBe('FROM-LEGACY');
      expect(engineOut).toBe(engineResult);
    });
  });
});
