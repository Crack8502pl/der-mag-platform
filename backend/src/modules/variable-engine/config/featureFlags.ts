/**
 * Variable Engine – Feature Flags (PR-3 scope)
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
 * Enable by setting the environment variable:
 * ```
 * VARIABLE_ENGINE_V2=true
 * ```
 *
 * Default: `false` (legacy resolver active – safe rollback path).
 */

export interface FeatureFlags {
  /**
   * When `true`, the new Variable Engine (PR-1/PR-2) is used for template
   * rendering.  When `false`, the legacy resolver is used as a fallback.
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
 */
export function readFeatureFlags(): FeatureFlags {
  return {
    variableEngineV2: process.env.VARIABLE_ENGINE_V2 === 'true',
  };
}
