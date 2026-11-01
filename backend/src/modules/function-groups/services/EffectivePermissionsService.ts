// src/modules/function-groups/services/EffectivePermissionsService.ts
// Uprawnienia efektywne = uprawnienia roli + uprawnienia aktywnych funkcji.
// Funkcje wyłącznie DODAJĄ uprawnienia: akcja true w którymkolwiek źródle = true.
// Klucz "all" (administrator) pochodzi wyłącznie z roli.

import { Request } from 'express';
import { AppDataSource } from '../../../config/database';
import { User } from '../../../entities/User';
import { RolePermissions } from '../../../entities/Role';
import { UserFunctionGroup } from '../entities/UserFunctionGroup';

export interface ActiveFunctionGroup {
  id: number;
  key: string;
  name: string;
}

export interface EffectivePermissions {
  userId: number;
  roleName: string;
  rolePermissions: RolePermissions;
  permissions: RolePermissions;
  functionGroups: ActiveFunctionGroup[];
}

type MembershipPeriod = Pick<UserFunctionGroup, 'validFrom' | 'validTo'>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Cache tylko na czas jednego żądania – klucz to obiekt żądania.
const requestCache = new WeakMap<Request, { userId: number; result: Promise<EffectivePermissions | null> }>();

export class EffectivePermissionsService {
  /** Czy członkostwo obowiązuje w chwili `at` (valid_from <= at < valid_to lub valid_to puste). */
  static isMembershipActive(membership: MembershipPeriod, at: Date = new Date()): boolean {
    const from = new Date(membership.validFrom).getTime();
    if (Number.isNaN(from) || from > at.getTime()) return false;
    if (membership.validTo === null || membership.validTo === undefined) return true;
    return at.getTime() < new Date(membership.validTo).getTime();
  }

  /** Scala uprawnienia roli z uprawnieniami funkcji (tylko dodawanie, bez klucza "all"). */
  static merge(rolePermissions: RolePermissions | null | undefined, sources: RolePermissions[]): RolePermissions {
    const role: RolePermissions = isPlainObject(rolePermissions) ? rolePermissions : {};
    if (role.all === true) return role;

    let result: RolePermissions | null = null;
    for (const source of sources) {
      if (!isPlainObject(source)) continue;
      for (const [module, actions] of Object.entries(source)) {
        if (module === 'all' || !isPlainObject(actions)) continue;
        for (const [action, value] of Object.entries(actions)) {
          if (value !== true) continue;
          if (!result) result = JSON.parse(JSON.stringify(role)) as RolePermissions;
          const current = result[module];
          if (!isPlainObject(current)) result[module] = {};
          result[module][action] = true;
        }
      }
    }
    return result ?? role;
  }

  /** Uprawnienia efektywne użytkownika (rola + funkcje aktywne w chwili `at`). */
  static async get(userId: number, at: Date = new Date()): Promise<EffectivePermissions | null> {
    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: userId },
      relations: ['role', 'functionGroupMemberships', 'functionGroupMemberships.functionGroup'],
    });
    if (!user || !user.role) return null;

    const groups = new Map<number, UserFunctionGroup['functionGroup']>();
    for (const membership of Array.isArray(user.functionGroupMemberships) ? user.functionGroupMemberships : []) {
      const group = membership.functionGroup;
      if (!group || group.active !== true) continue;
      if (!this.isMembershipActive(membership, at)) continue;
      groups.set(group.id, group);
    }
    const activeGroups = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'pl'));

    const rolePermissions = (user.role.permissions || {}) as RolePermissions;
    return {
      userId: user.id,
      roleName: user.role.name,
      rolePermissions,
      permissions: this.merge(rolePermissions, activeGroups.map(group => group.permissions)),
      functionGroups: activeGroups.map(group => ({ id: group.id, key: group.key, name: group.name })),
    };
  }

  /** Uprawnienia efektywne zalogowanego użytkownika – liczone raz na żądanie. */
  static forRequest(req: Request): Promise<EffectivePermissions | null> {
    const userId = req.userId;
    if (!userId) return Promise.resolve(null);
    const cached = requestCache.get(req);
    if (cached && cached.userId === userId) return cached.result;
    const result = this.get(userId);
    requestCache.set(req, { userId, result });
    result.catch(() => requestCache.delete(req));
    return result;
  }
}
