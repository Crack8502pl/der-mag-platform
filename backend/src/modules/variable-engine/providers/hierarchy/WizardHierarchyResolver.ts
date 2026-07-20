/**
 * Variable Engine – WizardHierarchyResolver (in-memory hierarchy traversal)
 *
 * Implements `IHierarchyTraversalService` using `WizardRelationshipEntry[]`
 * data entirely in memory, without any DB access.  Used during the wizard
 * task-configuration step when tasks do not yet have DB-assigned numeric IDs.
 *
 * ## String → number mapping
 *
 * `IHierarchyTraversalService` uses `number` for `entityId`.  This resolver
 * assigns sequential numeric IDs to wizard string keys as it encounters them
 * while processing the relationships array, maintaining two bidirectional maps:
 *   - `keyToId: Map<string, number>` – look up a numeric ID by wizard key
 *   - `idToKey: Map<number, string>` – reverse look-up (ID → wizard key)
 *
 * ## Cycle protection
 *
 * `getAncestorPath` uses a `visited` Set identical to the one in
 * `TaskRelationshipTraversalService`.  If a node has already been visited,
 * traversal stops immediately, capping worst-case execution to O(N).
 */

import type { IHierarchyTraversalService } from './IHierarchyTraversalService';

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * One relationship entry from the wizard (matches `WizardTaskRelationship`
 * from the frontend wizard types).
 */
export interface WizardRelationshipEntry {
  parentWizardId: string;
  parentType: string;
  childTaskKeys: string[];
}

/** Maximum allowed hierarchy depth before cycle-break kicks in (safety cap). */
const MAX_DEPTH = 100;

// ─── WizardHierarchyResolver ──────────────────────────────────────────────────

export class WizardHierarchyResolver implements IHierarchyTraversalService {
  private readonly idToKey: Map<number, string> = new Map();
  private readonly keyToId: Map<string, number> = new Map();
  /** child numeric id → parent numeric id */
  private readonly parentMap: Map<number, number> = new Map();
  /** parent numeric id → direct children numeric ids */
  private readonly childrenMap: Map<number, number[]> = new Map();
  /**
   * child numeric id → type of the parent in that relationship
   * (e.g. 'LCS' | 'NASTAWNIA').  Used to determine `isChildOfLcs`.
   */
  private readonly parentTypeMap: Map<number, string> = new Map();

  constructor(relationships: WizardRelationshipEntry[]) {
    let nextId = 0;

    const getOrCreateId = (key: string): number => {
      if (!this.keyToId.has(key)) {
        const id = nextId++;
        this.keyToId.set(key, id);
        this.idToKey.set(id, key);
      }
      return this.keyToId.get(key)!;
    };

    for (const rel of relationships) {
      const parentId = getOrCreateId(rel.parentWizardId);

      if (!this.childrenMap.has(parentId)) {
        this.childrenMap.set(parentId, []);
      }

      for (const childKey of rel.childTaskKeys) {
        const childId = getOrCreateId(childKey);
        this.parentMap.set(childId, parentId);
        this.childrenMap.get(parentId)!.push(childId);
        this.parentTypeMap.set(childId, rel.parentType);
      }
    }
  }

  // ─── Key ↔ ID helpers ───────────────────────────────────────────────────────

  /** Map a wizard string key to its assigned numeric ID, or `undefined`. */
  getIdForKey(key: string): number | undefined {
    return this.keyToId.get(key);
  }

  /** Map a numeric ID back to its wizard string key, or `undefined`. */
  getKeyForId(id: number): string | undefined {
    return this.idToKey.get(id);
  }

  /**
   * Return the `parentType` stored for the given child entity ID
   * (e.g. `'LCS'` when the parent is an LCS task), or `undefined` for roots.
   */
  getParentType(entityId: number): string | undefined {
    return this.parentTypeMap.get(entityId);
  }

  // ─── IHierarchyTraversalService ───────────────────────────────────────────

  async getParentId(entityId: number, _entityType: string): Promise<number | undefined> {
    return this.parentMap.get(entityId);
  }

  async getChildrenIds(entityId: number, _entityType: string): Promise<number[]> {
    return this.childrenMap.get(entityId) ?? [];
  }

  async getDepth(entityId: number, entityType: string): Promise<number> {
    const path = await this.getAncestorPath(entityId, entityType);
    // Path includes the entity itself; depth = len - 1, root = 0.
    return Math.max(0, path.length - 1);
  }

  async getAncestorPath(entityId: number, _entityType: string): Promise<number[]> {
    const visited = new Set<number>();
    const path: number[] = [];
    let current: number | undefined = entityId;

    while (current !== undefined) {
      if (visited.has(current) || visited.size >= MAX_DEPTH) {
        // Cycle detected or safety cap reached – stop traversal.
        break;
      }
      visited.add(current);
      path.unshift(current); // prepend → root-first order
      current = this.parentMap.get(current);
    }

    return path;
  }
}
