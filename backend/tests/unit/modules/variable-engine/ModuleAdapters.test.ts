/**
 * Unit tests – Module rendering adapters (L-12)
 * PDF, Reports, Labels, Emails adapters
 */

import { PdfTemplateRenderingAdapter } from '../../../../src/modules/variable-engine/adapter/PdfTemplateRenderingAdapter';
import { ReportsTemplateRenderingAdapter } from '../../../../src/modules/variable-engine/adapter/ReportsTemplateRenderingAdapter';
import { LabelsTemplateRenderingAdapter } from '../../../../src/modules/variable-engine/adapter/LabelsTemplateRenderingAdapter';
import { EmailsTemplateRenderingAdapter } from '../../../../src/modules/variable-engine/adapter/EmailsTemplateRenderingAdapter';
import { LegacyVariableResolver } from '../../../../src/modules/variable-engine/adapter/LegacyVariableResolver';
import type { IVariableEvaluator, VariableContext } from '../../../../src/modules/variable-engine/contracts';
import type { FeatureFlags } from '../../../../src/modules/variable-engine/config/featureFlags';

const ctx: VariableContext = { entityId: 1, entityType: 'task', params: { x: 'hello' } };

function makeEvaluator(result: string): IVariableEvaluator {
  return { evaluate: jest.fn().mockResolvedValue(result) };
}

function makeLegacy(): LegacyVariableResolver {
  const legacy = new LegacyVariableResolver();
  return legacy;
}

const flagsV2: FeatureFlags = { variableEngineV2: true };
const flagsLegacy: FeatureFlags = { variableEngineV2: false };

describe('PdfTemplateRenderingAdapter (L-12)', () => {
  it('uses new engine when variableEngineV2=true', async () => {
    const evaluator = makeEvaluator('pdf-rendered');
    const adapter = new PdfTemplateRenderingAdapter(evaluator, makeLegacy(), flagsV2);
    const result = await adapter.render('template', ctx);
    expect(result).toBe('pdf-rendered');
    expect(evaluator.evaluate).toHaveBeenCalledWith('template', ctx, undefined);
  });

  it('uses legacy resolver when variableEngineV2=false', async () => {
    const evaluator = makeEvaluator('should-not-be-called');
    const adapter = new PdfTemplateRenderingAdapter(evaluator, makeLegacy(), flagsLegacy);
    const result = await adapter.render('Hello ${x}!', ctx);
    expect(result).toBe('Hello hello!');
    expect(evaluator.evaluate).not.toHaveBeenCalled();
  });
});

describe('ReportsTemplateRenderingAdapter (L-12)', () => {
  it('uses new engine when variableEngineV2=true', async () => {
    const evaluator = makeEvaluator('reports-rendered');
    const adapter = new ReportsTemplateRenderingAdapter(evaluator, makeLegacy(), flagsV2);
    const result = await adapter.render('template', ctx);
    expect(result).toBe('reports-rendered');
  });

  it('uses legacy resolver when variableEngineV2=false', async () => {
    const evaluator = makeEvaluator('not-called');
    const adapter = new ReportsTemplateRenderingAdapter(evaluator, makeLegacy(), flagsLegacy);
    const result = await adapter.render('Hello ${x}!', ctx);
    expect(result).toBe('Hello hello!');
    expect(evaluator.evaluate).not.toHaveBeenCalled();
  });
});

describe('LabelsTemplateRenderingAdapter (L-12)', () => {
  it('uses new engine when variableEngineV2=true', async () => {
    const evaluator = makeEvaluator('labels-rendered');
    const adapter = new LabelsTemplateRenderingAdapter(evaluator, makeLegacy(), flagsV2);
    const result = await adapter.render('template', ctx);
    expect(result).toBe('labels-rendered');
  });

  it('uses legacy resolver when variableEngineV2=false', async () => {
    const evaluator = makeEvaluator('not-called');
    const adapter = new LabelsTemplateRenderingAdapter(evaluator, makeLegacy(), flagsLegacy);
    const result = await adapter.render('Hello ${x}!', ctx);
    expect(result).toBe('Hello hello!');
    expect(evaluator.evaluate).not.toHaveBeenCalled();
  });
});

describe('EmailsTemplateRenderingAdapter (L-12)', () => {
  it('uses new engine when variableEngineV2=true', async () => {
    const evaluator = makeEvaluator('emails-rendered');
    const adapter = new EmailsTemplateRenderingAdapter(evaluator, makeLegacy(), flagsV2);
    const result = await adapter.render('template', ctx);
    expect(result).toBe('emails-rendered');
  });

  it('uses legacy resolver when variableEngineV2=false', async () => {
    const evaluator = makeEvaluator('not-called');
    const adapter = new EmailsTemplateRenderingAdapter(evaluator, makeLegacy(), flagsLegacy);
    const result = await adapter.render('Hello ${x}!', ctx);
    expect(result).toBe('Hello hello!');
    expect(evaluator.evaluate).not.toHaveBeenCalled();
  });
});
