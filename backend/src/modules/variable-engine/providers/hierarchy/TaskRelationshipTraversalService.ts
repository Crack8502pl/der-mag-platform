/**
 * Variable Engine – TaskRelationshipTraversalService (PR-4 scope)
 *
 * Adapts the existing `TaskRelationshipService` (which operates on task
 * entities and uses TypeORM) to the domain-agnostic
 * `IHierarchyTraversalService` contract required by the variable engine.
 *
 * ## Cycle protection
 *
 * `getDepth` and `getAncestorPath` use a `visited` Set that is passed down
 * each recursive call.  If the current node has already been visited, the
 * traversal stops immediately.  This caps the worst-case recursion to O(N)
 * where N is the number of distinct nodes encountered.
 *
 * ## N+1 mitigation
 *
 * Each call to `getDepth` / `getAncestorPath` issues one DB query per level.
 * Callers that need both values should call `getAncestorPath` and derive the
 * depth from its length – that is exactly what `HierarchyVariableProvider`
 * does.  Hierarchy results are further cached by the engine's `L1VariableCache`
 * so repeated template evaluations for the same entity do not hit the DB.
 *
 * ## DI usage
 *
 * Inject an instance of `TaskRelationshipService` (NOT the static default
 * export) into the constructor so the service can be mocked in tests.
 */

import type { IHierarchyTraversalService } from './IHierarchyTraversalService';

/** Minimal subset of TaskRelationshipService required for traversal. */
export interface ITaskRelationshipRepository {
  getParents(childTaskId: number): Promise<Array<{ parentTaskId: number }>>;
  getChildren(parentTaskId: number): Promise<Array<{ childTaskId: number }>>;
}

/** Maximum allowed hierarchy depth before cycle-break kicks in (safety cap). */
const MAX_DEPTH = 100;

export class TaskRelationshipTraversalService implements IHierarchyTraversalService {
  private readonly repo: ITaskRelationshipRepository;

  /**
   * @param repo – A `TaskRelationshipService` instance (or compatible stub).
   *               Must NOT be the module-level static singleton.
   */
  constructor(repo: ITaskRelationshipRepository) {
    this.repo = repo;
  }

  // ─── IHierarchyTraversalService ───────────────────────────────────────────

  async getParentId(entityId: number, _entityType: string): Promise<number | undefined> {
    const parents = await this.repo.getParents(entityId);
    // A task may have multiple parents; we expose the first one (primary parent).
    return parents[0]?.parentTaskId;
  }

  async getChildrenIds(entityId: number, _entityType: string): Promise<number[]> {
    const children = await this.repo.getChildren(entityId);
    return children.map((c) => c.childTaskId);
  }

  async getDepth(entityId: number, entityType: string): Promise<number> {
    const path = await this.getAncestorPath(entityId, entityType);
    // Path includes the entity itself; depth = len - 1, root = 0.
    return Math.max(0, path.length - 1);
  }

  async getAncestorPath(entityId: number, entityType: string): Promise<number[]> {
    const visited = new Set<number>();
    const path: number[] = [];
    await this.walkUp(entityId, entityType, visited, path);
    return path.reverse();
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────

  /**
   * Recursively walks up the parent chain, collecting node IDs in reverse
   * order (leaf → root).  `path` is reversed by the caller.
   */
  private async walkUp(
    entityId: number,
    entityType: string,
    visited: Set<number>,
    path: number[]
  ): Promise<void> {
    if (visited.has(entityId) || visited.size >= MAX_DEPTH) {
      // Cycle detected or safety cap reached – stop traversal.
      return;
    }

    visited.add(entityId);
    path.push(entityId);

    const parentId = await this.getParentId(entityId, entityType);
    if (parentId !== undefined) {
      await this.walkUp(parentId, entityType, visited, path);
    }
  }
}
