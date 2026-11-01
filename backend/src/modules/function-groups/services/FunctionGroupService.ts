// src/modules/function-groups/services/FunctionGroupService.ts
// Zarządzanie funkcjami (grupami funkcyjnymi) i ich członkami. Każda zmiana trafia do audit_logs.

import { EntityManager, In, IsNull } from 'typeorm';
import { AppDataSource } from '../../../config/database';
import { User } from '../../../entities/User';
import { RolePermissions } from '../../../entities/Role';
import { FunctionGroup } from '../entities/FunctionGroup';
import { UserFunctionGroup } from '../entities/UserFunctionGroup';
import { ActiveFunctionGroup, EffectivePermissionsService } from './EffectivePermissionsService';

export const FUNCTION_GROUP_KEY_PATTERN = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;

export class FunctionGroupError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'FunctionGroupError';
  }
}

export interface FunctionGroupInput {
  key?: unknown;
  name?: unknown;
  description?: unknown;
  permissions?: unknown;
  active?: unknown;
}

export interface MemberInput {
  userId?: unknown;
  validFrom?: unknown;
  validTo?: unknown;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toIso = (value: Date | null | undefined): string | null => (value ? new Date(value).toISOString() : null);

/**
 * Walidacja uprawnień funkcji: ten sam format co roles.permissions
 * ({ moduł: { akcja: boolean } }), klucz "all" jest zabroniony.
 * Zwraca komunikat błędu albo null.
 */
export function validateFunctionGroupPermissions(permissions: unknown): string | null {
  if (!isPlainObject(permissions)) return 'Uprawnienia muszą być obiektem { moduł: { akcja: true/false } }';
  for (const [module, actions] of Object.entries(permissions)) {
    if (module === 'all') return 'Funkcja nie może mieć uprawnienia „wszystko” (all)';
    if (!isPlainObject(actions)) return `Uprawnienia modułu „${module}” muszą być obiektem akcji`;
    for (const [action, value] of Object.entries(actions)) {
      if (typeof value !== 'boolean') return `Wartość uprawnienia „${module}.${action}” musi być true albo false`;
    }
  }
  return null;
}

function parseDate(value: unknown, field: string): Date | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' && !(value instanceof Date)) throw new FunctionGroupError(400, `Nieprawidłowa data: ${field}`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new FunctionGroupError(400, `Nieprawidłowa data: ${field}`);
  return date;
}

async function audit(
  manager: EntityManager,
  eventType: string,
  actorId: number | null,
  details: Record<string, unknown>,
): Promise<void> {
  await manager.query(
    `INSERT INTO audit_logs (event_type, user_id, details, created_at)
     VALUES ($1, $2, $3::jsonb, NOW())`,
    [eventType, actorId, JSON.stringify({ targetType: 'function_group', ...details })],
  );
}

function snapshot(group: FunctionGroup) {
  return {
    key: group.key,
    name: group.name,
    description: group.description ?? null,
    permissions: group.permissions ?? {},
    active: group.active,
  };
}

function serializeMembership(membership: UserFunctionGroup, at: Date) {
  const user = membership.user;
  const grantedBy = membership.grantedBy;
  return {
    id: membership.id,
    userId: membership.userId,
    functionGroupId: membership.functionGroupId,
    validFrom: membership.validFrom,
    validTo: membership.validTo,
    grantedById: membership.grantedById,
    createdAt: membership.createdAt,
    isActive: EffectivePermissionsService.isMembershipActive(membership, at),
    user: user ? {
      id: user.id, username: user.username, firstName: user.firstName, lastName: user.lastName, email: user.email,
    } : undefined,
    grantedBy: grantedBy ? { id: grantedBy.id, firstName: grantedBy.firstName, lastName: grantedBy.lastName } : null,
    functionGroup: membership.functionGroup ? {
      id: membership.functionGroup.id,
      key: membership.functionGroup.key,
      name: membership.functionGroup.name,
      active: membership.functionGroup.active,
    } : undefined,
  };
}

