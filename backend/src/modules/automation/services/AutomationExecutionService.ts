// src/modules/automation/services/AutomationExecutionService.ts
// Wykonanie łańcuchów: zapis runa i kroków, idempotencja, ponowienia, ochrona przed pętlą, tryb testowy.
// Wykonanie "z uprawnieniami systemu" – uprawnienia autora sprawdzane są przy zapisie łańcucha;
// w dzienniku zapisujemy autora łańcucha i aktora zdarzenia.

import { randomUUID } from 'crypto';
import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../../../config/database';
import { FormInstance } from '../../../entities/FormInstance';
import { causationContext, type DomainEvent } from '../../events/DomainEventBus';
import { serverLogger } from '../../../utils/logger';
import {
  MAX_CAUSATION_DEPTH,
  MAX_STEP_ATTEMPTS,
  STEP_BACKOFF_MS,
  type AutomationContext,
  type AutomationParams,
  type AutomationStepResult,
} from '../contracts';
import type { AutomationChain } from '../entities/AutomationChain';
import type { AutomationRun } from '../entities/AutomationRun';
import type { AutomationRunStep } from '../entities/AutomationRunStep';
import { AutomationError } from '../errors';
import { maskSensitive } from '../masking';
import type { AutomationRegistry } from '../registry/AutomationRegistry';
import { renderVariables } from '../variables';
import type { AutomationStore, RunWithSteps } from './AutomationStore';

export const FORM_TEMPLATE_VERSION_OWNER = 'FORM_TEMPLATE_VERSION';

export interface AutomationQueue {
  /** Zwraca false, gdy kolejka jest niedostępna – wtedy wykonanie następuje synchronicznie. */
  enqueue(job: { runId: number; stepIndex: number }, delayMs?: number): Promise<boolean>;
}

export type StepOutcome =
  | { next: 'NEXT' }
  | { next: 'RETRY'; delayMs: number; message: string }
  | { next: 'FINISHED' };

export interface AutomationExecutionDeps {
  registry: AutomationRegistry;
  store: AutomationStore;
  render?: (text: string, ctx: AutomationContext) => Promise<string>;
  getQueue?: () => AutomationQueue | null;
  findInstanceId?: (ownerType: string, ownerId: number, taskId: number) => Promise<number | null>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const numberOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export function ownerFromEvent(event: Pick<DomainEvent, 'payload'>): { ownerType: string; ownerId: number } | null {
  const versionId = numberOrNull(event.payload?.templateVersionId);
  return versionId === null ? null : { ownerType: FORM_TEMPLATE_VERSION_OWNER, ownerId: versionId };
}

export function serializeEvent(event: DomainEvent): Record<string, unknown> {
  return maskSensitive({
    id: event.id,
    type: event.type,
    occurredAt: event.occurredAt instanceof Date ? event.occurredAt.toISOString() : event.occurredAt,
    actorId: event.actorId,
    subject: event.subject,
    payload: event.payload,
    causationDepth: event.causationDepth,
  });
}

export class AutomationExecutionService {
  private readonly registry: AutomationRegistry;
  private readonly store: AutomationStore;
  private readonly render: (text: string, ctx: AutomationContext) => Promise<string>;
  private readonly getQueue: () => AutomationQueue | null;
  private readonly findInstanceId: NonNullable<AutomationExecutionDeps['findInstanceId']>;

  constructor(deps: AutomationExecutionDeps) {
    this.registry = deps.registry;
    this.store = deps.store;
    this.render = deps.render ?? ((text, ctx) => renderVariables(text, ctx, AppDataSource.manager as EntityManager));
    this.getQueue = deps.getQueue ?? (() => null);
    this.findInstanceId = deps.findInstanceId ?? (async (ownerType, ownerId, taskId) => {
      if (ownerType !== FORM_TEMPLATE_VERSION_OWNER) return null;
      const instance = await AppDataSource.getRepository(FormInstance).findOne({
        where: { templateVersionId: ownerId, taskId },
        order: { id: 'DESC' },
      });
      return instance?.id ?? null;
    });
  }

  /** Obsługa zdarzenia domenowego: uruchamia każdy pasujący łańcuch dokładnie raz. */
  async handleEvent(event: DomainEvent): Promise<void> {
    const owner = ownerFromEvent(event);
    if (!owner) return;
    const chains = await this.store.findChains(owner.ownerType, owner.ownerId, event.type);
    for (const chain of chains) {
      if (!chain.steps?.length) continue;
      try {
        await this.startRun(chain, event);
      } catch (error) {
        serverLogger.error(`[Automation] Nie udało się uruchomić łańcucha ${chain.id}:`, error);
      }
    }
  }

