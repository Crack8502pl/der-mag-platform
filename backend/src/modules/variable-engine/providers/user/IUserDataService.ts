/**
 * Variable Engine – IUserDataService (PR-6 scope)
 *
 * DI contract for any service that can answer user-domain queries
 * for a given entity.
 *
 * The `user.*` namespace exposes metadata about the user associated with the
 * current entity (e.g. the creator or assignee of a contract / task).
 */

/** Snapshot of user-domain data for one entity. */
export interface UserData {
  /** User's full display name. */
  readonly name: string;
  /** User's email address. */
  readonly email: string;
  /** User's role within the system (e.g. `"admin"`, `"technician"`). */
  readonly role: string;
}

export interface IUserDataService {
  /**
   * Return user-domain data for the given entity, or `undefined` when the
   * entity does not exist or has no associated user.
   *
   * Implementations MUST NOT throw – return `undefined` on error.
   *
   * @param entityId   – Numeric identifier of the entity.
   * @param entityType – Domain type (e.g. `'contract'`, `'task'`).
   */
  getUserData(entityId: number, entityType: string): Promise<UserData | undefined>;
}