export class FunctionGroupService {
  static async list() {
    const groups = await AppDataSource.getRepository(FunctionGroup).find({ order: { name: 'ASC' } });
    const now = new Date();
    const memberships = groups.length
      ? await AppDataSource.getRepository(UserFunctionGroup).find({ where: { functionGroupId: In(groups.map(g => g.id)) } })
      : [];
    const counts = new Map<number, Set<number>>();
    for (const membership of memberships) {
      if (!EffectivePermissionsService.isMembershipActive(membership, now)) continue;
      if (!counts.has(membership.functionGroupId)) counts.set(membership.functionGroupId, new Set());
      counts.get(membership.functionGroupId)!.add(membership.userId);
    }
    return groups.map(group => ({ ...group, activeMemberCount: counts.get(group.id)?.size ?? 0 }));
  }

  static async getById(id: number): Promise<FunctionGroup> {
    const group = await AppDataSource.getRepository(FunctionGroup).findOne({ where: { id } });
    if (!group) throw new FunctionGroupError(404, 'Funkcja nie została znaleziona');
    return group;
  }

  static async create(input: FunctionGroupInput, actorId: number | null): Promise<FunctionGroup> {
    const key = typeof input.key === 'string' ? input.key.trim() : '';
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!FUNCTION_GROUP_KEY_PATTERN.test(key) || key.length > 100) {
      throw new FunctionGroupError(400, 'Klucz funkcji musi być zapisany WIELKIMI_LITERAMI_Z_PODKREŚLNIKAMI (np. PROCESS_AUDITORS)');
    }
    if (!name || name.length > 150) throw new FunctionGroupError(400, 'Nazwa funkcji jest wymagana (do 150 znaków)');
    const permissions = input.permissions === undefined ? {} : input.permissions;
    const permissionsError = validateFunctionGroupPermissions(permissions);
    if (permissionsError) throw new FunctionGroupError(400, permissionsError);
    const description = typeof input.description === 'string' && input.description.trim() ? input.description.trim() : null;

