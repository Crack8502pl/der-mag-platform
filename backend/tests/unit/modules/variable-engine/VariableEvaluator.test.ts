/**
 * Unit tests – VariableEvaluator
 */

import { VariableEvaluator } from '../../../../src/modules/variable-engine/evaluator/VariableEvaluator';
import { VariableParser } from '../../../../src/modules/variable-engine/parser/VariableParser';
import { FallbackMode } from '../../../../src/modules/variable-engine/contracts';
import type { IVariableResolver, IVariableLogger, VariableContext, VariableValue } from '../../../../src/modules/variable-engine/contracts';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ctx: VariableContext = { entityId: 42, entityType: 'task' };

function makeResolver(map: Record<string, VariableValue>): IVariableResolver {
  return {
    resolve: jest.fn().mockImplementation(async (expr: string) => map[expr])
  };
}

function makeMockLogger(): jest.Mocked<IVariableLogger> {
  return {
    error: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn(),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('VariableEvaluator', () => {
  let parser: VariableParser;

  beforeEach(() => {
    parser = new VariableParser();
  });

  // ── No placeholders ───────────────────────────────────────────────────────────

  it('returns the template unchanged when there are no placeholders', async () => {
    const resolver = makeResolver({});
    const evaluator = new VariableEvaluator(parser, resolver);
    const result = await evaluator.evaluate('Hello world', ctx);
    expect(result).toBe('Hello world');
    expect(resolver.resolve).not.toHaveBeenCalled();
  });

  // ── Single substitution ───────────────────────────────────────────────────────

  it('substitutes a single placeholder with its resolved value', async () => {
    const resolver = makeResolver({ 'camera.total': 5 });
    const evaluator = new VariableEvaluator(parser, resolver);
    const result = await evaluator.evaluate('Cameras: ${camera.total}', ctx);
    expect(result).toBe('Cameras: 5');
  });

  it('substitutes a string value', async () => {
    const resolver = makeResolver({ 'contract.name': 'Projekt A' });
    const evaluator = new VariableEvaluator(parser, resolver);
    const result = await evaluator.evaluate('Contract: ${contract.name}', ctx);
    expect(result).toBe('Contract: Projekt A');
  });

  it('substitutes a boolean value as string', async () => {
    const resolver = makeResolver({ 'task.active': true });
    const evaluator = new VariableEvaluator(parser, resolver);
    const result = await evaluator.evaluate('Active: ${task.active}', ctx);
    expect(result).toBe('Active: true');
  });

  // ── Multiple substitutions ────────────────────────────────────────────────────

  it('substitutes multiple placeholders', async () => {
    const resolver = makeResolver({ 'a': 1, 'b': 2 });
    const evaluator = new VariableEvaluator(parser, resolver);
    const result = await evaluator.evaluate('${a} + ${b} = ${c}', ctx);
    expect(result).toBe('1 + 2 = ');
  });

  it('handles duplicate placeholders by resolving once per expression', async () => {
    const resolveFn = jest.fn().mockResolvedValue(99);
    const resolver: IVariableResolver = { resolve: resolveFn };
    const evaluator = new VariableEvaluator(parser, resolver);
    const result = await evaluator.evaluate('${x} and ${x}', ctx);
    expect(result).toBe('99 and 99');
    // resolve should be called once (deduplication)
    expect(resolveFn).toHaveBeenCalledTimes(1);
  });

  // ── Fallback – backward-compatible defaults ───────────────────────────────────

  it('uses empty string as default fallback for unresolved placeholders', async () => {
    const resolver = makeResolver({});
    const evaluator = new VariableEvaluator(parser, resolver);
    const result = await evaluator.evaluate('Value: ${missing}', ctx);
    expect(result).toBe('Value: ');
  });

  it('uses custom fallback string for unresolved placeholders', async () => {
    const resolver = makeResolver({});
    const evaluator = new VariableEvaluator(parser, resolver);
    const result = await evaluator.evaluate('Value: ${missing}', ctx, { fallback: 'N/A' });
    expect(result).toBe('Value: N/A');
  });

  it('replaces null resolved value with fallback', async () => {
    const resolver = makeResolver({ 'x': null });
    const evaluator = new VariableEvaluator(parser, resolver);
    const result = await evaluator.evaluate('${x}', ctx, { fallback: '-' });
    expect(result).toBe('-');
  });

  it('replaces undefined resolved value with fallback', async () => {
    const resolver = makeResolver({ 'y': undefined });
    const evaluator = new VariableEvaluator(parser, resolver);
    const result = await evaluator.evaluate('${y}', ctx, { fallback: '?' });
    expect(result).toBe('?');
  });

  // ── FallbackMode.EMPTY ────────────────────────────────────────────────────────

  it('FallbackMode.EMPTY replaces unresolved with empty string', async () => {
    const resolver = makeResolver({});
    const evaluator = new VariableEvaluator(parser, resolver);
    const result = await evaluator.evaluate('Value: ${missing}', ctx, {
      fallbackMode: FallbackMode.EMPTY,
    });
    expect(result).toBe('Value: ');
  });

  // ── FallbackMode.PRESERVE ─────────────────────────────────────────────────────

  it('FallbackMode.PRESERVE keeps the original ${expression} token when unresolved', async () => {
    const resolver = makeResolver({});
    const evaluator = new VariableEvaluator(parser, resolver);
    const result = await evaluator.evaluate('Value: ${missing.metric}', ctx, {
      fallbackMode: FallbackMode.PRESERVE,
    });
    expect(result).toBe('Value: ${missing.metric}');
  });

  it('FallbackMode.PRESERVE does not affect resolved expressions', async () => {
    const resolver = makeResolver({ 'camera.total': 7 });
    const evaluator = new VariableEvaluator(parser, resolver);
    const result = await evaluator.evaluate('Cameras: ${camera.total}, missing: ${x}', ctx, {
      fallbackMode: FallbackMode.PRESERVE,
    });
    expect(result).toBe('Cameras: 7, missing: ${x}');
  });

  // ── FallbackMode.CUSTOM ───────────────────────────────────────────────────────

  it('FallbackMode.CUSTOM uses the fallback string for unresolved expressions', async () => {
    const resolver = makeResolver({});
    const evaluator = new VariableEvaluator(parser, resolver);
    const result = await evaluator.evaluate('Value: ${missing}', ctx, {
      fallbackMode: FallbackMode.CUSTOM,
      fallback: 'N/A',
    });
    expect(result).toBe('Value: N/A');
  });

  it('FallbackMode.CUSTOM defaults to empty string when no fallback provided', async () => {
    const resolver = makeResolver({});
    const evaluator = new VariableEvaluator(parser, resolver);
    const result = await evaluator.evaluate('Value: ${missing}', ctx, {
      fallbackMode: FallbackMode.CUSTOM,
    });
    expect(result).toBe('Value: ');
  });

  // ── Logger / trace mode ───────────────────────────────────────────────────────

  it('calls logger.trace with token count when evaluating a template with placeholders', async () => {
    const logger = makeMockLogger();
    const resolver = makeResolver({ 'x': 1 });
    const evaluator = new VariableEvaluator(parser, resolver, logger);
    await evaluator.evaluate('${x}', ctx);
    expect(logger.trace).toHaveBeenCalledWith('Evaluating template', { tokenCount: 1 });
  });

  it('does not call logger when template has no placeholders', async () => {
    const logger = makeMockLogger();
    const resolver = makeResolver({});
    const evaluator = new VariableEvaluator(parser, resolver, logger);
    await evaluator.evaluate('no placeholders', ctx);
    expect(logger.trace).not.toHaveBeenCalled();
  });

  it('calls logger.trace when expression resolves to undefined', async () => {
    const logger = makeMockLogger();
    const resolver = makeResolver({});
    const evaluator = new VariableEvaluator(parser, resolver, logger);
    await evaluator.evaluate('${missing}', ctx);
    expect(logger.trace).toHaveBeenCalledWith(
      'Expression resolved to undefined – fallback will apply',
      expect.objectContaining({ expression: 'missing' })
    );
  });

  // ── Edge cases ────────────────────────────────────────────────────────────────

  it('handles empty template', async () => {
    const resolver = makeResolver({});
    const evaluator = new VariableEvaluator(parser, resolver);
    expect(await evaluator.evaluate('', ctx)).toBe('');
  });

  it('handles template that is only a placeholder', async () => {
    const resolver = makeResolver({ 'v': 'hello' });
    const evaluator = new VariableEvaluator(parser, resolver);
    expect(await evaluator.evaluate('${v}', ctx)).toBe('hello');
  });

  it('handles adjacent placeholders', async () => {
    const resolver = makeResolver({ 'a': 'X', 'b': 'Y' });
    const evaluator = new VariableEvaluator(parser, resolver);
    expect(await evaluator.evaluate('${a}${b}', ctx)).toBe('XY');
  });

  it('handles placeholder at start of template', async () => {
    const resolver = makeResolver({ 'name': 'Alice' });
    const evaluator = new VariableEvaluator(parser, resolver);
    expect(await evaluator.evaluate('${name} is here', ctx)).toBe('Alice is here');
  });

  it('handles placeholder at end of template', async () => {
    const resolver = makeResolver({ 'name': 'Bob' });
    const evaluator = new VariableEvaluator(parser, resolver);
    expect(await evaluator.evaluate('Hello ${name}', ctx)).toBe('Hello Bob');
  });

  it('passes context to the resolver', async () => {
    const resolveFn = jest.fn().mockResolvedValue('ok');
    const resolver: IVariableResolver = { resolve: resolveFn };
    const evaluator = new VariableEvaluator(parser, resolver);
    await evaluator.evaluate('${x}', ctx);
    expect(resolveFn).toHaveBeenCalledWith('x', ctx);
  });
});
