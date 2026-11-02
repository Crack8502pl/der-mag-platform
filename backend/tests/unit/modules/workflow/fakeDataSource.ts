// Baza w pamięci udająca TypeORM (find/findOne/count/create/save/delete, operatory In/Like/ArrayContains,
// transakcje z wycofaniem i wpisy audit_logs) – testy procesów bez Postgresa i bez internetu.

import { FindOperator } from 'typeorm';

type Row = Record<string, any>;
type Where = Row | Row[] | undefined;
type Order = Record<string, string> | undefined;
type EntityTarget = abstract new (...args: never[]) => unknown;
type UniqueCheck = (rows: Row[]) => string | null;

export interface AuditEntry {
  eventType: string;
  userId: number | null;
  details: Record<string, any>;
}

/** Głęboka kopia (daty zostają datami tego samego kontekstu – structuredClone w Jest tworzy obce Date). */
function clone<T>(value: T): T {
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (Array.isArray(value)) return value.map(item => clone(item)) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) as T;
  }
  return value;
}

function likeToRegExp(pattern: string): RegExp {
  const source = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
  return new RegExp(`^${source}$`, 's');
}

function matchValue(actual: unknown, expected: unknown): boolean {
  if (expected instanceof FindOperator) {
    const operator = expected as FindOperator<any>;
    switch (operator.type) {
      case 'in':
        return (operator.value as unknown[]).includes(actual);
      case 'like':
        return likeToRegExp(String(operator.value)).test(String(actual ?? ''));
      case 'arrayContains':
        return Array.isArray(actual) && (operator.value as unknown[]).every(value => actual.includes(value));
      case 'isNull':
        return actual === null || actual === undefined;
      case 'not':
        return !matchValue(actual, operator.child ?? operator.value);
      default:
        throw new Error(`Fake DB: nieobsługiwany operator ${operator.type}`);
    }
  }
  if (expected === null) return actual === null || actual === undefined;
  if (Array.isArray(actual) && Array.isArray(expected)) return JSON.stringify(actual) === JSON.stringify(expected);
  return actual === expected;
}

function matches(row: Row, where: Where): boolean {
  if (!where) return true;
  if (Array.isArray(where)) return where.some(item => matches(row, item));
  return Object.entries(where).every(([key, expected]) => matchValue(row[key], expected));
}

function sortRows(rows: Row[], order: Order): Row[] {
  if (!order) return rows;
  const entries = Object.entries(order);
  return [...rows].sort((a, b) => {
    for (const [key, direction] of entries) {
      const sign = String(direction).toUpperCase() === 'DESC' ? -1 : 1;
      if (a[key] < b[key]) return -sign;
      if (a[key] > b[key]) return sign;
    }
    return 0;
  });
}

export class UniqueViolation extends Error {
  readonly code = '23505';
}

export class FakeRepository {
  constructor(private readonly db: FakeDataSource, private readonly entity: EntityTarget) {}

  private get rows(): Row[] {
    return this.db.table(this.entity);
  }

  async find(options: { where?: Where; order?: Order } = {}): Promise<any[]> {
    return sortRows(this.rows.filter(row => matches(row, options.where)), options.order).map(clone);
  }

  async findBy(where: Where): Promise<any[]> {
    return this.find({ where });
  }

  async findOne(options: { where?: Where; order?: Order } = {}): Promise<any | null> {
    return (await this.find(options))[0] ?? null;
  }

  async findOneBy(where: Where): Promise<any | null> {
    return this.findOne({ where });
  }

  async count(options: { where?: Where } = {}): Promise<number> {
    return this.rows.filter(row => matches(row, options.where)).length;
  }

  create(value: Row | Row[] = {}): any {
    return Array.isArray(value) ? value.map(item => ({ ...item })) : { ...value };
  }

  async save(value: Row | Row[]): Promise<any> {
    const items = Array.isArray(value) ? value : [value];
    const rows = this.rows;
    const backup = rows.map(row => clone(row));
    for (const item of items) {
      const now = new Date();
      if (item.id === undefined || item.id === null) {
        item.id = this.db.nextId(this.entity);
        item.createdAt ??= now;
      }
      item.updatedAt = now;
      const index = rows.findIndex(row => row.id === item.id);
      if (index >= 0) rows[index] = { ...rows[index], ...clone(item) };
      else rows.push(clone(item));
    }
    const violation = this.db.checkUnique(this.entity);
    if (violation) {
      rows.splice(0, rows.length, ...backup);
      throw new UniqueViolation(violation);
    }
    return value;
  }

