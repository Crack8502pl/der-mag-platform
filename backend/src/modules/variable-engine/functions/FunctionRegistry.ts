/**
 * Variable Engine – FunctionRegistry (PR-8)
 *
 * A simple, mutable map from function name → `IVariableFunction` instance.
 * Implements `IFunctionRegistry` so callers can depend on the interface
 * rather than the concrete class.
 *
 * ## Design decisions
 *
 * - **Last-write-wins**: registering a name twice silently replaces the first
 *   entry.  This is intentional for the MVP – it keeps the implementation
 *   minimal and lets callers override built-ins if needed.
 * - **No static state**: the registry is a plain class instance injected via
 *   DI.  There is no module-level singleton.
 * - **Case-sensitive**: function names are case-sensitive (`Count` ≠ `count`).
 */

import type { IFunctionRegistry, IVariableFunction } from '../contracts';

export class FunctionRegistry implements IFunctionRegistry {
  private readonly functions = new Map<string, IVariableFunction>();

  /**
   * Register a named function.
   *
   * If a function with the same name is already registered it is silently
   * replaced (last-write-wins).
   */
  register(name: string, fn: IVariableFunction): void {
    this.functions.set(name, fn);
  }

  /**
   * Look up a function by name.
   *
   * @returns The registered function, or `undefined` when the name is unknown.
   */
  find(name: string): IVariableFunction | undefined {
    return this.functions.get(name);
  }
}
