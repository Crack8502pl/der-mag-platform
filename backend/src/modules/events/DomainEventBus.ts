// src/modules/events/DomainEventBus.ts
// Magistrala zdarzeń domenowych. Zdarzenia publikujemy WYŁĄCZNIE po zatwierdzeniu transakcji
// (afterCommit) – nigdy w jej trakcie. Błąd subskrybenta nie wpływa na operację, która zdarzenie wywołała.

import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import type { DataSource, EntityManager } from 'typeorm';
import { serverLogger } from '../../utils/logger';

export type DomainEventType = 'FORM_SUBMITTED' | 'FORM_APPROVED' | 'FORM_REJECTED';

export interface DomainEventSubject {
  type: string;
  id: number;
}

export interface DomainEvent {
  /** Unikalny identyfikator zdarzenia – pozwala wykryć podwójne dostarczenie. */
  id: string;
  type: DomainEventType | string;
  occurredAt: Date;
  actorId: number | null;
  subject: DomainEventSubject;
  payload: Record<string, unknown>;
  /** Głębokość łańcucha przyczynowego: 0 = zdarzenie wywołane przez człowieka. */
  causationDepth: number;
}

export type DomainEventInput = Omit<DomainEvent, 'id' | 'occurredAt' | 'causationDepth' | 'payload' | 'actorId'>
  & Partial<Pick<DomainEvent, 'id' | 'occurredAt' | 'causationDepth' | 'payload' | 'actorId'>>;

export type DomainEventHandler = (event: DomainEvent) => Promise<void> | void;

/**
 * Kontekst przyczynowy: zdarzenia publikowane w trakcie wykonywania automatyzacji
 * dostają causationDepth o 1 większe niż run, który je wywołał.
 */
export const causationContext = new AsyncLocalStorage<{ depth: number }>();

export class DomainEventBus {
  private readonly handlers = new Map<string, Set<DomainEventHandler>>();

  subscribe(type: string, handler: DomainEventHandler): () => void {
    const set = this.handlers.get(type) ?? new Set<DomainEventHandler>();
    set.add(handler);
    this.handlers.set(type, set);
    return () => { set.delete(handler); };
  }

  /** Publikuje zdarzenie do wszystkich subskrybentów typu i czeka na ich zakończenie. */
  async publish(input: DomainEventInput): Promise<DomainEvent> {
    const event: DomainEvent = {
      id: input.id ?? randomUUID(),
      type: input.type,
      occurredAt: input.occurredAt ?? new Date(),
      actorId: input.actorId ?? null,
      subject: input.subject,
      payload: input.payload ?? {},
      causationDepth: input.causationDepth ?? (causationContext.getStore() ? causationContext.getStore()!.depth + 1 : 0),
    };
    const handlers = [...(this.handlers.get(event.type) ?? [])];
    const results = await Promise.allSettled(handlers.map(async handler => handler(event)));
    for (const result of results) {
      if (result.status === 'rejected') {
        serverLogger.error(`[DomainEventBus] Błąd obsługi zdarzenia ${event.type}:`, result.reason);
      }
    }
    return event;
  }

  /**
   * Wykonuje `work` w transakcji, a zdarzenia zebrane przez `emit` publikuje dopiero po jej zatwierdzeniu.
   * Wycofanie transakcji (wyjątek) oznacza brak publikacji.
   */
  async afterCommit<T>(
    dataSource: Pick<DataSource, 'transaction'>,
    work: (manager: EntityManager, emit: (event: DomainEventInput) => void) => Promise<T>,
  ): Promise<T> {
    const pending: DomainEventInput[] = [];
    const result = await dataSource.transaction(manager => work(manager, event => { pending.push(event); }));
    for (const event of pending) await this.publish(event);
    return result;
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const domainEventBus = new DomainEventBus();
