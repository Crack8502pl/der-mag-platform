/**
 * Variable Engine – createBuiltinFunctionRegistry (PR-8)
 *
 * Convenience factory that creates a `FunctionRegistry` pre-populated with
 * all MVP built-in functions:
 * - `count`     – returns the "count" of its argument
 * - `round`     – rounds a numeric argument to the nearest integer
 * - `uppercase` – converts the argument to upper case
 *
 * Used by `VariableEngineFactory.create()` so callers receive a fully wired
 * engine without any manual DI setup.  Callers that need custom functions can
 * register additional entries on the returned registry instance.
 */

import { FunctionRegistry } from './FunctionRegistry';
import { CountFunction, RoundFunction, UppercaseFunction } from './builtins';
import type { IFunctionRegistry } from '../contracts';

/**
 * Create and return a `FunctionRegistry` with all built-in MVP functions
 * already registered.
 */
export function createBuiltinFunctionRegistry(): IFunctionRegistry {
  const registry = new FunctionRegistry();
  registry.register('count', new CountFunction());
  registry.register('round', new RoundFunction());
  registry.register('uppercase', new UppercaseFunction());
  return registry;
}
