/**
 * Unit tests – VariableEvaluator strict mode (L-04 / L-17)
 */

import { VariableEvaluator } from '../../../../src/modules/variable-engine/evaluator/VariableEvaluator';
import { VariableParser } from '../../../../src/modules/variable-engine/parser/VariableParser';
import { VariableResolutionError } from '../../../../src/modules/variable-engine/errors';
import { UndefinedPolicy } from '../../../../src/modules/variable-engine/contracts';
import type { IVariableResolver, VariableContext, VariableValue } from '../../../../src/modules/variable-engine/contracts';

const ctx: VariableContext = { entityId: 1, entityType: 'task' };

function makeResolver(values: Record<string, VariableValue>): IVariableResolver {
  return {
    resolve: jest.fn(async (expr: string) => values[expr]),
  };
}

describe('VariableEvaluator – strict mode (L-04 / L-17)', () => {
  it('throws VariableResolutionError in STRICT mode when expression resolves to undefined', async () => {
    const resolver: IVariableResolver = {
      resolve: jest.fn().mockRejectedValue(new VariableResolutionError('x', 'strict')),
    };
    const evaluator = new VariableEvaluator(new VariableParser(), resolver);

    await expect(
      evaluator.evaluate('${x}', ctx, { undefinedPolicy: UndefinedPolicy.STRICT })
    ).rejects.toThrow(VariableResolutionError);
  });

  it('does not throw in SOFT_FAIL mode (default)', async () => {
    const resolver = makeResolver({ 'x': undefined });
    const evaluator = new VariableEvaluator(new VariableParser(), resolver);

    await expect(
      evaluator.evaluate('${x}', ctx, { undefinedPolicy: UndefinedPolicy.SOFT_FAIL })
    ).resolves.toBe('');
  });

  it('renders resolved values in STRICT mode', async () => {
    const resolver = makeResolver({ 'camera.total': 5 });
    const evaluator = new VariableEvaluator(new VariableParser(), resolver);

    const result = await evaluator.evaluate('Total: ${camera.total}', ctx, {
      undefinedPolicy: UndefinedPolicy.STRICT,
    });
    expect(result).toBe('Total: 5');
  });
});
