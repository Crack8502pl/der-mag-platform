/**
 * Variable Engine – VariableEngineLogger (PR-7 scope)
 *
 * Structured, DI-friendly logger for the Variable Engine.
 *
 * ## Security / production constraints
 *
 * - Stack traces are **never** emitted in the `error` / `warn` output when
 *   `includeStackTrace` is `false` (the default). This prevents accidental
 *   leakage of internal file paths or business-logic details in production
 *   log streams.
 * - Stack traces are included in `trace` entries only when both
 *   `traceEnabled` and `includeStackTrace` are `true` (i.e. local dev mode).
 *
 * ## Trace mode
 *
 * Trace entries are completely suppressed (no-op) unless `traceEnabled` is
 * set to `true`. Enable via `VARIABLE_ENGINE_TRACE=true` or by constructing
 * the logger directly with `{ traceEnabled: true }`.
 *
 * ## Output format
 *
 * Each log line is a single JSON object written to the appropriate
 * `console.*` method:
 * ```json
 * { "level": "error", "source": "VariableEngine", "message": "...", ...meta }
 * ```
 *
 * The `source` field allows log aggregators to filter Variable Engine
 * entries without parsing the message string.
 */

import type { IVariableLogger } from '../contracts';

export interface VariableEngineLoggerOptions {
  /**
   * When `true`, `trace(...)` calls produce output.
   * When `false` (default) they are silent no-ops.
   */
  readonly traceEnabled?: boolean;

  /**
   * When `true`, the `stack` property of `Error` objects is included in log
   * entries.  Should only be set to `true` in local development / CI –
   * **never** in production.
   */
  readonly includeStackTrace?: boolean;
}

/** No-op logger suitable for tests and silent operation. */
export class NullVariableLogger implements IVariableLogger {
  error(_message: string, _meta?: Record<string, unknown>): void { /* no-op */ }
  warn(_message: string, _meta?: Record<string, unknown>): void { /* no-op */ }
  trace(_message: string, _meta?: Record<string, unknown>): void { /* no-op */ }
}

export class VariableEngineLogger implements IVariableLogger {
  private readonly traceEnabled: boolean;
  private readonly includeStackTrace: boolean;

  constructor(options: VariableEngineLoggerOptions = {}) {
    this.traceEnabled = options.traceEnabled ?? false;
    this.includeStackTrace = options.includeStackTrace ?? false;
  }

  /**
   * Emit an error-level structured log entry.
   *
   * Stack traces are deliberately omitted from the output unless
   * `includeStackTrace` was set at construction time.
   */
  error(message: string, meta?: Record<string, unknown>): void {
    console.error(this.buildEntry('error', message, meta));
  }

  /** Emit a warning-level structured log entry. */
  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(this.buildEntry('warn', message, meta));
  }

  /**
   * Emit a trace-level structured log entry.
   * Complete no-op when `traceEnabled` is `false`.
   */
  trace(message: string, meta?: Record<string, unknown>): void {
    if (!this.traceEnabled) return;
    console.debug(this.buildEntry('trace', message, meta));
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private buildEntry(
    level: 'error' | 'warn' | 'trace',
    message: string,
    meta?: Record<string, unknown>
  ): string {
    const entry: Record<string, unknown> = {
      level,
      source: 'VariableEngine',
      message,
    };

    if (meta) {
      // Spread meta but scrub stack traces in non-trace levels unless
      // includeStackTrace is explicitly enabled.
      for (const [key, value] of Object.entries(meta)) {
        if (key === 'stack' && !this.includeStackTrace) {
          continue; // strip stack trace
        }
        entry[key] = value;
      }
    }

    return JSON.stringify(entry);
  }
}
