/**
 * Unit tests – VariableEngineLogger (PR-7)
 *
 * Verifies:
 * - Structured JSON output format
 * - Correct console.* routing per level
 * - Stack trace suppression in default (production) mode
 * - Stack trace inclusion in dev mode (includeStackTrace=true)
 * - Trace entries suppressed when traceEnabled=false
 * - Trace entries emitted when traceEnabled=true
 * - NullVariableLogger is a complete no-op
 */

import {
  VariableEngineLogger,
  NullVariableLogger,
} from '../../../../src/modules/variable-engine/logger/VariableEngineLogger';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseLog(rawCall: string): Record<string, unknown> {
  return JSON.parse(rawCall) as Record<string, unknown>;
}

describe('VariableEngineLogger', () => {
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    debugSpy.mockRestore();
  });

  // ── Output format ──────────────────────────────────────────────────────────

  it('emits a JSON object with level, source, and message for error()', () => {
    const logger = new VariableEngineLogger();
    logger.error('something went wrong');

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const entry = parseLog(errorSpy.mock.calls[0][0] as string);
    expect(entry.level).toBe('error');
    expect(entry.source).toBe('VariableEngine');
    expect(entry.message).toBe('something went wrong');
  });

  it('emits a JSON object with level, source, and message for warn()', () => {
    const logger = new VariableEngineLogger();
    logger.warn('something is suspicious');

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const entry = parseLog(warnSpy.mock.calls[0][0] as string);
    expect(entry.level).toBe('warn');
    expect(entry.source).toBe('VariableEngine');
    expect(entry.message).toBe('something is suspicious');
  });

  it('includes meta fields in the output', () => {
    const logger = new VariableEngineLogger();
    logger.error('provider failed', { expression: 'camera.total', provider: 'CameraProvider' });

    const entry = parseLog(errorSpy.mock.calls[0][0] as string);
    expect(entry.expression).toBe('camera.total');
    expect(entry.provider).toBe('CameraProvider');
  });

  // ── Stack trace policy ─────────────────────────────────────────────────────

  it('strips the stack field from error output by default (production safety)', () => {
    const logger = new VariableEngineLogger(); // default: includeStackTrace=false
    logger.error('provider failed', { stack: 'Error: ...\n    at Object.<anonymous>' });

    const entry = parseLog(errorSpy.mock.calls[0][0] as string);
    expect(entry.stack).toBeUndefined();
  });

  it('strips the stack field from warn output by default', () => {
    const logger = new VariableEngineLogger();
    logger.warn('something', { stack: 'at foo (bar.ts:1:1)' });

    const entry = parseLog(warnSpy.mock.calls[0][0] as string);
    expect(entry.stack).toBeUndefined();
  });

  it('includes stack trace when includeStackTrace=true', () => {
    const logger = new VariableEngineLogger({ includeStackTrace: true });
    const stack = 'Error: boom\n    at Object.<anonymous>';
    logger.error('provider failed', { stack });

    const entry = parseLog(errorSpy.mock.calls[0][0] as string);
    expect(entry.stack).toBe(stack);
  });

  // ── Trace mode ─────────────────────────────────────────────────────────────

  it('trace() is a no-op when traceEnabled=false (default)', () => {
    const logger = new VariableEngineLogger();
    logger.trace('cache hit', { expression: 'camera.total' });

    expect(debugSpy).not.toHaveBeenCalled();
  });

  it('trace() emits to console.debug when traceEnabled=true', () => {
    const logger = new VariableEngineLogger({ traceEnabled: true });
    logger.trace('cache hit', { expression: 'camera.total' });

    expect(debugSpy).toHaveBeenCalledTimes(1);
    const entry = parseLog(debugSpy.mock.calls[0][0] as string);
    expect(entry.level).toBe('trace');
    expect(entry.source).toBe('VariableEngine');
    expect(entry.message).toBe('cache hit');
    expect(entry.expression).toBe('camera.total');
  });

  it('trace() suppresses stack trace by default even in trace mode', () => {
    const logger = new VariableEngineLogger({ traceEnabled: true });
    logger.trace('trace event', { stack: 'at foo (bar.ts:1)' });

    const entry = parseLog(debugSpy.mock.calls[0][0] as string);
    expect(entry.stack).toBeUndefined();
  });

  it('trace() includes stack when both traceEnabled and includeStackTrace are true', () => {
    const logger = new VariableEngineLogger({ traceEnabled: true, includeStackTrace: true });
    const stack = 'at foo (bar.ts:1)';
    logger.trace('trace event', { stack });

    const entry = parseLog(debugSpy.mock.calls[0][0] as string);
    expect(entry.stack).toBe(stack);
  });

  // ── Console routing ────────────────────────────────────────────────────────

  it('routes error() to console.error', () => {
    new VariableEngineLogger().error('err');
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it('routes warn() to console.warn', () => {
    new VariableEngineLogger().warn('warn');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(debugSpy).not.toHaveBeenCalled();
  });
});

// ─── NullVariableLogger ───────────────────────────────────────────────────────

describe('NullVariableLogger', () => {
  it('does not call any console method', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);

    const logger = new NullVariableLogger();
    logger.error('should be silent');
    logger.warn('should be silent');
    logger.trace('should be silent');

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(debugSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
    warnSpy.mockRestore();
    debugSpy.mockRestore();
  });
});
