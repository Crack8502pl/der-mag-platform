/**
 * Variable Engine – PdfTemplateRenderingAdapter (L-12)
 *
 * Connects the Variable Engine to PDF template rendering paths.
 *
 * This is a thin adapter that applies the same engine-based template
 * substitution used by `BomTemplateRenderingAdapter` to PDF templates.
 *
 * ## Design constraints
 * - No engine → PDF domain dependency.  PDF context is expressed purely
 *   through the generic `VariableContext`.
 * - Backward-compatible: when `variableEngineV2` is `false`, the legacy
 *   resolver is used.
 * - Rollback: set `VARIABLE_ENGINE_V2=false` to revert to the legacy path.
 *
 * ## Usage
 * ```ts
 * const adapter = new PdfTemplateRenderingAdapter(engine, legacyResolver, readFeatureFlags());
 * const rendered = await adapter.render(template, { entityId: taskId, entityType: 'task' });
 * ```
 */

import type { IVariableEvaluator, VariableContext, EvaluateOptions, VariableValue } from '../contracts';
import { LegacyVariableResolver } from './LegacyVariableResolver';
import type { LegacyVariableValue } from './LegacyVariableResolver';
import type { FeatureFlags } from '../config/featureFlags';

export type PdfRenderContext = VariableContext;

export class PdfTemplateRenderingAdapter {
  private readonly evaluator: IVariableEvaluator;
  private readonly legacyResolver: LegacyVariableResolver;
  private readonly flags: FeatureFlags;

  constructor(
    evaluator: IVariableEvaluator,
    legacyResolver: LegacyVariableResolver,
    flags: FeatureFlags,
  ) {
    this.evaluator = evaluator;
    this.legacyResolver = legacyResolver;
    this.flags = flags;
  }

  async render(
    template: string,
    context: PdfRenderContext,
    options?: EvaluateOptions,
  ): Promise<string> {
    if (this.flags.variableEngineV2) {
      return this.evaluator.evaluate(template, context, options);
    }
    return this.legacyResolver.resolve(template, this.buildLegacyVariables(context.params));
  }

  private buildLegacyVariables(
    params: Readonly<Record<string, VariableValue>> | undefined,
  ): Record<string, LegacyVariableValue> {
    if (!params) return {};
    const result: Record<string, LegacyVariableValue> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        result[key] = value as LegacyVariableValue;
      }
    }
    return result;
  }
}
