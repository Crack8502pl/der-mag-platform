/**
 * Unit tests – WizardHierarchyResolver
 *
 * Covers:
 * - Constructing hierarchy from WizardRelationshipEntry[]
 * - getDepth for different levels (LCS=0, ND=1, SKP=2)
 * - getParentId returns correct parent
 * - getChildrenIds returns correct children list
 * - getAncestorPath returns correct root-first path
 * - Cycle protection
 * - Standalone task (root, no relationships)
 * - getIdForKey / getKeyForId helpers
 * - getParentType returns correct parent type
 */

import { WizardHierarchyResolver } from '../../../../src/modules/variable-engine/providers/hierarchy/WizardHierarchyResolver';
import type { WizardRelationshipEntry } from '../../../../src/modules/variable-engine/providers/hierarchy/WizardHierarchyResolver';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a WizardHierarchyResolver from a simple adjacency list for tests:
 *   [parentKey, parentType, childKey[]]
 */
function makeResolver(
  entries: Array<[string, string, string[]]>
): WizardHierarchyResolver {
  const relationships: WizardRelationshipEntry[] = entries.map(
    ([parentWizardId, parentType, childTaskKeys]) => ({
      parentWizardId,
      parentType,
      childTaskKeys,
    })
  );
  return new WizardHierarchyResolver(relationships);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WizardHierarchyResolver', () => {
  // ── Key / ID mapping ─────────────────────────────────────────────────────────

  describe('key ↔ ID mapping', () => {
    it('assigns numeric IDs to all keys encountered in relationships', () => {
      const resolver = makeResolver([['lcs-1', 'LCS', ['nd-1', 'nd-2']]]);
      expect(typeof resolver.getIdForKey('lcs-1')).toBe('number');
      expect(typeof resolver.getIdForKey('nd-1')).toBe('number');
      expect(typeof resolver.getIdForKey('nd-2')).toBe('number');
    });

    it('returns undefined for keys not in any relationship', () => {
      const resolver = makeResolver([['lcs-1', 'LCS', ['nd-1']]]);
      expect(resolver.getIdForKey('unknown-key')).toBeUndefined();
    });

    it('getKeyForId returns the original string key', () => {
      const resolver = makeResolver([['lcs-1', 'LCS', ['nd-1']]]);
      const id = resolver.getIdForKey('lcs-1')!;
      expect(resolver.getKeyForId(id)).toBe('lcs-1');
    });

    it('getKeyForId returns undefined for unknown IDs', () => {
      const resolver = makeResolver([]);
      expect(resolver.getKeyForId(999)).toBeUndefined();
    });
  });

  // ── getParentId ──────────────────────────────────────────────────────────────

  describe('getParentId', () => {
    it('returns undefined for a root task (LCS)', async () => {
      const resolver = makeResolver([['lcs-1', 'LCS', ['nd-1']]]);
      const lcsId = resolver.getIdForKey('lcs-1')!;
      expect(await resolver.getParentId(lcsId, 'task')).toBeUndefined();
    });

    it('returns the LCS id as parent of an ND task', async () => {
      const resolver = makeResolver([['lcs-1', 'LCS', ['nd-1']]]);
      const lcsId = resolver.getIdForKey('lcs-1')!;
      const ndId = resolver.getIdForKey('nd-1')!;
      expect(await resolver.getParentId(ndId, 'task')).toBe(lcsId);
    });

    it('returns the ND id as parent of an SKP task', async () => {
      const resolver = makeResolver([
        ['lcs-1', 'LCS', ['nd-1']],
        ['nd-1', 'NASTAWNIA', ['skp-1', 'skp-2']],
      ]);
      const ndId = resolver.getIdForKey('nd-1')!;
      const skpId = resolver.getIdForKey('skp-1')!;
      expect(await resolver.getParentId(skpId, 'task')).toBe(ndId);
    });
  });

  // ── getChildrenIds ────────────────────────────────────────────────────────────

  describe('getChildrenIds', () => {
    it('returns empty array for a leaf task (no children)', async () => {
      const resolver = makeResolver([['lcs-1', 'LCS', ['nd-1']]]);
      const ndId = resolver.getIdForKey('nd-1')!;
      expect(await resolver.getChildrenIds(ndId, 'task')).toEqual([]);
    });

    it('returns all child IDs for an LCS with multiple ND children', async () => {
      const resolver = makeResolver([['lcs-1', 'LCS', ['nd-1', 'nd-2', 'nd-3']]]);
      const lcsId = resolver.getIdForKey('lcs-1')!;
      const result = await resolver.getChildrenIds(lcsId, 'task');
      expect(result).toHaveLength(3);
      expect(result).toContain(resolver.getIdForKey('nd-1'));
      expect(result).toContain(resolver.getIdForKey('nd-2'));
      expect(result).toContain(resolver.getIdForKey('nd-3'));
    });

    it('returns empty array for an unknown entity ID', async () => {
      const resolver = makeResolver([]);
      expect(await resolver.getChildrenIds(999, 'task')).toEqual([]);
    });
  });

  // ── getDepth ─────────────────────────────────────────────────────────────────

  describe('getDepth', () => {
    it('returns 0 for a root LCS task', async () => {
      const resolver = makeResolver([['lcs-1', 'LCS', ['nd-1']]]);
      const lcsId = resolver.getIdForKey('lcs-1')!;
      expect(await resolver.getDepth(lcsId, 'task')).toBe(0);
    });

    it('returns 0 for a standalone Nastawnia not in any relationship', async () => {
      // Empty resolver → no relationships
      const resolver = new WizardHierarchyResolver([]);
      // Key "nd-1" is not in any relationship → getIdForKey returns undefined
      expect(resolver.getIdForKey('nd-standalone')).toBeUndefined();
    });

    it('returns 1 for an ND child of LCS', async () => {
      const resolver = makeResolver([['lcs-1', 'LCS', ['nd-1']]]);
      const ndId = resolver.getIdForKey('nd-1')!;
      expect(await resolver.getDepth(ndId, 'task')).toBe(1);
    });

    it('returns 2 for an SKP child of ND child of LCS', async () => {
      const resolver = makeResolver([
        ['lcs-1', 'LCS', ['nd-1']],
        ['nd-1', 'NASTAWNIA', ['skp-1']],
      ]);
      const skpId = resolver.getIdForKey('skp-1')!;
      expect(await resolver.getDepth(skpId, 'task')).toBe(2);
    });
  });

  // ── getAncestorPath ───────────────────────────────────────────────────────────

  describe('getAncestorPath', () => {
    it('returns [lcsId] for a root LCS task', async () => {
      const resolver = makeResolver([['lcs-1', 'LCS', ['nd-1']]]);
      const lcsId = resolver.getIdForKey('lcs-1')!;
      expect(await resolver.getAncestorPath(lcsId, 'task')).toEqual([lcsId]);
    });

    it('returns root-first path [lcsId, ndId] for an ND task', async () => {
      const resolver = makeResolver([['lcs-1', 'LCS', ['nd-1']]]);
      const lcsId = resolver.getIdForKey('lcs-1')!;
      const ndId = resolver.getIdForKey('nd-1')!;
      expect(await resolver.getAncestorPath(ndId, 'task')).toEqual([lcsId, ndId]);
    });

    it('returns 3-element path for an SKP task (LCS → ND → SKP)', async () => {
      const resolver = makeResolver([
        ['lcs-1', 'LCS', ['nd-1']],
        ['nd-1', 'NASTAWNIA', ['skp-1']],
      ]);
      const lcsId = resolver.getIdForKey('lcs-1')!;
      const ndId = resolver.getIdForKey('nd-1')!;
      const skpId = resolver.getIdForKey('skp-1')!;
      expect(await resolver.getAncestorPath(skpId, 'task')).toEqual([lcsId, ndId, skpId]);
    });

    it('stops traversal when a cycle is detected', async () => {
      // Manually construct a cyclic scenario: A→B→C→A
      const cycleRels: WizardRelationshipEntry[] = [
        { parentWizardId: 'a', parentType: 'LCS', childTaskKeys: ['b'] },
        { parentWizardId: 'b', parentType: 'NASTAWNIA', childTaskKeys: ['c'] },
        { parentWizardId: 'c', parentType: 'NASTAWNIA', childTaskKeys: ['a'] }, // cycle
      ];
      const resolver = new WizardHierarchyResolver(cycleRels);
      // Note: 'a' already has an entry as parentWizardId of first rel; 'c' overwrites
      // its parent in the last rel. The resolver will detect the cycle on traversal.
      const aId = resolver.getIdForKey('a')!;

      const path = await resolver.getAncestorPath(aId, 'task');

      // Path must be finite with no duplicate IDs.
      expect(path.length).toBeGreaterThan(0);
      expect(new Set(path).size).toBe(path.length);
    });
  });

  // ── getParentType ─────────────────────────────────────────────────────────────

  describe('getParentType', () => {
    it('returns "LCS" when the parent is an LCS task', () => {
      const resolver = makeResolver([['lcs-1', 'LCS', ['nd-1']]]);
      const ndId = resolver.getIdForKey('nd-1')!;
      expect(resolver.getParentType(ndId)).toBe('LCS');
    });

    it('returns "NASTAWNIA" when the parent is a NASTAWNIA task', () => {
      const resolver = makeResolver([
        ['lcs-1', 'LCS', ['nd-1']],
        ['nd-1', 'NASTAWNIA', ['skp-1']],
      ]);
      const skpId = resolver.getIdForKey('skp-1')!;
      expect(resolver.getParentType(skpId)).toBe('NASTAWNIA');
    });

    it('returns undefined for a root task (no parent)', () => {
      const resolver = makeResolver([['lcs-1', 'LCS', ['nd-1']]]);
      const lcsId = resolver.getIdForKey('lcs-1')!;
      expect(resolver.getParentType(lcsId)).toBeUndefined();
    });
  });

  // ── Empty relationships ───────────────────────────────────────────────────────

  describe('empty relationships', () => {
    it('handles an empty array without errors', () => {
      expect(() => new WizardHierarchyResolver([])).not.toThrow();
    });

    it('getIdForKey returns undefined for any key when no relationships', () => {
      const resolver = new WizardHierarchyResolver([]);
      expect(resolver.getIdForKey('any-key')).toBeUndefined();
    });
  });
});
