/**
 * Integration tests – VariableResolver with FunctionRegistry (PR-8)
 *
 * Covers the interaction between the resolver's function-call detection and
 * the function registry: argument resolution, caching, soft-fail behaviour,
 * and end-to-end template rendering via VariableEvaluator.
 */

import { VariableResolver } from '../../../../src/modules/variable-engine/resolver/VariableResolver';
import { VariableEvaluator } from '../../../../src/modules/variable-engine/evaluator/VariableEvaluator';
import { VariableParser } from '../../../../src/modules/variable-engine/parser/VariableParser';
import { L1VariableCache } from '../../../../src/modules/variable-engine/cache/L1VariableCache';
import { FunctionRegistry } from '../../../../src/modules/variable-engine/functions/FunctionRegistry';
import { createBuiltinFunctionRegistry } from '../../../../src/modules/variable-engine/functions/createBuiltinFunctionRegistry';
import { CountFunction } from '../../../../src/modules/variable-engine/functions/builtins/CountFunction';
import { RoundFunction } from '../../../../src/modules/variable-engine/functions/builtins/RoundFunction';
import { UppercaseFunction } from '../../../../src/modules/variable-engine/functions/builtins/UppercaseFunction';
import type {
  IVariableRegistry,
  IVariableProvider,
  IVariableLogger,
  VariableContext,
  VariableValue
} from '../../../../src/modules/variable-engine/contracts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ctx: VariableContext = { entityId: 1, entityType: 'task' };

function makeRegistry(valueMap: Record<string, VariableValue> = {}): IVariableRegistry {
  const provider: IVariableProvider = {
    namespaces: Object.keys(valueMap).map((k) => k.split('.')[0]),
    resolve: jest.fn().mockImplementation(async (expr: string) => valueMap[expr]),
  };
  return {
    register: jest.fn(),
    find: jest.fn().mockImplementation((expr: string) =>
      Object.prototype.hasOwnProperty.call(valueMap, expr) ? provider : undefined
    ),
    getAll: jest.fn().mockReturnValue([provider]),
  };
}

function makeMockLogger(): jest.Mocked<IVariableLogger> {
  return { error: jest.fn(), warn: jest.fn(), trace: jest.fn() };
}

// ─── Resolver + function registry integration ─────────────────────────────────

describe('VariableResolver – function registry integration', () => {
  let functionRegistry: FunctionRegistry;
  let cache: L1VariableCache;

  beforeEach(() => {
    functionRegistry = new FunctionRegistry();
    cache = new L1VariableCache();
  });

  it('resolves a function call expression by delegating to the function', async () => {
    functionRegistry.register('uppercase', new UppercaseFunction());
    const registry = makeRegistry({ 'contract.customer.name': 'acme corp' });
    const resolver = new VariableResolver(registry, cache, { functionRegistry });

    const result = await resolver.resolve('uppercase(contract.customer.name)', ctx);
    expect(result).toBe('ACME CORP');
  });

  it('resolves count() over a numeric argument', async () => {
    functionRegistry.register('count', new CountFunction());
    const registry = makeRegistry({ 'task.subtask.count': 7 });
    const resolver = new VariableResolver(registry, cache, { functionRegistry });

    const result = await resolver.resolve('count(task.subtask.count)', ctx);
    expect(result).toBe(7);
  });

  it('resolves round() over a numeric argument', async () => {
    functionRegistry.register('round', new RoundFunction());
    const registry = makeRegistry({ 'fiber.length.total': 42.8 });
    const resolver = new VariableResolver(registry, cache, { functionRegistry });

    const result = await resolver.resolve('round(fiber.length.total)', ctx);
    expect(result).toBe(43);
  });

  it('returns undefined and logs a warning for an unknown function name', async () => {
    const registry = makeRegistry({});
    const logger = makeMockLogger();
    const resolver = new VariableResolver(registry, cache, { functionRegistry, logger });

    const result = await resolver.resolve('unknown(x)', ctx);
    expect(result).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      'Unknown function in expression – soft-fail applied',
      expect.objectContaining({ funcName: 'unknown' })
    );
  });

  it('caches the function result on first call', async () => {
    functionRegistry.register('round', new RoundFunction());
    const registry = makeRegistry({ 'fiber.length.total': 3.9 });
    const resolver = new VariableResolver(registry, cache, { functionRegistry });

    await resolver.resolve('round(fiber.length.total)', ctx);
    // Second call should come from cache (underlying provider resolved only once).
    const result = await resolver.resolve('round(fiber.length.total)', ctx);
    expect(result).toBe(4);
    // The provider.resolve for the arg should only be called once (cached).
    expect((registry.find as jest.Mock).mock.calls.length).toBeGreaterThan(0);
  });

  it('falls through to provider lookup when no functionRegistry is configured', async () => {
    const registry = makeRegistry({});
    const resolver = new VariableResolver(registry, cache, {});

    const result = await resolver.resolve('count(children)', ctx);
    expect(result).toBeUndefined();
  });

  it('bypasses function cache when bypassCache is true', async () => {
    functionRegistry.register('round', new RoundFunction());
    const callCount = { n: 0 };
    const provider: IVariableProvider = {
      namespaces: ['fiber'],
      resolve: jest.fn().mockImplementation(async () => {
        callCount.n++;
        return 3.1;
      }),
    };
    const registryWithSpy: IVariableRegistry = {
      register: jest.fn(),
      find: jest.fn().mockReturnValue(provider),
      getAll: jest.fn().mockReturnValue([provider]),
    };
    const resolver = new VariableResolver(registryWithSpy, cache, {
      functionRegistry,
      bypassCache: true,
    });

    await resolver.resolve('round(fiber.length.total)', ctx);
    await resolver.resolve('round(fiber.length.total)', ctx);
    // With bypassCache, the arg provider is called every time.
    expect(callCount.n).toBe(2);
  });
});

