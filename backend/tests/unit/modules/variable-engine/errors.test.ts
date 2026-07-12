/**
 * Unit tests – VariableEngine errors
 */

import {
  VariableEngineError,
  VariableParseError,
  NamespaceConflictError,
  VariableResolutionError
} from '../../../../src/modules/variable-engine/errors';

describe('VariableEngine error classes', () => {
  describe('VariableEngineError', () => {
    it('is instanceof Error', () => {
      const e = new VariableEngineError('oops');
      expect(e).toBeInstanceOf(Error);
      expect(e).toBeInstanceOf(VariableEngineError);
    });

    it('sets message and name', () => {
      const e = new VariableEngineError('test');
      expect(e.message).toBe('test');
      expect(e.name).toBe('VariableEngineError');
    });
  });

  describe('VariableParseError', () => {
    it('is instanceof VariableEngineError', () => {
      const e = new VariableParseError('${bad', 'unclosed brace');
      expect(e).toBeInstanceOf(VariableEngineError);
      expect(e).toBeInstanceOf(VariableParseError);
    });

    it('includes template and message in the error text', () => {
      const e = new VariableParseError('${bad', 'unclosed brace');
      expect(e.message).toContain('${bad');
      expect(e.message).toContain('unclosed brace');
      expect(e.template).toBe('${bad');
    });

    it('has correct name', () => {
      const e = new VariableParseError('t', 'm');
      expect(e.name).toBe('VariableParseError');
    });
  });

  describe('NamespaceConflictError', () => {
    it('is instanceof VariableEngineError', () => {
      const e = new NamespaceConflictError('camera', 'ProviderA', 'ProviderB');
      expect(e).toBeInstanceOf(VariableEngineError);
    });

    it('exposes namespace, existingProvider and incomingProvider', () => {
      const e = new NamespaceConflictError('camera', 'ProviderA', 'ProviderB');
      expect(e.namespace).toBe('camera');
      expect(e.existingProvider).toBe('ProviderA');
      expect(e.incomingProvider).toBe('ProviderB');
    });

    it('includes all three identifiers in the message', () => {
      const e = new NamespaceConflictError('fiber', 'Old', 'New');
      expect(e.message).toContain('fiber');
      expect(e.message).toContain('Old');
      expect(e.message).toContain('New');
    });

    it('has correct name', () => {
      const e = new NamespaceConflictError('ns', 'a', 'b');
      expect(e.name).toBe('NamespaceConflictError');
    });
  });

  describe('VariableResolutionError', () => {
    it('is instanceof VariableEngineError', () => {
      const e = new VariableResolutionError('camera.total', 'provider timeout');
      expect(e).toBeInstanceOf(VariableEngineError);
    });

    it('exposes expression', () => {
      const e = new VariableResolutionError('x.y', 'reason');
      expect(e.expression).toBe('x.y');
    });

    it('includes expression and reason in message', () => {
      const e = new VariableResolutionError('x.y', 'reason');
      expect(e.message).toContain('x.y');
      expect(e.message).toContain('reason');
    });

    it('has correct name', () => {
      const e = new VariableResolutionError('e', 'm');
      expect(e.name).toBe('VariableResolutionError');
    });
  });
});
