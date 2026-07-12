/**
 * Variable Engine – Feature Flags (PR-3 scope; updated PR-10 final rollout)
 *
 * Centralises all feature flags that control Variable Engine behaviour.
 * Flags are read from environment variables at call time so they can be
 * changed between test runs without restarting the process.
 *
 * ## variableEngineV2
 *
 * When `true` the new `IVariableEvaluator`-based engine is used inside
 * `BomTemplateRenderingAdapter` instead of the legacy resolver.
 *
 * **PR-10 change:** the new engine is now the **default**.  The legacy
 * resolver is used only when the environment variable is explicitly set to
 * `'false'`.
 *
 * Rollback (legacy resolver): set `VARIABLE_ENGINE_V2=false`
 *
 * Default: `true` (new engine active – PR-10 final rollout).
 */

export interface FeatureFlags {
  /**
   * When `true`, the new Variable Engine (PR-1/PR-2) is used for template
   * rendering.  When `false`, the legacy resolver is used as a fallback.
   *
   * Default: `true` as of PR-10 final rollout.
   * Rollback: set `VARIABLE_ENGINE_V2=false`.
   */
  readonly variableEngineV2: boolean;
}

/**
 * Read current feature flags from environment variables.
 *
 * Called at construction time by components that need the flags so that the
 * value reflects the environment at object creation, not at module load time.
 * This makes testing easier (just set `process.env.VARIABLE_ENGINE_V2`
 * before constructing the component under test).
 *
 * Since PR-10, `variableEngineV2` defaults to `true`.  Set
 * `VARIABLE_ENGINE_V2=false` to opt back to the legacy resolver.
 */
export function readFeatureFlags(): FeatureFlags {
  return {
    variableEngineV2: process.env.VARIABLE_ENGINE_V2 !== 'false',
  };
}
