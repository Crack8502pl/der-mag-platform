/**
 * Unit tests – readFeatureFlags (PR-3; updated PR-10 final rollout)
 *
 * PR-10 change: `variableEngineV2` now defaults to `true`.
 * The legacy resolver is active only when VARIABLE_ENGINE_V2 is explicitly
 * set to the string `'false'`.
 *
 * Verifies:
 * - `variableEngineV2` is `true` when the env var is absent (new default)
 * - `variableEngineV2` is `true` when the env var is empty string or '1'
 * - `variableEngineV2` is `false` only when VARIABLE_ENGINE_V2='false' (rollback)
 * - `variableEngineV2` is `true` when VARIABLE_ENGINE_V2='true'
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

  // ── Default ON (PR-10) ────────────────────────────────────────────────────

  it('returns variableEngineV2=true when VARIABLE_ENGINE_V2 is not set (new default)', () => {
    delete process.env.VARIABLE_ENGINE_V2;
    expect(readFeatureFlags().variableEngineV2).toBe(true);
  });

  it('returns variableEngineV2=true when VARIABLE_ENGINE_V2 is empty string', () => {
    process.env.VARIABLE_ENGINE_V2 = '';
    expect(readFeatureFlags().variableEngineV2).toBe(true);
  });

  it('returns variableEngineV2=true when VARIABLE_ENGINE_V2 is "1"', () => {
    process.env.VARIABLE_ENGINE_V2 = '1';
    expect(readFeatureFlags().variableEngineV2).toBe(true);
  });

  it('returns variableEngineV2=true when VARIABLE_ENGINE_V2 is "true"', () => {
    process.env.VARIABLE_ENGINE_V2 = 'true';
    expect(readFeatureFlags().variableEngineV2).toBe(true);
  });

  // ── Explicit rollback ─────────────────────────────────────────────────────

  it('returns variableEngineV2=false when VARIABLE_ENGINE_V2 is "false" (rollback)', () => {
    process.env.VARIABLE_ENGINE_V2 = 'false';
    expect(readFeatureFlags().variableEngineV2).toBe(false);
  });

  // ── Call-time evaluation ──────────────────────────────────────────────────

  it('reads the env var at call time (not at module import time)', () => {
    delete process.env.VARIABLE_ENGINE_V2;
    const defaultOn = readFeatureFlags();
    expect(defaultOn.variableEngineV2).toBe(true);

    process.env.VARIABLE_ENGINE_V2 = 'false';
    const rolledBack = readFeatureFlags();
    expect(rolledBack.variableEngineV2).toBe(false);

    process.env.VARIABLE_ENGINE_V2 = 'true';
    const explicitOn = readFeatureFlags();
    expect(explicitOn.variableEngineV2).toBe(true);
  });
});
