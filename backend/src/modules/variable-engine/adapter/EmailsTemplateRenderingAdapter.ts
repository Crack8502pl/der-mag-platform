/**
 * Variable Engine – EmailsTemplateRenderingAdapter (L-12)
 *
 * Connects the Variable Engine to email template rendering paths (e.g.
 * transactional email bodies, subject lines).
 *
 * @see PdfTemplateRenderingAdapter for full design documentation.
 */

import type { IVariableEvaluator, VariableContext, EvaluateOptions, VariableValue } from '../contracts';
import { LegacyVariableResolver } from './LegacyVariableResolver';
import type { LegacyVariableValue } from './LegacyVariableResolver';
import type { FeatureFlags } from '../config/featureFlags';

export type EmailsRenderContext = VariableContext;

export class EmailsTemplateRenderingAdapter {
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
    context: EmailsRenderContext,
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
