/**
 * Unit tests – readFeatureFlags (PR-3)
 *
 * Verifies:
 * - `variableEngineV2` is `false` when the env var is absent
 * - `variableEngineV2` is `false` when the env var is not 'true'
 * - `variableEngineV2` is `true` when VARIABLE_ENGINE_V2=true
 * - The function reads the env var at call time (not at module load time)
 */

import { readFeatureFlags } from '../../../../src/modules/variable-engine/config/featureFlags';

describe('readFeatureFlags', () => {
  const originalEnv = process.env.VARIABLE_ENGINE_V2;

  afterEach(() => {
    // Restore original env value after each test
    if (originalEnv === undefined) {
      delete process.env.VARIABLE_ENGINE_V2;
    } else {
      process.env.VARIABLE_ENGINE_V2 = originalEnv;
    }
  });

  it('returns variableEngineV2=false when VARIABLE_ENGINE_V2 is not set', () => {
    delete process.env.VARIABLE_ENGINE_V2;
    expect(readFeatureFlags().variableEngineV2).toBe(false);
  });

  it('returns variableEngineV2=false when VARIABLE_ENGINE_V2 is empty string', () => {
    process.env.VARIABLE_ENGINE_V2 = '';
    expect(readFeatureFlags().variableEngineV2).toBe(false);
  });

  it('returns variableEngineV2=false when VARIABLE_ENGINE_V2 is "false"', () => {
    process.env.VARIABLE_ENGINE_V2 = 'false';
    expect(readFeatureFlags().variableEngineV2).toBe(false);
  });

  it('returns variableEngineV2=false when VARIABLE_ENGINE_V2 is "1"', () => {
    process.env.VARIABLE_ENGINE_V2 = '1';
    expect(readFeatureFlags().variableEngineV2).toBe(false);
  });

  it('returns variableEngineV2=true when VARIABLE_ENGINE_V2 is "true"', () => {
    process.env.VARIABLE_ENGINE_V2 = 'true';
    expect(readFeatureFlags().variableEngineV2).toBe(true);
  });

  it('reads the env var at call time (not at module import time)', () => {
    delete process.env.VARIABLE_ENGINE_V2;
    const before = readFeatureFlags();
    expect(before.variableEngineV2).toBe(false);

    process.env.VARIABLE_ENGINE_V2 = 'true';
    const after = readFeatureFlags();
    expect(after.variableEngineV2).toBe(true);
  });
});
