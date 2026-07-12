/**
 * Variable Engine – AbstractVariableProvider
 *
 * Convenience base class for concrete `IVariableProvider` implementations.
 *
 * Provides a protected helper (`extractField`) for stripping the namespace
 * prefix from an expression so sub-classes can focus on the field logic:
 *
 * ```ts
 * class CameraProvider extends AbstractVariableProvider {
 *   readonly namespaces = ['camera'] as const;
 *
 *   async resolve(expression: string, context: VariableContext) {
 *     const field = this.extractField(expression); // e.g. "total"
 *     // …
 *   }
 * }
 * ```
 *
 * Extending this class is optional; providers may implement `IVariableProvider`
 * directly.  The base class adds no mandatory state – it is a pure convenience
 * layer that makes sub-class code more readable.
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
}
