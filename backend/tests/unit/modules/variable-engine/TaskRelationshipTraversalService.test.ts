/**
 * Unit tests – TaskRelationshipTraversalService (PR-4)
 *
 * Covers:
 * - getParentId (no parent, single parent)
 * - getChildrenIds (no children, multiple children)
 * - getDepth (root, single level, multi-level)
 * - getAncestorPath (root, chain, cycle protection)
 */

import { TaskRelationshipTraversalService } from '../../../../src/modules/variable-engine/providers/hierarchy/TaskRelationshipTraversalService';
import type { ITaskRelationshipRepository } from '../../../../src/modules/variable-engine/providers/hierarchy/TaskRelationshipTraversalService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a stub repository from a simple adjacency-list map.
 *
 * @param parentMap  childId → parentId (undefined = root)
 * @param childMap   parentId → childId[]
 */
function makeRepo(
  parentMap: Record<number, number | undefined>,
  childMap: Record<number, number[]> = {}
): ITaskRelationshipRepository {
  return {
    getParents: jest.fn().mockImplementation(async (childId: number) => {
      const parentId = parentMap[childId];
      return parentId !== undefined ? [{ parentTaskId: parentId }] : [];
    }),
    getChildren: jest.fn().mockImplementation(async (parentId: number) => {
      const children = childMap[parentId] ?? [];
      return children.map((id) => ({ childTaskId: id }));
    }),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TaskRelationshipTraversalService', () => {
  // ── getParentId ──────────────────────────────────────────────────────────────

  describe('getParentId', () => {
    it('returns undefined when entity has no parent (root)', async () => {
      const repo = makeRepo({ 1: undefined });
      const svc = new TaskRelationshipTraversalService(repo);
      expect(await svc.getParentId(1, 'task')).toBeUndefined();
    });

    it('returns the parent ID when entity has a parent', async () => {
      const repo = makeRepo({ 2: 1 });
      const svc = new TaskRelationshipTraversalService(repo);
      expect(await svc.getParentId(2, 'task')).toBe(1);
    });

    it('returns the first parent when multiple exist', async () => {
      const repo: ITaskRelationshipRepository = {
        getParents: jest.fn().mockResolvedValue([{ parentTaskId: 10 }, { parentTaskId: 20 }]),
        getChildren: jest.fn().mockResolvedValue([]),
      };
      const svc = new TaskRelationshipTraversalService(repo);
      expect(await svc.getParentId(5, 'task')).toBe(10);
    });
  });

  // ── getChildrenIds ────────────────────────────────────────────────────────────

  describe('getChildrenIds', () => {
    it('returns empty array when entity has no children', async () => {
      const repo = makeRepo({}, {});
      const svc = new TaskRelationshipTraversalService(repo);
      expect(await svc.getChildrenIds(1, 'task')).toEqual([]);
    });

    it('returns child IDs', async () => {
      const repo = makeRepo({}, { 1: [2, 3, 4] });
      const svc = new TaskRelationshipTraversalService(repo);
      expect(await svc.getChildrenIds(1, 'task')).toEqual([2, 3, 4]);
    });
  });

  // ── getDepth ─────────────────────────────────────────────────────────────────

  describe('getDepth', () => {
    it('returns 0 for a root entity', async () => {
      const repo = makeRepo({ 1: undefined });
      const svc = new TaskRelationshipTraversalService(repo);
      expect(await svc.getDepth(1, 'task')).toBe(0);
    });

    it('returns 1 for a first-level child', async () => {
      // 1 → 2
      const repo = makeRepo({ 1: undefined, 2: 1 });
      const svc = new TaskRelationshipTraversalService(repo);
      expect(await svc.getDepth(2, 'task')).toBe(1);
    });

    it('returns correct depth for a multi-level chain', async () => {
      // 1 → 2 → 3 → 4
      const repo = makeRepo({ 1: undefined, 2: 1, 3: 2, 4: 3 });
      const svc = new TaskRelationshipTraversalService(repo);
      expect(await svc.getDepth(4, 'task')).toBe(3);
    });
  });

  // ── getAncestorPath ───────────────────────────────────────────────────────────

  describe('getAncestorPath', () => {
    it('returns [entityId] for a root entity', async () => {
      const repo = makeRepo({ 1: undefined });
      const svc = new TaskRelationshipTraversalService(repo);
      expect(await svc.getAncestorPath(1, 'task')).toEqual([1]);
    });

    it('returns full path from root to entity', async () => {
      // 1 → 2 → 3
      const repo = makeRepo({ 1: undefined, 2: 1, 3: 2 });
      const svc = new TaskRelationshipTraversalService(repo);
      expect(await svc.getAncestorPath(3, 'task')).toEqual([1, 2, 3]);
    });

    it('returns 4-level path correctly', async () => {
      // 10 → 20 → 30 → 40
      const repo = makeRepo({ 10: undefined, 20: 10, 30: 20, 40: 30 });
      const svc = new TaskRelationshipTraversalService(repo);
      expect(await svc.getAncestorPath(40, 'task')).toEqual([10, 20, 30, 40]);
    });

    it('stops traversal when a cycle is detected', async () => {
      // Create a cycle: 1 → 2 → 3 → 1 (but 1 is reported as child of 3)
      const repo: ITaskRelationshipRepository = {
        getParents: jest.fn().mockImplementation(async (id: number) => {
          // 1's parent is 3 → cycle: 1 → 2 → 3 → 1
          const cyclicParents: Record<number, number> = { 2: 1, 3: 2, 1: 3 };
          const parentId = cyclicParents[id];
          return parentId !== undefined ? [{ parentTaskId: parentId }] : [];
        }),
        getChildren: jest.fn().mockResolvedValue([]),
      };
      const svc = new TaskRelationshipTraversalService(repo);

      // Should not loop forever; just return the path up to the cycle detection
      const path = await svc.getAncestorPath(2, 'task');
      // path must be finite and contain visited nodes without repetition
      expect(path.length).toBeGreaterThan(0);
      // No duplicate IDs in path
      expect(new Set(path).size).toBe(path.length);
    });
  });
});
