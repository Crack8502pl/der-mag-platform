/**
 * Variable Engine – IHierarchyTraversalService (PR-4 scope)
 *
 * DI contract for any service that can answer parent/children/depth/path
 * queries on a generic entity hierarchy.
 *
 * The interface is deliberately domain-agnostic: the variable engine core
 * must not depend on any specific domain (e.g. tasks, contracts).  Concrete
 * implementations (e.g. `TaskRelationshipTraversalService`) adapt real
 * domain services to this contract.
 *
 * ## Cycle protection
 *
 * Implementations MUST detect cycles and stop traversal instead of looping
 * indefinitely.  The depth of the visited-set is the caller's concern; each
 * method documents its own cycle-detection behaviour.
 */

// ─── Node ─────────────────────────────────────────────────────────────────────

/**
 * A lightweight snapshot of one node in the hierarchy.
 * Only the ID fields needed for traversal are required.
 */
export interface HierarchyNode {
  /** Stable, unique identifier for this node. */
  readonly id: number;
  /** Direct parent node ID, or `undefined` if this node is a root. */
  readonly parentId?: number;
  /** Direct children node IDs (may be empty). */
  readonly childrenIds: ReadonlyArray<number>;
}

// ─── Service interface ────────────────────────────────────────────────────────

export interface IHierarchyTraversalService {
  /**
   * Return the direct parent ID of the given entity, or `undefined` when the
   * entity is a root (has no parent).
   *
   * @param entityId   – ID of the entity to look up.
   * @param entityType – Domain type of the entity (e.g. `'task'`).
   */
  getParentId(entityId: number, entityType: string): Promise<number | undefined>;

  /**
   * Return the IDs of all direct children of the given entity.
   * Returns an empty array when the entity has no children.
   *
   * @param entityId   – ID of the entity to look up.
   * @param entityType – Domain type of the entity.
   */
  getChildrenIds(entityId: number, entityType: string): Promise<number[]>;

  /**
   * Return the depth of the given entity in the hierarchy tree.
   *
   * A root node (no parent) has depth `0`.  Each level down adds `1`.
   *
   * Implementations MUST guard against cycles: if a cycle is detected,
   * traversal stops and the depth computed up to that point is returned.
   *
   * @param entityId   – ID of the entity.
   * @param entityType – Domain type of the entity.
   */
  getDepth(entityId: number, entityType: string): Promise<number>;

  /**
   * Return the ordered path from the root to (and including) the given entity
   * as an array of entity IDs.
   *
   * Example – entity 3 in the chain 1 → 2 → 3 returns `[1, 2, 3]`.
   *
   * Implementations MUST guard against cycles: traversal stops when a
   * previously-seen node is encountered.
   *
   * @param entityId   – ID of the entity.
   * @param entityType – Domain type of the entity.
   */
  getAncestorPath(entityId: number, entityType: string): Promise<number[]>;
}