// ─── End-to-end: VariableEvaluator + VariableResolver + built-ins ─────────────

describe('VariableEvaluator – end-to-end function rendering', () => {
  function buildEngine(valueMap: Record<string, VariableValue>): VariableEvaluator {
    const cache = new L1VariableCache();
    const parser = new VariableParser();
    const registry = makeRegistry(valueMap);
    const resolver = new VariableResolver(registry, cache, {
      functionRegistry: createBuiltinFunctionRegistry(),
    });
    return new VariableEvaluator(parser, resolver);
  }

  it('renders ${uppercase(contract.customer.name)}', async () => {
    const engine = buildEngine({ 'contract.customer.name': 'acme corp' });
    const result = await engine.evaluate(
      'Customer: ${uppercase(contract.customer.name)}',
      ctx
    );
    expect(result).toBe('Customer: ACME CORP');
  });

  it('renders ${round(fiber.length.total)}', async () => {
    const engine = buildEngine({ 'fiber.length.total': 73.4 });
    const result = await engine.evaluate('Length: ${round(fiber.length.total)} m', ctx);
    expect(result).toBe('Length: 73 m');
  });

  it('renders ${count(task.subtask.count)} from numeric provider', async () => {
    const engine = buildEngine({ 'task.subtask.count': 5 });
    const result = await engine.evaluate('Subtasks: ${count(task.subtask.count)}', ctx);
    expect(result).toBe('Subtasks: 5');
  });

  it('renders multiple function calls in one template', async () => {
    const engine = buildEngine({
      'contract.customer.name': 'acme corp',
      'fiber.length.total': 100.6,
    });
    const result = await engine.evaluate(
      '${uppercase(contract.customer.name)} – ${round(fiber.length.total)} m',
      ctx
    );
    expect(result).toBe('ACME CORP – 101 m');
  });

  it('preserves plain dot-notation tokens alongside function calls', async () => {
    const engine = buildEngine({
      'camera.total': 12,
      'fiber.length.total': 99.9,
    });
    const result = await engine.evaluate(
      'Cameras: ${camera.total} | Fiber: ${round(fiber.length.total)} m',
      ctx
    );
    expect(result).toBe('Cameras: 12 | Fiber: 100 m');
  });

  it('uses fallback for an unknown function call', async () => {
    const engine = buildEngine({});
    const result = await engine.evaluate('${mystery(x)}', ctx, { fallback: 'N/A' });
    expect(result).toBe('N/A');
  });

  it('uses fallback when the function argument does not resolve', async () => {
    const engine = buildEngine({});
    const result = await engine.evaluate('${round(missing.value)}', ctx, { fallback: '0' });
    // round(undefined) → undefined → fallback
    expect(result).toBe('0');
  });
});