  async delete(where: Where): Promise<{ affected: number }> {
    const rows = this.rows;
    const kept = rows.filter(row => !matches(row, where));
    const affected = rows.length - kept.length;
    rows.splice(0, rows.length, ...kept);
    return { affected };
  }
}

export class FakeDataSource {
  readonly audit: AuditEntry[] = [];
  readonly queries: string[] = [];
  transactions = 0;
  private tables = new Map<EntityTarget, Row[]>();
  private sequences = new Map<EntityTarget, number>();
  private uniqueChecks = new Map<EntityTarget, UniqueCheck[]>();

  table(entity: EntityTarget): Row[] {
    let rows = this.tables.get(entity);
    if (!rows) {
      rows = [];
      this.tables.set(entity, rows);
    }
    return rows;
  }

  nextId(entity: EntityTarget): number {
    const next = Math.max(this.sequences.get(entity) ?? 0, ...this.table(entity).map(row => Number(row.id) || 0)) + 1;
    this.sequences.set(entity, next);
    return next;
  }

  /** Dodaje wiersze bezpośrednio (dane startowe testu). */
  insert<T extends Row>(entity: EntityTarget, rows: T[]): T[] {
    for (const row of rows) {
      const stored = { ...row, id: row.id ?? this.nextId(entity) } as T;
      this.table(entity).push(clone(stored));
    }
    return rows;
  }

  rows<T = any>(entity: EntityTarget): T[] {
    return this.table(entity).map(row => clone(row)) as T[];
  }

  /** Ograniczenie unikalności (np. indeks częściowy): funkcja zwraca opis naruszenia albo null. */
  addUniqueCheck(entity: EntityTarget, check: UniqueCheck): void {
    this.uniqueChecks.set(entity, [...(this.uniqueChecks.get(entity) ?? []), check]);
  }

  checkUnique(entity: EntityTarget): string | null {
    for (const check of this.uniqueChecks.get(entity) ?? []) {
      const violation = check(this.table(entity));
      if (violation) return violation;
    }
    return null;
  }

  getRepository(entity: EntityTarget): FakeRepository {
    return new FakeRepository(this, entity);
  }

  async query(sql: string, params: unknown[] = []): Promise<unknown[]> {
    this.queries.push(sql);
    if (/INSERT INTO audit_logs/i.test(sql)) {
      this.audit.push({
        eventType: String(params[0]),
        userId: (params[1] as number | null) ?? null,
        details: JSON.parse(String(params[2])),
      });
      return [];
    }
    throw new Error(`Fake DB: nieobsługiwane zapytanie: ${sql}`);
  }

  async transaction<T>(...args: unknown[]): Promise<T> {
    const run = args[args.length - 1] as (manager: FakeDataSource) => Promise<T>;
    const tables = new Map([...this.tables].map(([entity, rows]) => [entity, rows.map(row => clone(row))]));
    const sequences = new Map(this.sequences);
    const auditLength = this.audit.length;
    this.transactions += 1;
    try {
      return await run(this);
    } catch (error) {
      this.tables = tables;
      this.sequences = sequences;
      this.audit.splice(auditLength);
      throw error;
    }
  }

  auditOf(eventType: string): AuditEntry[] {
    return this.audit.filter(entry => entry.eventType === eventType);
  }
}

/** Indeksy częściowe z migracji: najwyżej jedna wersja PUBLISHED i jedna DRAFT na definicję. */
export function addWorkflowVersionConstraints(db: FakeDataSource, versionEntity: EntityTarget): void {
  db.addUniqueCheck(versionEntity, rows => {
    for (const status of ['PUBLISHED', 'DRAFT']) {
      const seen = new Set<number>();
      for (const row of rows.filter(item => item.status === status)) {
        if (seen.has(row.definitionId)) return `uq_workflow_versions_one_${status.toLowerCase()}`;
        seen.add(row.definitionId);
      }
    }
    const pairs = new Set<string>();
    for (const row of rows) {
      const pair = `${row.definitionId}:${row.version}`;
      if (pairs.has(pair)) return 'uq_workflow_versions_definition_version';
      pairs.add(pair);
    }
    return null;
  });
}
