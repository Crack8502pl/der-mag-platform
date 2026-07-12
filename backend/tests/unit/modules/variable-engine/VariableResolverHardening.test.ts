/**
 * Unit tests – VariableResolver strict mode (L-04) and nested expressions (L-02)
 */

import { VariableResolver } from '../../../../src/modules/variable-engine/resolver/VariableResolver';
import { L1VariableCache } from '../../../../src/modules/variable-engine/cache/L1VariableCache';
import { VariableResolutionError } from '../../../../src/modules/variable-engine/errors';
import { FunctionRegistry } from '../../../../src/modules/variable-engine/functions/FunctionRegistry';
import type {
  IVariableRegistry,
  IVariableProvider,
  VariableContext,
  VariableValue,
  IVariableFunction,
} from '../../../../src/modules/variable-engine/contracts';

const ctx: VariableContext = { entityId: 1, entityType: 'task' };

function makeRegistry(provider?: IVariableProvider): IVariableRegistry {
  return {
    register: jest.fn(),
    find: jest.fn().mockReturnValue(provider),
    getAll: jest.fn().mockReturnValue(provider ? [provider] : []),
  };
}

function makeProvider(value: VariableValue): IVariableProvider {
  return {
    namespaces: ['camera'],
    resolve: jest.fn().mockResolvedValue(value),
  };
}

// ── Strict mode (L-04) ───────────────────────────────────────────────────────

describe('VariableResolver – strict mode (L-04)', () => {
  it('throws VariableResolutionError when strictMode=true and provider returns undefined', async () => {
    const provider = makeProvider(undefined);
    const registry = makeRegistry(provider);
    const resolver = new VariableResolver(registry, new L1VariableCache(), { strictMode: true });
    await expect(resolver.resolve('camera.total', ctx)).rejects.toThrow(VariableResolutionError);
  });

  it('throws VariableResolutionError when strictMode=true and no provider found', async () => {
    const registry = makeRegistry(undefined);
    const resolver = new VariableResolver(registry, new L1VariableCache(), { strictMode: true });
    await expect(resolver.resolve('unknown.x', ctx)).rejects.toThrow(VariableResolutionError);
  });

  it('does NOT throw in soft-fail mode (default) when provider returns undefined', async () => {
    const provider = makeProvider(undefined);
    const registry = makeRegistry(provider);
    const resolver = new VariableResolver(registry, new L1VariableCache());
    await expect(resolver.resolve('camera.total', ctx)).resolves.toBeUndefined();
  });

  it('returns resolved value in strict mode when provider returns a value', async () => {
    const provider = makeProvider(42);
    const registry = makeRegistry(provider);
    const resolver = new VariableResolver(registry, new L1VariableCache(), { strictMode: true });
    await expect(resolver.resolve('camera.total', ctx)).resolves.toBe(42);
  });

  it('throws VariableResolutionError for unknown function in strict mode', async () => {
    const registry = makeRegistry(undefined);
    const funcRegistry = new FunctionRegistry();
    const resolver = new VariableResolver(registry, new L1VariableCache(), {
      strictMode: true,
      functionRegistry: funcRegistry,
    });
    await expect(resolver.resolve('unknownFn(x)', ctx)).rejects.toThrow(VariableResolutionError);
  });
});

// ── Nested expression resolution (L-02) ──────────────────────────────────────

