/**
 * Variable Engine – UserVariableProvider (PR-6 scope)
 *
 * Resolves `user.*` variable expressions by delegating to an injected
 * `IUserDataService`.
 *
 * The `user.*` namespace exposes metadata about the user associated with the
 * current entity (e.g. the creator or primary assignee of a contract / task).
 *
 * ## Supported expressions
 *
 * | Expression    | Type   | Description                                         |
 * |---------------|--------|-----------------------------------------------------|
 * | `user.name`   | string | User's full display name.                           |
 * | `user.email`  | string | User's email address.                               |
 * | `user.role`   | string | User's role (e.g. `"admin"`, `"technician"`).       |
 *
 * ## Soft-fail
 *
 * Returns `undefined` for unrecognised field names, when `entityId` is
 * missing/invalid, or when the data service returns no data.  Never throws.
 *
 * ## DI
 *
 * Inject a concrete `IUserDataService` via the constructor.
 */

import { AbstractVariableProvider } from '../AbstractVariableProvider';
import type { VariableContext, VariableValue } from '../../contracts';
import type { IUserDataService, UserData } from './IUserDataService';
import { DataFetchDeduplicator } from '../DataFetchDeduplicator';

/** All field paths exposed under the `user` namespace. */
type UserField =
  | 'name'
  | 'email'
  | 'role';

const SUPPORTED_FIELDS: ReadonlySet<string> = new Set<UserField>([
  'name',
  'email',
  'role',
]);

export class UserVariableProvider extends AbstractVariableProvider {
  readonly namespaces = ['user'] as const;

  private readonly userService: IUserDataService;
  private readonly deduplicator = new DataFetchDeduplicator<UserData>();

  /**
   * @param userService – Injected user data service (DI, not static singleton).
   */
  constructor(userService: IUserDataService) {
    super();
    this.userService = userService;
  }

  async resolve(expression: string, context: VariableContext): Promise<VariableValue> {
    const field = this.extractField(expression);

    if (!SUPPORTED_FIELDS.has(field)) {
      return undefined;
    }

    const entityId = this.parseEntityId(context.entityId);
    if (entityId === undefined) {
      return undefined;
    }

    const entityType = context.entityType ?? '';
    const entityKey = `${entityId}:${entityType}`;
    const data = await this.deduplicator.fetch(entityKey, () =>
      this.userService.getUserData(entityId, entityType)
    );

    if (data === undefined) {
      return undefined;
    }

    return this.pick(field as UserField, data);
  }

  // ─── Field picker ─────────────────────────────────────────────────────────

  private pick(field: UserField, data: UserData): VariableValue {
    switch (field) {
      case 'name':
        return data.name;
      case 'email':
        return data.email;
      case 'role':
        return data.role;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  // parseEntityId is inherited from AbstractVariableProvider.
}
