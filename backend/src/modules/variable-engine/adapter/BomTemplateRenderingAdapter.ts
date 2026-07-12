/**
 * Variable Engine – BomTemplateRenderingAdapter (PR-3 scope)
 *
 * Connects the new Variable Engine to the BOM template rendering path.
 * This is the **integration point** between the engine and the BOM domain.
 *
 * ## Design constraints
 *
 * - **No engine → BOM dependency**: this adapter lives inside the
 *   `variable-engine` module but imports **nothing** from any BOM service or
 *   entity.  The BOM-specific context is expressed purely through the generic
 *   `VariableContext` from the engine contracts.
 * - **Backward compatibility**: controlled by the `variableEngineV2` feature
 *   flag.  When the flag is `false` (default), the legacy resolver is used
 *   and the template is returned with simple flat-map substitution.
 * - **Rollback**: disabling `VARIABLE_ENGINE_V2` instantly switches back to
 *   the legacy path without any code change.
 *
 * ## Usage
 *
 * ```ts
 * import {
 *   BomTemplateRenderingAdapter,
 *   LegacyVariableResolver,
 * } from '@/modules/variable-engine/adapter';
 * import { VariableEngineFactory } from '@/modules/variable-engine';
 * import { readFeatureFlags } from '@/modules/variable-engine/config';
 *
 * const { engine } = new VariableEngineFactory([
 *   // …inject providers…
 * ]).create();
 *
 * const adapter = new BomTemplateRenderingAdapter(
 *   engine,
 *   new LegacyVariableResolver(),
 *   readFeatureFlags(),
 * );
 *
 * // Render a BOM template string:
 * const rendered = await adapter.render(
 *   'Total cameras: ${camera.total}',
 *   { entityId: taskId, entityType: 'task' },
 * );
 * ```
 */

import type { IVariableEvaluator, VariableContext, EvaluateOptions, VariableValue } from '../contracts';
import { LegacyVariableResolver } from './LegacyVariableResolver';
import type { LegacyVariableValue } from './LegacyVariableResolver';
import type { FeatureFlags } from '../config/featureFlags';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Context supplied by the BOM rendering path.
 *
 * Extends `VariableContext` so it can be passed directly to the engine.
 * No BOM-specific fields are added here to honour the constraint that the
 * engine must not depend on BOM domain types.
 */
export type BomRenderContext = VariableContext;

// ─── Adapter ──────────────────────────────────────────────────────────────────

export class BomTemplateRenderingAdapter {
  private readonly evaluator: IVariableEvaluator;
  private readonly legacyResolver: LegacyVariableResolver;
  private readonly flags: FeatureFlags;

  /**
   * @param evaluator      – Fully configured `IVariableEvaluator` (from
   *                         `VariableEngineFactory.create()`).
   * @param legacyResolver – Legacy flat-map resolver used when the feature
   *                         flag is disabled.
   * @param flags          – Feature flags snapshot (use `readFeatureFlags()`
   *                         to obtain at construction time).
   */
  constructor(
    evaluator: IVariableEvaluator,
    legacyResolver: LegacyVariableResolver,
    flags: FeatureFlags,
  ) {
    this.evaluator = evaluator;
    this.legacyResolver = legacyResolver;
    this.flags = flags;
  }

  /**
   * Render a BOM template string by substituting `${...}` placeholders.
   *
   * When `variableEngineV2` is **enabled**, delegates to the new engine
   * which resolves variables via registered providers (async, cached,
   * provider-based).
   *
   * When `variableEngineV2` is **disabled**, falls back to the legacy
   * resolver which performs simple flat-map substitution using the values
   * supplied in `context.params`.
   *
   * @param template – Template string containing `${expression}` tokens.
   * @param context  – Execution context (entity id/type + flat params for
   *                   the legacy path).
   * @param options  – Optional evaluator options (only honoured on the new
   *                   engine path).
   * @returns Rendered string.
   */
  async render(
    template: string,
    context: BomRenderContext,
    options?: EvaluateOptions,
  ): Promise<string> {
    if (this.flags.variableEngineV2) {
      return this.evaluator.evaluate(template, context, options);
    }

    // ── Legacy fallback ──────────────────────────────────────────────────────
    // Build a flat string map from context.params so the legacy resolver can
    // perform simple key → value substitution.
    const variables = this.buildLegacyVariables(context.params);
    return this.legacyResolver.resolve(template, variables);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Convert the optional `VariableContext.params` map to the flat
   * `Record<string, string>` expected by `LegacyVariableResolver`.
   *
   * `null` and `undefined` values are excluded so that the legacy resolver
   * preserves the original placeholder text for unset variables (matching the
   * pre-engine behaviour).
   */
  private buildLegacyVariables(
    params: Readonly<Record<string, VariableValue>> | undefined,
  ): Record<string, LegacyVariableValue> {
    if (!params) {
      return {};
    }
    const result: Record<string, LegacyVariableValue> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        result[key] = value as LegacyVariableValue;
      }
    }
    return result;
  }
}