describe('VariableResolver – nested expression resolution (L-02)', () => {
  it('resolves nested ${inner} inside function call expression', async () => {
    // Set up a provider for 'name' namespace
    const nameProvider: IVariableProvider = {
      namespaces: ['name'],
      resolve: jest.fn().mockResolvedValue('World'),
    };
    const registry: IVariableRegistry = {
      register: jest.fn(),
      find: jest.fn((expr: string) => expr.startsWith('name') ? nameProvider : undefined),
      getAll: jest.fn().mockReturnValue([nameProvider]),
    };
    // A function 'greet' that uppercases its arg
    const greetFn: IVariableFunction = { call: (arg: VariableValue) => `Hello ${String(arg)}` };
    const funcRegistry = new FunctionRegistry();
    funcRegistry.register('greet', greetFn);

    const resolver = new VariableResolver(registry, new L1VariableCache(), {
      functionRegistry: funcRegistry,
    });

    // Expression: 'greet(${name})'
    // 1. Resolver detects nested `${name}` and resolves it to 'World'
    // 2. Expression becomes 'greet(World)'
    // 3. parseFunctionCall('greet(World)') → { funcName: 'greet', argExpression: 'World' }
    // 4. Resolver tries to resolve 'World' → undefined (no provider)
    // 5. greetFn.call(undefined) → 'Hello undefined'
    const result = await resolver.resolve('greet(${name})', ctx);
    // After inner ${name} resolves to 'World', expression becomes 'greet(World)'
    // Then 'World' arg resolves to undefined (no 'World' namespace provider)
    // greet(undefined) → 'Hello undefined'
    expect(result).toBe('Hello undefined');
    // But more importantly, the nameProvider was called for 'name'
    expect(nameProvider.resolve).toHaveBeenCalledWith('name', ctx);
  });
});

// ── Multi-argument functions (L-21) ──────────────────────────────────────────

describe('VariableResolver – multi-argument functions (L-21)', () => {
  it('calls callMulti when present and multiple args given', async () => {
    const registry = makeRegistry(undefined);
    const xProvider: IVariableProvider = {
      namespaces: ['x'],
      resolve: jest.fn().mockResolvedValue(5),
    };
    const fullRegistry: IVariableRegistry = {
      register: jest.fn(),
      find: jest.fn((expr: string) => expr.startsWith('x') ? xProvider : undefined),
      getAll: jest.fn().mockReturnValue([xProvider]),
    };

    const padFn: IVariableFunction = {
      call: jest.fn().mockReturnValue('padded'),
      callMulti: jest.fn((args: readonly VariableValue[]) => `${args[0]}:${args[1]}`),
    };
    const funcRegistry = new FunctionRegistry();
    funcRegistry.register('pad', padFn);

    const resolver = new VariableResolver(fullRegistry, new L1VariableCache(), {
      functionRegistry: funcRegistry,
    });

    // pad(x, 5) → x resolves to 5, second arg '5' resolves to undefined
    const result = await resolver.resolve('pad(x, 5)', ctx);
    expect(padFn.callMulti).toHaveBeenCalled();
    // First arg 'x' → 5; second arg '5' → undefined (no provider)
    expect((padFn.callMulti as jest.Mock).mock.calls[0][0]).toEqual([5, undefined]);
  });

  it('falls back to call(args[0]) when callMulti not defined and single arg', async () => {
    const registry: IVariableRegistry = {
      register: jest.fn(),
      find: jest.fn().mockReturnValue(undefined),
      getAll: jest.fn().mockReturnValue([]),
    };
    const fn: IVariableFunction = { call: jest.fn().mockReturnValue('result') };
    const funcRegistry = new FunctionRegistry();
    funcRegistry.register('fn', fn);

    const resolver = new VariableResolver(registry, new L1VariableCache(), {
      functionRegistry: funcRegistry,
    });

    await resolver.resolve('fn(x)', ctx);
    expect(fn.call).toHaveBeenCalledWith(undefined);
  });
});

// ── Nested function calls (L-03/L-20) ────────────────────────────────────────

describe('VariableResolver – nested function calls (L-03/L-20)', () => {
  it('resolves count(round(x)) recursively', async () => {
    const xProvider: IVariableProvider = {
      namespaces: ['x'],
      resolve: jest.fn().mockResolvedValue(3.7),
    };
    const registry: IVariableRegistry = {
      register: jest.fn(),
      find: jest.fn((expr: string) => expr.startsWith('x') ? xProvider : undefined),
      getAll: jest.fn().mockReturnValue([xProvider]),
    };

    const funcRegistry = new FunctionRegistry();
    funcRegistry.register('round', { call: (v: VariableValue) => Math.round(v as number) });
    funcRegistry.register('count', { call: (v: VariableValue) => typeof v === 'number' ? v : 0 });

    const resolver = new VariableResolver(registry, new L1VariableCache(), {
      functionRegistry: funcRegistry,
    });

    // count(round(x)) → round(x) → round(3.7) = 4 → count(4) = 4
    const result = await resolver.resolve('count(round(x))', ctx);
    expect(result).toBe(4);
  });
});
