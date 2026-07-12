/**
 * Variable Engine – HierarchyVariableProvider (PR-4 scope)
 *
 * Resolves `hierarchy.*` variable expressions by delegating to an injected
 * `IHierarchyTraversalService`.
 *
 * ## Supported expressions
 *
 * | Expression             | Type   | Description                                        |
 * |------------------------|--------|----------------------------------------------------|
 * | `hierarchy.parent`     | number | Direct parent entity ID; `undefined` if root.      |
 * | `hierarchy.children`   | number | Count of direct children.                          |
 * | `hierarchy.depth`      | number | Depth from root (root = 0).                        |
 * | `hierarchy.path`       | string | Slash-separated ancestor path, e.g. `"1/2/3"`.    |
 *
 * ## Cache
 *
 * The provider itself is stateless.  Caching is handled by the engine's
 * `VariableResolver` (L1 cache) so hierarchy results are not re-fetched for
 * the same entity within one evaluation pass.
 *
 * ## Soft-fail
 *
 * Returns `undefined` for unrecognised field names or when `entityId` is
 * missing/invalid in the context.  Never throws – consistent with the engine
 * contract.
 *
 * ## DI
 *
 * Inject a concrete `IHierarchyTraversalService` (e.g.
 * `TaskRelationshipTraversalService`) via the constructor.
 */

import { AbstractVariableProvider } from '../AbstractVariableProvider';
import type { VariableContext, VariableValue } from '../../contracts';
import type { IHierarchyTraversalService } from './IHierarchyTraversalService';

/** All field names exposed under the `hierarchy` namespace. */
type HierarchyField = 'parent' | 'children' | 'depth' | 'path';

const SUPPORTED_FIELDS: ReadonlySet<string> = new Set<HierarchyField>([
  'parent',
  'children',
  'depth',
  'path',
]);

export class HierarchyVariableProvider extends AbstractVariableProvider {
  readonly namespaces = ['hierarchy'] as const;

  private readonly traversal: IHierarchyTraversalService;

  /**
   * @param traversal – Injected traversal service (DI, not static singleton).
   */
  constructor(traversal: IHierarchyTraversalService) {
    super();
    this.traversal = traversal;
  }

  async resolve(expression: string, context: VariableContext): Promise<VariableValue> {
    const field = this.extractField(expression);

    // Guard: unknown field → soft-fail.
    if (!SUPPORTED_FIELDS.has(field)) {
      return undefined;
    }

    // Guard: entityId must be a numeric-parseable value.
    const entityId = this.parseEntityId(context.entityId);
    if (entityId === undefined) {
      return undefined;
    }

    const entityType = context.entityType ?? '';

    switch (field as HierarchyField) {
      case 'parent':
        return this.resolveParent(entityId, entityType);
      case 'children':
        return this.resolveChildren(entityId, entityType);
      case 'depth':
        return this.resolveDepth(entityId, entityType);
      case 'path':
        return this.resolvePath(entityId, entityType);
    }
  }

  // ─── Field resolvers ──────────────────────────────────────────────────────

  private async resolveParent(entityId: number, entityType: string): Promise<VariableValue> {
    return this.traversal.getParentId(entityId, entityType);
  }

  private async resolveChildren(entityId: number, entityType: string): Promise<VariableValue> {
    const ids = await this.traversal.getChildrenIds(entityId, entityType);
    return ids.length;
  }

  private async resolveDepth(entityId: number, entityType: string): Promise<VariableValue> {
    return this.traversal.getDepth(entityId, entityType);
  }

  private async resolvePath(entityId: number, entityType: string): Promise<VariableValue> {
    const path = await this.traversal.getAncestorPath(entityId, entityType);
    return path.join('/');
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Convert `context.entityId` to a `number`.
   *
   * Returns `undefined` for `undefined`, empty strings, or non-numeric strings.
   */
  private parseEntityId(entityId: number | string | undefined): number | undefined {
    if (entityId === undefined) return undefined;
    if (typeof entityId === 'number') return Number.isFinite(entityId) ? entityId : undefined;
    const parsed = Number(entityId);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