  private async startRun(chain: AutomationChain, event: DomainEvent): Promise<void> {
    const base = {
      chainId: chain.id,
      eventId: event.id,
      event: serializeEvent(event),
      dryRun: false,
      causationDepth: event.causationDepth,
      chainAuthorId: chain.createdById,
      actorId: event.actorId,
    };
    if (event.causationDepth > MAX_CAUSATION_DEPTH) {
      await this.store.createRun({
        ...base,
        status: 'BLOCKED',
        finishedAt: new Date(),
        message: `Zablokowano: zdarzenie wywołane łańcuchem automatyzacji o głębokości ${event.causationDepth} (limit: ${MAX_CAUSATION_DEPTH}). Możliwa pętla automatyzacji.`,
      }, []);
      return;
    }
    const created = await this.store.createRun(
      { ...base, status: 'RUNNING' },
      chain.steps.map((step, stepIndex) => ({ stepIndex, action: step.action, input: maskSensitive(step.params ?? {}) })),
    );
    if (!created) return;
    await this.dispatch(created.run.id, 0);
  }

  private async dispatch(runId: number, stepIndex: number): Promise<void> {
    const queue = this.getQueue();
    let queued = false;
    if (queue) {
      try {
        queued = await queue.enqueue({ runId, stepIndex });
      } catch (error) {
        serverLogger.warn('[Automation] Kolejka niedostępna – wykonanie synchroniczne:', error);
      }
    }
    if (!queued) await this.executeRun(runId, stepIndex);
  }

  /** Wykonanie synchroniczne (bez Redisa): ponowienia następują natychmiast, bez odstępów. */
  async executeRun(runId: number, fromStep = 0): Promise<void> {
    let stepIndex = fromStep;
    for (;;) {
      const outcome = await this.executeStep(runId, stepIndex);
      if (outcome.next === 'FINISHED') return;
      if (outcome.next === 'NEXT') stepIndex += 1;
    }
  }

