/**
 * Variable Engine – typed error classes
 *
 * All errors thrown by the engine extend `VariableEngineError` so callers
 * can distinguish engine errors from unrelated runtime errors with a single
 * `instanceof` check.
 */

// ─── Base ─────────────────────────────────────────────────────────────────────

export class VariableEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VariableEngineError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Parser errors ────────────────────────────────────────────────────────────

export class VariableParseError extends VariableEngineError {
  constructor(
    public readonly template: string,
    message: string
  ) {
    super(`VariableParser: ${message} (template: "${template}")`);
    this.name = 'VariableParseError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Registry errors ──────────────────────────────────────────────────────────

export class NamespaceConflictError extends VariableEngineError {
  constructor(
    public readonly namespace: string,
    public readonly existingProvider: string,
    public readonly incomingProvider: string
  ) {
    super(
      `VariableRegistry: namespace "${namespace}" is already registered by ` +
        `"${existingProvider}" – cannot register "${incomingProvider}"`
    );
    this.name = 'NamespaceConflictError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Resolution errors ────────────────────────────────────────────────────────

export class VariableResolutionError extends VariableEngineError {
  constructor(
    public readonly expression: string,
    message: string
  ) {
    super(`VariableResolver: cannot resolve "${expression}" – ${message}`);
    this.name = 'VariableResolutionError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
