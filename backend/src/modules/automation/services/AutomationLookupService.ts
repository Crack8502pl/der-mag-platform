// src/modules/automation/services/AutomationLookupService.ts
// Listy wyboru dla parametrów klocków (osoba, rola, funkcja, typ zadania). Zwracamy wyłącznie identyfikator
// i etykietę po polsku; lista wymaga tylko automation.read, więc edytor łańcucha nie potrzebuje dostępu do paneli administratora.

import type { DataSource } from 'typeorm';
import { AppDataSource } from '../../../config/database';
import { Role } from '../../../entities/Role';
import { TaskType } from '../../../entities/TaskType';
import { User } from '../../../entities/User';
import { safeLike } from '../../../utils/queryBuilder';
import { FunctionGroup } from '../../function-groups/entities/FunctionGroup';
import { AutomationError } from '../errors';

export const AUTOMATION_LOOKUP_TYPES = ['user', 'role', 'functionGroup', 'taskType'] as const;
export type AutomationLookupType = typeof AUTOMATION_LOOKUP_TYPES[number];

export interface AutomationLookupOption {
  /** Wartość zapisywana w parametrze klocka (identyfikator albo klucz funkcji). */
  value: number | string;
  label: string;
}

export const MAX_LOOKUP_RESULTS = 50;
const INACTIVE_SUFFIX = ' (nieaktywne)';

const fold = (text: string): string => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/gi, 'l').toLowerCase();

const userOption = (user: User): AutomationLookupOption => ({
  value: user.id,
  label: `${user.firstName} ${user.lastName} (${user.username})${user.active && !user.deletedAt ? '' : INACTIVE_SUFFIX}`,
});

/** Opis roli ma postać „Menedżer - Zarządzanie projektami…”; pokazujemy tylko nazwę przed myślnikiem. */
const roleOption = (role: Role): AutomationLookupOption => ({
  value: role.id,
  label: role.description?.split(' - ')[0].trim() || role.name,
});

const functionGroupOption = (group: FunctionGroup): AutomationLookupOption => ({
  value: group.key,
  label: `${group.name}${group.active ? '' : INACTIVE_SUFFIX}`,
});

const taskTypeOption = (type: TaskType): AutomationLookupOption => ({
  value: type.id,
  label: `${type.name}${type.active ? '' : INACTIVE_SUFFIX}`,
});

const positiveInteger = (value: string): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export class AutomationLookupService {
  constructor(private readonly dataSource: Pick<DataSource, 'getRepository'> = AppDataSource) {}

  parseType(value: unknown): AutomationLookupType {
    if (!AUTOMATION_LOOKUP_TYPES.includes(value as AutomationLookupType)) {
      throw new AutomationError('VALIDATION_FAILED', 'Nieobsługiwany rodzaj listy wyboru.');
    }
    return value as AutomationLookupType;
  }

  /** Pozycje pasujące do `search`; z `selected` wskazana pozycja jest zawsze pierwsza (żeby miała etykietę). */
  async find(type: AutomationLookupType, search = '', selected?: string): Promise<AutomationLookupOption[]> {
    const [options, current] = await Promise.all([
      this.search(type, search.trim()),
      selected ? this.findSelected(type, selected) : Promise.resolve(null),
    ]);
    return current ? [current, ...options.filter(option => option.value !== current.value)] : options;
  }

  private async search(type: AutomationLookupType, term: string): Promise<AutomationLookupOption[]> {
    const matches = (option: AutomationLookupOption) => !term || fold(option.label).includes(fold(term));
    switch (type) {
      case 'user': {
        const query = this.dataSource.getRepository(User).createQueryBuilder('user')
          .where('user.active = :active AND user.deletedAt IS NULL', { active: true });
        if (term) {
          query.andWhere(`CONCAT_WS(' ', user.firstName, user.lastName, user.username) ILIKE :term ESCAPE '\\'`, { term: safeLike(term) });
        }
        const users = await query.orderBy('user.lastName', 'ASC').addOrderBy('user.firstName', 'ASC').limit(MAX_LOOKUP_RESULTS).getMany();
        return users.map(userOption);
      }
      case 'role': {
        const roles = await this.dataSource.getRepository(Role).find({ order: { name: 'ASC' } });
        return roles.map(roleOption).filter(matches).slice(0, MAX_LOOKUP_RESULTS);
      }
      case 'functionGroup': {
        const groups = await this.dataSource.getRepository(FunctionGroup).find({ where: { active: true }, order: { name: 'ASC' } });
        return groups.map(functionGroupOption).filter(matches).slice(0, MAX_LOOKUP_RESULTS);
      }
      case 'taskType': {
        const types = await this.dataSource.getRepository(TaskType).find({ where: { active: true }, order: { name: 'ASC' } });
        return types.map(taskTypeOption).filter(matches).slice(0, MAX_LOOKUP_RESULTS);
      }
    }
  }

  private async findSelected(type: AutomationLookupType, value: string): Promise<AutomationLookupOption | null> {
    if (type === 'functionGroup') {
      const group = await this.dataSource.getRepository(FunctionGroup).findOne({ where: { key: value } });
      return group ? functionGroupOption(group) : null;
    }
    const id = positiveInteger(value);
    if (id === null) return null;
    switch (type) {
      case 'user': {
        const user = await this.dataSource.getRepository(User).findOne({ where: { id } });
        return user ? userOption(user) : null;
      }
      case 'role': {
        const role = await this.dataSource.getRepository(Role).findOne({ where: { id } });
        return role ? roleOption(role) : null;
      }
      case 'taskType': {
        const taskType = await this.dataSource.getRepository(TaskType).findOne({ where: { id } });
        return taskType ? taskTypeOption(taskType) : null;
      }
    }
  }
}
