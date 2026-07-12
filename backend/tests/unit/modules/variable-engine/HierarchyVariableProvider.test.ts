/**
 * Unit tests – HierarchyVariableProvider (PR-4)
 *
 * Covers:
 * - hierarchy.parent  (root, has parent)
 * - hierarchy.children (leaf, multiple children)
 * - hierarchy.depth   (0, 1, N)
 * - hierarchy.path    (root only, multi-level)
 * - soft-fail on unknown fields
 * - soft-fail when entityId is missing or non-numeric
 * - edge cases: empty string entityId, NaN, string numeric ID
 */

import { HierarchyVariableProvider } from '../../../../src/modules/variable-engine/providers/hierarchy/HierarchyVariableProvider';
import type { IHierarchyTraversalService } from '../../../../src/modules/variable-engine/providers/hierarchy/IHierarchyTraversalService';
import type { VariableContext } from '../../../../src/modules/variable-engine/contracts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTraversal(overrides: Partial<IHierarchyTraversalService> = {}): IHierarchyTraversalService {
  return {
    getParentId: jest.fn().mockResolvedValue(undefined),
    getChildrenIds: jest.fn().mockResolvedValue([]),
    getDepth: jest.fn().mockResolvedValue(0),
    getAncestorPath: jest.fn().mockResolvedValue([1]),
    ...overrides,
  };
}