    return AppDataSource.transaction(async manager => {
      const repo = manager.getRepository(FunctionGroup);
      if (await repo.findOne({ where: { key } })) throw new FunctionGroupError(409, `Funkcja o kluczu ${key} już istnieje`);
      const group = await repo.save(repo.create({
        key, name, description, permissions: permissions as RolePermissions, active: true,
      }));
      await audit(manager, 'FUNCTION_GROUP_CREATED', actorId, {
        functionGroupId: group.id, functionKey: group.key, before: null, after: snapshot(group),
      });
      return group;
    });
  }

  static async update(id: number, input: FunctionGroupInput, actorId: number | null): Promise<FunctionGroup> {
    if (input.key !== undefined) throw new FunctionGroupError(400, 'Klucza funkcji nie można zmienić');
    if (input.name !== undefined && (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 150)) {
      throw new FunctionGroupError(400, 'Nazwa funkcji jest wymagana (do 150 znaków)');
    }
    if (input.description !== undefined && input.description !== null && typeof input.description !== 'string') {
      throw new FunctionGroupError(400, 'Opis musi być tekstem');
    }
    if (input.permissions !== undefined) {
      const permissionsError = validateFunctionGroupPermissions(input.permissions);
      if (permissionsError) throw new FunctionGroupError(400, permissionsError);
    }
    if (input.active !== undefined && typeof input.active !== 'boolean') {
      throw new FunctionGroupError(400, 'Pole active musi być true albo false');
    }

    return AppDataSource.transaction(async manager => {
      const repo = manager.getRepository(FunctionGroup);
      const group = await repo.findOne({ where: { id } });
      if (!group) throw new FunctionGroupError(404, 'Funkcja nie została znaleziona');
      const before = snapshot(group);
      if (typeof input.name === 'string') group.name = input.name.trim();
      if (input.description !== undefined) {
        group.description = typeof input.description === 'string' && input.description.trim() ? input.description.trim() : null;
      }
      if (input.permissions !== undefined) group.permissions = input.permissions as RolePermissions;
      if (typeof input.active === 'boolean') group.active = input.active;
      const saved = await repo.save(group);
      const after = snapshot(saved);
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        const eventType = before.active && !after.active ? 'FUNCTION_GROUP_DEACTIVATED' : 'FUNCTION_GROUP_UPDATED';
        await audit(manager, eventType, actorId, { functionGroupId: saved.id, functionKey: saved.key, before, after });
      }
      return saved;
    });
  }

  static deactivate(id: number, actorId: number | null): Promise<FunctionGroup> {
    return this.update(id, { active: false }, actorId);
  }

  /** Pełna historia członkostwa funkcji (również zakończone okresy). */
  static async listMembers(id: number) {
    await this.getById(id);
    const memberships = await AppDataSource.getRepository(UserFunctionGroup).find({
      where: { functionGroupId: id },
      relations: ['user', 'grantedBy'],
      order: { validFrom: 'DESC', id: 'DESC' },
    });
    const now = new Date();
    return memberships.map(membership => serializeMembership(membership, now));
  }

  static async addMember(id: number, input: MemberInput, actorId: number | null) {
    const userId = Number(input.userId);
    if (!Number.isInteger(userId) || userId <= 0) throw new FunctionGroupError(400, 'Wybierz osobę');
    const validFrom = parseDate(input.validFrom, 'od') ?? new Date();
    const validTo = parseDate(input.validTo, 'do');
    if (validTo && validTo.getTime() <= validFrom.getTime()) {
      throw new FunctionGroupError(400, 'Data „do” musi być późniejsza niż data „od”');
    }

    return AppDataSource.transaction(async manager => {
      const group = await manager.getRepository(FunctionGroup).findOne({ where: { id } });
      if (!group) throw new FunctionGroupError(404, 'Funkcja nie została znaleziona');
      if (!group.active) throw new FunctionGroupError(400, 'Nie można dodawać osób do nieaktywnej funkcji');
      const user = await manager.getRepository(User).findOne({ where: { id: userId, deletedAt: IsNull() } });
      if (!user) throw new FunctionGroupError(404, 'Użytkownik nie znaleziony');

      const repo = manager.getRepository(UserFunctionGroup);
      const existing = await repo.find({ where: { userId, functionGroupId: id } });
      const overlaps = existing.some(membership => {
        const startsBeforeNewEnds = !validTo || new Date(membership.validFrom).getTime() < validTo.getTime();
        const endsAfterNewStarts = !membership.validTo || new Date(membership.validTo).getTime() > validFrom.getTime();
        return startsBeforeNewEnds && endsAfterNewStarts;
      });
      if (overlaps) throw new FunctionGroupError(409, 'Ta osoba ma już tę funkcję w podanym okresie');

      const membership = await repo.save(repo.create({
        userId, functionGroupId: id, validFrom, validTo, grantedById: actorId,
      }));
      await audit(manager, 'FUNCTION_GROUP_MEMBER_ADDED', actorId, {
        functionGroupId: group.id,
        functionKey: group.key,
        targetUserId: userId,
        membershipId: membership.id,
        validFrom: toIso(validFrom),
        validTo: toIso(validTo),
        before: null,
        after: { validFrom: toIso(validFrom), validTo: toIso(validTo) },
      });
      membership.user = user;
      return serializeMembership(membership, new Date());
    });
  }

  /** Odebranie funkcji: ustawia valid_to = now() na otwartych okresach; historia zostaje. */
  static async removeMember(id: number, userId: number, actorId: number | null) {
    return AppDataSource.transaction(async manager => {
      const group = await manager.getRepository(FunctionGroup).findOne({ where: { id } });
      if (!group) throw new FunctionGroupError(404, 'Funkcja nie została znaleziona');
      const repo = manager.getRepository(UserFunctionGroup);
      const now = new Date();
      const open = (await repo.find({ where: { userId, functionGroupId: id } }))
        .filter(membership => !membership.validTo || new Date(membership.validTo).getTime() > now.getTime());
      if (!open.length) throw new FunctionGroupError(404, 'Ta osoba nie ma tej funkcji');

      const ended = [];
      for (const membership of open) {
        const before = { validFrom: toIso(membership.validFrom), validTo: toIso(membership.validTo) };
        // Okres przyszły kończy się w chwili rozpoczęcia – nigdy nie obowiązywał.
        const validFrom = new Date(membership.validFrom);
        membership.validTo = validFrom.getTime() > now.getTime() ? validFrom : now;
        const saved = await repo.save(membership);
        await audit(manager, 'FUNCTION_GROUP_MEMBER_REMOVED', actorId, {
          functionGroupId: group.id,
          functionKey: group.key,
          targetUserId: userId,
          membershipId: saved.id,
          validFrom: before.validFrom,
          validTo: toIso(saved.validTo),
          before,
          after: { validFrom: before.validFrom, validTo: toIso(saved.validTo) },
        });
        ended.push(serializeMembership(saved, now));
      }
      return ended;
    });
  }

  /** Historia funkcji danej osoby. */
  static async listForUser(userId: number) {
    const user = await AppDataSource.getRepository(User).findOne({ where: { id: userId } });
    if (!user) throw new FunctionGroupError(404, 'Użytkownik nie znaleziony');
    const memberships = await AppDataSource.getRepository(UserFunctionGroup).find({
      where: { userId },
      relations: ['functionGroup', 'grantedBy'],
      order: { validFrom: 'DESC', id: 'DESC' },
    });
    const now = new Date();
    return memberships.map(membership => serializeMembership(membership, now));
  }

  /** Aktywne funkcje wielu osób naraz (do list użytkowników). */
  static async activeGroupsByUser(userIds: number[], at: Date = new Date()): Promise<Map<number, ActiveFunctionGroup[]>> {
    const result = new Map<number, ActiveFunctionGroup[]>();
    const ids = [...new Set(userIds.filter(id => Number.isInteger(id)))];
    if (!ids.length) return result;
    const memberships = await AppDataSource.getRepository(UserFunctionGroup).find({
      where: { userId: In(ids) },
      relations: ['functionGroup'],
    });
    for (const membership of memberships) {
      const group = membership.functionGroup;
      if (!group || !group.active || !EffectivePermissionsService.isMembershipActive(membership, at)) continue;
      const list = result.get(membership.userId) ?? [];
      if (!list.some(item => item.id === group.id)) list.push({ id: group.id, key: group.key, name: group.name });
      result.set(membership.userId, list);
    }
    for (const list of result.values()) list.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    return result;
  }

  /**
   * Aktywni członkowie funkcji w chwili `at` (aktywne, nieusunięte konta).
   * Pomocnik dla kolejnych etapów (W5).
   */
  static async activeMembers(functionKey: string, at: Date = new Date()): Promise<User[]> {
    return AppDataSource.getRepository(User)
      .createQueryBuilder('user')
      .innerJoin(UserFunctionGroup, 'membership', 'membership.userId = user.id')
      .innerJoin(FunctionGroup, 'fg', 'fg.id = membership.functionGroupId')
      .where('fg.key = :functionKey', { functionKey })
      .andWhere('fg.active = TRUE')
      .andWhere('membership.validFrom <= :at', { at })
      .andWhere('(membership.validTo IS NULL OR membership.validTo > :at)', { at })
      .andWhere('user.active = TRUE')
      .andWhere('user.deletedAt IS NULL')
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .distinct(true)
      .getMany();
  }
}

export const activeMembers = (functionKey: string, at: Date = new Date()): Promise<User[]> =>
  FunctionGroupService.activeMembers(functionKey, at);
