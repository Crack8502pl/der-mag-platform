/**
 * Variable Engine – AbstractVariableProvider
 *
 * Convenience base class for concrete `IVariableProvider` implementations.
 *
 * Provides two protected helpers that are shared across all providers:
 *
 * 1. **`extractField`** – strips the namespace prefix from an expression so
 *    sub-classes can focus on the field logic.
 * 2. **`parseEntityId`** – safely coerces `context.entityId` to a `number`.
 *
 * Extending this class is optional; providers may implement `IVariableProvider`
 * directly.  The base class adds no mandatory state.
 */

import type { IVariableProvider, VariableContext, VariableValue } from '../contracts';

export abstract class AbstractVariableProvider implements IVariableProvider {
  /** Namespace prefixes this provider handles. Must be set by the sub-class. */
  abstract readonly namespaces: readonly string[];

  /**
   * Resolve the given variable expression to a value.
   *
   * Sub-classes must implement this method.  They should return `undefined`
   * (not throw) when a value cannot be computed.
   */
  abstract resolve(expression: string, context: VariableContext): Promise<VariableValue>;

  /**
   * Extract the field portion of a dotted expression by stripping the
   * leading namespace segment.
   *
   * Examples:
   *   `"camera.total"`      → `"total"`
   *   `"fiber.length.total"` → `"length.total"`
   *   `"count"`             → `""` (no dot → no field portion)
   */
  protected extractField(expression: string): string {
    const dotIndex = expression.indexOf('.');
    return dotIndex === -1 ? '' : expression.slice(dotIndex + 1);
  }

  /**
   * Convert `context.entityId` to a finite `number`.
   *
   * Returns `undefined` for:
   * - `undefined` input
   * - empty strings
   * - non-numeric strings
   * - non-finite numbers (`NaN`, `Infinity`, `-Infinity`)
   */
  protected parseEntityId(entityId: number | string | undefined): number | undefined {
    if (entityId === undefined) return undefined;
    if (typeof entityId === 'number') return Number.isFinite(entityId) ? entityId : undefined;
    const parsed = Number(entityId);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