function ctx(entityId: number | string | undefined, entityType = 'task'): VariableContext {
  return { entityId, entityType };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('HierarchyVariableProvider', () => {
  // ── Contract ─────────────────────────────────────────────────────────────────

  it('declares the "hierarchy" namespace', () => {
    const provider = new HierarchyVariableProvider(makeTraversal());
    expect(provider.namespaces).toContain('hierarchy');
  });

  // ── hierarchy.parent ──────────────────────────────────────────────────────────

  describe('hierarchy.parent', () => {
    it('returns undefined when entity is a root (no parent)', async () => {
      const traversal = makeTraversal({ getParentId: jest.fn().mockResolvedValue(undefined) });
      const provider = new HierarchyVariableProvider(traversal);
      expect(await provider.resolve('hierarchy.parent', ctx(1))).toBeUndefined();
    });

    it('returns the parent entity ID as a number', async () => {
      const traversal = makeTraversal({ getParentId: jest.fn().mockResolvedValue(42) });
      const provider = new HierarchyVariableProvider(traversal);
      expect(await provider.resolve('hierarchy.parent', ctx(5))).toBe(42);
    });

    it('passes entityType to the traversal service', async () => {
      const getParentId = jest.fn().mockResolvedValue(undefined);
      const provider = new HierarchyVariableProvider(makeTraversal({ getParentId }));
      await provider.resolve('hierarchy.parent', ctx(1, 'contract'));
      expect(getParentId).toHaveBeenCalledWith(1, 'contract');
    });

    it('accepts a string numeric entityId', async () => {
      const getParentId = jest.fn().mockResolvedValue(10);
      const provider = new HierarchyVariableProvider(makeTraversal({ getParentId }));
      expect(await provider.resolve('hierarchy.parent', ctx('7'))).toBe(10);
      expect(getParentId).toHaveBeenCalledWith(7, 'task');
    });
  });

  // ── hierarchy.children ────────────────────────────────────────────────────────

  describe('hierarchy.children', () => {
    it('returns 0 when entity has no children', async () => {
      const traversal = makeTraversal({ getChildrenIds: jest.fn().mockResolvedValue([]) });
      const provider = new HierarchyVariableProvider(traversal);
      expect(await provider.resolve('hierarchy.children', ctx(1))).toBe(0);
    });

    it('returns the count of direct children', async () => {
      const traversal = makeTraversal({ getChildrenIds: jest.fn().mockResolvedValue([2, 3, 4]) });
      const provider = new HierarchyVariableProvider(traversal);
      expect(await provider.resolve('hierarchy.children', ctx(1))).toBe(3);
    });
  });

  // ── hierarchy.depth ────────────────────────────────────────────────────────────

  describe('hierarchy.depth', () => {
    it('returns 0 for a root entity', async () => {
      const traversal = makeTraversal({ getDepth: jest.fn().mockResolvedValue(0) });
      const provider = new HierarchyVariableProvider(traversal);
      expect(await provider.resolve('hierarchy.depth', ctx(1))).toBe(0);
    });

    it('returns 1 for a first-level child', async () => {
      const traversal = makeTraversal({ getDepth: jest.fn().mockResolvedValue(1) });
      const provider = new HierarchyVariableProvider(traversal);
      expect(await provider.resolve('hierarchy.depth', ctx(2))).toBe(1);
    });

    it('returns N for a deeply nested entity', async () => {
      const traversal = makeTraversal({ getDepth: jest.fn().mockResolvedValue(5) });
      const provider = new HierarchyVariableProvider(traversal);
      expect(await provider.resolve('hierarchy.depth', ctx(10))).toBe(5);
    });
  });

  // ── hierarchy.path ─────────────────────────────────────────────────────────────

  describe('hierarchy.path', () => {
    it('returns the entityId as a string for a root entity', async () => {
      const traversal = makeTraversal({ getAncestorPath: jest.fn().mockResolvedValue([1]) });
      const provider = new HierarchyVariableProvider(traversal);
      expect(await provider.resolve('hierarchy.path', ctx(1))).toBe('1');
    });

    it('returns slash-separated IDs from root to entity', async () => {
      const traversal = makeTraversal({ getAncestorPath: jest.fn().mockResolvedValue([1, 2, 3]) });
      const provider = new HierarchyVariableProvider(traversal);
      expect(await provider.resolve('hierarchy.path', ctx(3))).toBe('1/2/3');
    });

    it('returns a multi-level path correctly', async () => {
      const traversal = makeTraversal({ getAncestorPath: jest.fn().mockResolvedValue([10, 20, 30, 40]) });
      const provider = new HierarchyVariableProvider(traversal);
      expect(await provider.resolve('hierarchy.path', ctx(40))).toBe('10/20/30/40');
    });
  });

  // ── Soft-fail cases ───────────────────────────────────────────────────────────

  describe('soft-fail', () => {
    it('returns undefined for an unknown field', async () => {
      const provider = new HierarchyVariableProvider(makeTraversal());
      expect(await provider.resolve('hierarchy.unknown', ctx(1))).toBeUndefined();
    });

    it('returns undefined when entityId is missing', async () => {
      const provider = new HierarchyVariableProvider(makeTraversal());
      expect(await provider.resolve('hierarchy.depth', ctx(undefined))).toBeUndefined();
    });

    it('returns undefined when entityId is a non-numeric string', async () => {
      const provider = new HierarchyVariableProvider(makeTraversal());
      expect(await provider.resolve('hierarchy.depth', ctx('abc'))).toBeUndefined();
    });

    it('returns undefined for an expression with no field segment', async () => {
      const provider = new HierarchyVariableProvider(makeTraversal());
      // "hierarchy" alone – no dot → extractField returns ''
      expect(await provider.resolve('hierarchy', ctx(1))).toBeUndefined();
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles entityId = 0', async () => {
      const getDepth = jest.fn().mockResolvedValue(0);
      const provider = new HierarchyVariableProvider(makeTraversal({ getDepth }));
      // 0 is a valid numeric entity id (edge case for falsy check)
      expect(await provider.resolve('hierarchy.depth', ctx(0))).toBe(0);
      expect(getDepth).toHaveBeenCalledWith(0, 'task');
    });

    it('uses empty string as entityType when not provided in context', async () => {
      const getParentId = jest.fn().mockResolvedValue(undefined);
      const provider = new HierarchyVariableProvider(makeTraversal({ getParentId }));
      await provider.resolve('hierarchy.parent', { entityId: 1 });
      expect(getParentId).toHaveBeenCalledWith(1, '');
    });

    it('traversal is only called once per field per resolve call', async () => {
      const getDepth = jest.fn().mockResolvedValue(2);
      const provider = new HierarchyVariableProvider(makeTraversal({ getDepth }));
      await provider.resolve('hierarchy.depth', ctx(1));
      expect(getDepth).toHaveBeenCalledTimes(1);
    });
  });
});