  /** Wykonuje jeden krok. Krok już SUCCEEDED (ten sam idempotency_key) nie jest wykonywany ponownie. */
  async executeStep(runId: number, stepIndex: number): Promise<StepOutcome> {
    const loaded = await this.store.getRun(runId);
    if (!loaded) return { next: 'FINISHED' };
    const { run, steps } = loaded;
    const step = steps.find(candidate => candidate.stepIndex === stepIndex);
    if (!step) {
      await this.finalize(run, steps);
      return { next: 'FINISHED' };
    }
    const isLast = (): boolean => stepIndex >= steps.length - 1;
    if (step.status === 'SUCCEEDED' || step.status === 'SKIPPED') {
      return this.afterStep(run, steps, stepIndex, isLast());
    }

    const chain = await this.store.getChain(run.chainId);
    const definition = chain?.steps?.[stepIndex];
    const action = this.registry.get(step.action);
    const attempt = step.attempt + 1;
    const startedAt = new Date();
    let result: AutomationStepResult;
    let renderedInput = step.input;

    try {
      if (!chain || !definition || definition.action !== step.action) {
        throw new Error('Łańcuch został zmieniony po uruchomieniu – nie można wykonać kroku.');
      }
      if (!action) throw new Error(`Nieznany klocek automatyzacji „${step.action}”.`);
      const ctx = this.buildContext(run);
      const params = await this.renderParams(action.params, definition.params ?? {}, ctx);
      renderedInput = maskSensitive(params);
      result = await causationContext.run({ depth: run.causationDepth }, () =>
        action.run(ctx, params, { dryRun: run.dryRun }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result = { status: 'FAILED', message: `Krok nie powiódł się: ${message}`, output: {} };
    }

    const output = maskSensitive(result.output ?? {});
    if (result.status !== 'FAILED') {
      await this.store.updateStep(step.id, {
        status: result.status === 'OK' ? 'SUCCEEDED' : 'SKIPPED',
        attempt, input: renderedInput, output, message: result.message, error: null, startedAt, finishedAt: new Date(),
      });
      step.status = result.status === 'OK' ? 'SUCCEEDED' : 'SKIPPED';
      return this.afterStep(run, steps, stepIndex, isLast());
    }

    const canRetry = !run.dryRun && !!action && attempt < MAX_STEP_ATTEMPTS;
    const status = canRetry ? 'RETRY' : 'FAILED';
    await this.store.updateStep(step.id, {
      status, attempt, input: renderedInput, output, message: result.message, error: result.message,
      startedAt, finishedAt: canRetry ? null : new Date(),
    });
    step.status = status;
    if (canRetry) {
      return { next: 'RETRY', delayMs: STEP_BACKOFF_MS[Math.min(attempt, STEP_BACKOFF_MS.length) - 1], message: result.message };
    }
    if (chain?.onError === 'CONTINUE') {
      return this.afterStep(run, steps, stepIndex, isLast());
    }
    await this.skipRemaining(steps, stepIndex);
    await this.finalize(run, steps);
    return { next: 'FINISHED' };
  }

  private async afterStep(run: AutomationRun, steps: AutomationRunStep[], stepIndex: number, last: boolean): Promise<StepOutcome> {
    if (!last) return { next: 'NEXT' };
    await this.finalize(run, steps);
    return { next: 'FINISHED' };
  }

  private async skipRemaining(steps: AutomationRunStep[], failedIndex: number): Promise<void> {
    for (const step of steps.filter(candidate => candidate.stepIndex > failedIndex && candidate.status === 'PENDING')) {
      await this.store.updateStep(step.id, {
        status: 'SKIPPED',
        message: 'Pominięto, ponieważ wcześniejszy krok zakończył się błędem.',
        finishedAt: new Date(),
      });
      step.status = 'SKIPPED';
    }
  }

  private async finalize(run: AutomationRun, steps: AutomationRunStep[]): Promise<void> {
    const failed = steps.some(step => step.status === 'FAILED');
    const succeeded = steps.some(step => step.status === 'SUCCEEDED');
    const status = !failed ? 'SUCCEEDED' : succeeded ? 'PARTIAL' : 'FAILED';
    await this.store.updateRun(run.id, { status, finishedAt: new Date() });
  }

  private buildContext(run: AutomationRun): AutomationContext {
    const event = run.event as Record<string, unknown>;
    const payload = isRecord(event.payload) ? event.payload : {};
    const subject = isRecord(event.subject) ? event.subject : {};
    return {
      event: {
        id: String(event.id ?? run.eventId ?? ''),
        type: String(event.type ?? ''),
        occurredAt: new Date(String(event.occurredAt ?? run.startedAt)),
        actorId: run.actorId,
        subject: { type: String(subject.type ?? ''), id: Number(subject.id ?? 0) },
        payload,
        causationDepth: run.causationDepth,
      },
      taskId: numberOrNull(payload.taskId),
      contractId: numberOrNull(payload.contractId),
      instanceId: numberOrNull(payload.instanceId) ?? (subject.type === 'FORM_INSTANCE' ? numberOrNull(subject.id) : null),
      actorId: run.actorId,
      chainAuthorId: run.chainAuthorId,
    };
  }

  private async renderParams(
    definitions: Array<{ key: string; type: string }>,
    params: AutomationParams,
    ctx: AutomationContext,
  ): Promise<AutomationParams> {
    const rendered: AutomationParams = { ...params };
    for (const definition of definitions) {
      const value = rendered[definition.key];
      if ((definition.type === 'text' || definition.type === 'longText') && typeof value === 'string') {
        rendered[definition.key] = await this.render(value, ctx);
      }
    }
    return rendered;
  }

  /**
   * Tryb testowy: dryRun, nic nie wysyła i nie zmienia. Zapisuje run z dry_run = true
   * i zwraca wynik każdego kroku.
   */
  async runTest(chain: AutomationChain, taskId: number, actorId: number): Promise<RunWithSteps> {
    const instanceId = await this.findInstanceId(chain.ownerType, chain.ownerId, taskId);
    const event: DomainEvent = {
      id: randomUUID(),
      type: chain.eventType,
      occurredAt: new Date(),
      actorId,
      subject: instanceId !== null ? { type: 'FORM_INSTANCE', id: instanceId } : { type: 'TASK', id: taskId },
      payload: {
        test: true,
        taskId,
        templateVersionId: chain.ownerType === FORM_TEMPLATE_VERSION_OWNER ? chain.ownerId : null,
        instanceId,
      },
      causationDepth: 0,
    };
    const created = await this.store.createRun({
      chainId: chain.id,
      eventId: event.id,
      event: serializeEvent(event),
      status: 'RUNNING',
      dryRun: true,
      causationDepth: 0,
      chainAuthorId: chain.createdById,
      actorId,
    }, chain.steps.map((step, stepIndex) => ({ stepIndex, action: step.action, input: maskSensitive(step.params ?? {}) })));
    if (!created) throw new AutomationError('VALIDATION_FAILED', 'Nie udało się zapisać uruchomienia testowego.');
    if (chain.steps.length) {
      await this.executeRun(created.run.id);
    } else {
      await this.store.updateRun(created.run.id, { status: 'SUCCEEDED', finishedAt: new Date() });
    }
    return (await this.store.getRun(created.run.id)) ?? created;
  }
}
