// src/modules/workflow/services/WorkflowService.ts
// Definicje procesów i ich wersje: tworzenie, wersja robocza (PUT całości), nowa wersja, walidacja i publikacja.
// Wersja PUBLISHED i SUPERSEDED jest niezmienna. Każda zmiana definicji i wersji roboczej trafia do audit_logs.

import { ArrayContains, In, Like, type DataSource, type EntityManager } from 'typeorm';
import { AppDataSource } from '../../../config/database';
import type { RolePermissions } from '../../../entities/Role';
import { TaskType } from '../../../entities/TaskType';
import { AutomationChain } from '../../automation/entities/AutomationChain';
import { cloneChainsForOwners, deleteChainsForOwners } from '../../automation/services/cloneChains';
import {
  DEFAULT_REVIEW_CONFIG,
  SAFETY_SKIP_WARNING,
  SKIP_JUSTIFICATION_MIN_LENGTH,
  WORKFLOW_STEP_OWNER,
  type WorkflowIssue,
  type WorkflowProblem,
  type WorkflowSubjectType,
  type WorkflowVersionStatus,
} from '../contracts';
import { WorkflowDefinition } from '../entities/WorkflowDefinition';
import { WorkflowStep } from '../entities/WorkflowStep';
import { WorkflowTransition } from '../entities/WorkflowTransition';
import { WorkflowVersion } from '../entities/WorkflowVersion';
import { WorkflowError } from '../errors';
import { DEFINITION_KEY_MAX_LENGTH, STEP_KEY_MAX_LENGTH, keyFromName, uniqueKey } from '../keys';
import { loadValidationLookups } from '../validation/loadValidationLookups';
import { parseDefinitionInput, parseDraftInput, type DraftStepInput } from '../validation/parseInput';
import { validateWorkflowVersion } from '../validation/validateWorkflowVersion';
import { computeSafetyCritical } from './safety';
import { recordWorkflowAudit } from './workflowAudit';

type Store = Pick<DataSource, 'getRepository' | 'transaction' | 'query'>;
type Manager = Pick<EntityManager, 'getRepository' | 'query'>;

export interface WorkflowActor {
  id: number;
  /** Uprawnienia efektywne (EffectivePermissionsService). */
  permissions: RolePermissions;
}

/** Edytować można tylko wersję roboczą (W5a doda status zwrotu do poprawek). */
export const EDITABLE_VERSION_STATUSES: readonly WorkflowVersionStatus[] = ['DRAFT'];
export const isEditableStatus = (status: WorkflowVersionStatus): boolean => EDITABLE_VERSION_STATUSES.includes(status);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** JSON z posortowanymi kluczami – jsonb z bazy zmienia kolejność kluczy, a porównujemy treść. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (isObject(value)) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

const sameContent = (left: unknown, right: unknown): boolean => stableStringify(left) === stableStringify(right);

function isUniqueViolation(error: unknown): boolean {
  const record = error as { code?: unknown; driverError?: { code?: unknown } } | null;
  return record?.code === '23505' || record?.driverError?.code === '23505';
}

const byStepOrder = (a: WorkflowStep, b: WorkflowStep) => a.sortOrder - b.sortOrder || a.id - b.id;
const byPriority = (a: WorkflowTransition, b: WorkflowTransition) => a.priority - b.priority || a.id - b.id;

function definitionView(definition: WorkflowDefinition) {
  return {
    id: definition.id,
    key: definition.key,
    name: definition.name,
    description: definition.description,
    subjectType: definition.subjectType,
    taskTypeIds: [...(definition.taskTypeIds ?? [])],
    active: definition.active,
    createdById: definition.createdById,
    createdAt: definition.createdAt,
    updatedAt: definition.updatedAt,
  };
}

function definitionSnapshot(definition: WorkflowDefinition) {
  return {
    name: definition.name,
    description: definition.description,
    subjectType: definition.subjectType,
    taskTypeIds: [...(definition.taskTypeIds ?? [])],
    active: definition.active,
  };
}

function versionSummary(version: WorkflowVersion) {
  return {
    id: version.id,
    definitionId: version.definitionId,
    version: version.version,
    status: version.status,
    editable: isEditableStatus(version.status),
    authorId: version.authorId,
    safetyCritical: version.safetyCritical,
    allowSkipPurposeAudit: version.allowSkipPurposeAudit,
    publishedAt: version.publishedAt,
    publishedById: version.publishedById,
    createdAt: version.createdAt,
    updatedAt: version.updatedAt,
  };
}

function stepSnapshot(step: WorkflowStep) {
  return {
    id: step.id ?? null,
    key: step.key,
    name: step.name,
    sortOrder: step.sortOrder,
    assigneeType: step.assigneeType,
    assigneeRef: step.assigneeRef,
    formTemplateId: step.formTemplateId,
    dueInHours: step.dueInHours,
  };
}

function transitionSnapshot(transition: Pick<WorkflowTransition, 'fromStepKey' | 'toStepKey' | 'condition' | 'priority'>) {
  return {
    fromStepKey: transition.fromStepKey,
    toStepKey: transition.toStepKey,
    condition: transition.condition ?? null,
    priority: transition.priority,
  };
}

function draftSnapshot(version: WorkflowVersion, steps: WorkflowStep[], transitions: WorkflowTransition[]) {
  return {
    safetyCritical: version.safetyCritical,
    allowSkipPurposeAudit: version.allowSkipPurposeAudit,
    reviewConfig: version.reviewConfig,
    steps: [...steps].sort(byStepOrder).map(stepSnapshot),
    transitions: [...transitions].sort(byPriority).map(transitionSnapshot),
  };
}

export type WorkflowDefinitionView = ReturnType<typeof definitionView>;
export type WorkflowVersionSummary = ReturnType<typeof versionSummary>;

export interface WorkflowDefinitionSummary extends WorkflowDefinitionView {
  safetyCritical: boolean;
  latestVersion: WorkflowVersionSummary | null;
  publishedVersion: WorkflowVersionSummary | null;
  draftVersion: WorkflowVersionSummary | null;
}

export interface WorkflowDefinitionDetails extends WorkflowDefinitionSummary {
  versions: WorkflowVersionSummary[];
}

export interface WorkflowVersionDetails extends WorkflowVersionSummary {
  reviewConfig: WorkflowVersion['reviewConfig'];
  definition: WorkflowDefinitionView;
  steps: Array<ReturnType<typeof stepSnapshot> & {
    id: number;
    chains: Array<Pick<AutomationChain, 'id' | 'eventType' | 'steps' | 'onError' | 'createdById' | 'updatedAt'>>;
  }>;
  transitions: Array<ReturnType<typeof transitionSnapshot> & { id: number }>;
}

/** versions – posortowane malejąco po numerze wersji. */
function definitionSummary(definition: WorkflowDefinition, versions: WorkflowVersion[]): WorkflowDefinitionSummary {
  const latest = versions[0] ?? null;
  const published = versions.find(version => version.status === 'PUBLISHED') ?? null;
  const draft = versions.find(version => isEditableStatus(version.status)) ?? null;
  return {
    ...definitionView(definition),
    safetyCritical: latest?.safetyCritical ?? false,
    latestVersion: latest && versionSummary(latest),
    publishedVersion: published && versionSummary(published),
    draftVersion: draft && versionSummary(draft),
  };
}

export class WorkflowService {
  constructor(private readonly dataSource: Store = AppDataSource) {}

  // ---------------------------------------------------------------------------
  // Definicje
  // ---------------------------------------------------------------------------

  async listDefinitions(): Promise<WorkflowDefinitionSummary[]> {
    const definitions = await this.dataSource.getRepository(WorkflowDefinition).find({ order: { name: 'ASC', id: 'ASC' } });
    if (!definitions.length) return [];
    const versions = await this.dataSource.getRepository(WorkflowVersion).find({
      where: { definitionId: In(definitions.map(definition => definition.id)) },
      order: { version: 'DESC' },
    });
    return definitions.map(definition => definitionSummary(definition, versions.filter(version => version.definitionId === definition.id)));
  }

  async getDefinition(id: number): Promise<WorkflowDefinitionDetails> {
    return this.definitionDetails(this.dataSource, id);
  }

  async listVersions(definitionId: number): Promise<WorkflowVersionSummary[]> {
    return (await this.definitionDetails(this.dataSource, definitionId)).versions;
  }

  async createDefinition(body: unknown, actor: WorkflowActor): Promise<WorkflowDefinitionDetails> {
    const input = parseDefinitionInput(body, 'create');
    const subjectType = input.subjectType!;
    const taskTypeIds = input.taskTypeIds ?? [];
    try {
      return await this.dataSource.transaction(async manager => {
        await this.assertTaskTypes(manager, subjectType, taskTypeIds);
        const definitions = manager.getRepository(WorkflowDefinition);
        const base = keyFromName(input.name!, 'proces', DEFINITION_KEY_MAX_LENGTH);
        // Prefiks krótszy o najdłuższy możliwy sufiks „_N” – klucz przycięty do limitu też trafi do zbioru zajętych.
        const prefix = base.slice(0, DEFINITION_KEY_MAX_LENGTH - 11);
        const taken = new Set((await definitions.find({ where: { key: Like(`${prefix}%`) } })).map(definition => definition.key));
        const definition = await definitions.save(definitions.create({
          key: uniqueKey(base, taken, DEFINITION_KEY_MAX_LENGTH),
          name: input.name!,
          description: input.description ?? null,
          subjectType,
          taskTypeIds,
          active: input.active ?? true,
          createdById: actor.id,
        }));

        const safetyCritical = await computeSafetyCritical(manager, subjectType, taskTypeIds);
        const versions = manager.getRepository(WorkflowVersion);
        const draft = await versions.save(versions.create({
          definitionId: definition.id,
          version: 1,
          status: 'DRAFT',
          authorId: actor.id,
          safetyCritical,
          // Zwykły proces: pomijanie audytu celowości domyślnie dozwolone; krytyczny: domyślnie zablokowane.
          allowSkipPurposeAudit: !safetyCritical,
          reviewConfig: JSON.parse(JSON.stringify(DEFAULT_REVIEW_CONFIG)),
          publishedAt: null,
          publishedById: null,
        }));
        await recordWorkflowAudit(manager, 'WORKFLOW_DEFINITION_CREATED', actor.id, 'workflow_definition', {
          definitionId: definition.id,
          key: definition.key,
          after: definitionSnapshot(definition),
          draftVersionId: draft.id,
          safetyCritical,
          allowSkipPurposeAudit: draft.allowSkipPurposeAudit,
        });
        return this.definitionDetails(manager, definition.id);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new WorkflowError('CONFLICT', 'Proces o podobnej nazwie jest właśnie tworzony. Spróbuj ponownie.');
      }
      throw error;
    }
  }

  async updateDefinition(id: number, body: unknown, actor: WorkflowActor): Promise<WorkflowDefinitionDetails> {
    const input = parseDefinitionInput(body, 'update');
    return this.dataSource.transaction(async manager => {
      const definitions = manager.getRepository(WorkflowDefinition);
      const definition = await definitions.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!definition) throw this.definitionNotFound();
      const before = definitionSnapshot(definition);

      const subjectType = input.subjectType ?? definition.subjectType;
      const taskTypeIds = input.taskTypeIds
        ?? (input.subjectType !== undefined && input.subjectType !== 'TASK' ? [] : definition.taskTypeIds ?? []);
      const scopeChanged = subjectType !== definition.subjectType || !sameContent(taskTypeIds, definition.taskTypeIds ?? []);
      if (scopeChanged) {
        const published = await manager.getRepository(WorkflowVersion).count({
          where: { definitionId: id, status: In(['PUBLISHED', 'SUPERSEDED']) },
        });
        if (published) {
          throw new WorkflowError(
            'CONFLICT',
            'Po publikacji procesu nie można zmienić, czego dotyczy, ani listy typów zadań. Utwórz nowy proces.',
          );
        }
        await this.assertTaskTypes(manager, subjectType, taskTypeIds);
      }

      definition.name = input.name ?? definition.name;
      if (input.description !== undefined) definition.description = input.description;
      definition.active = input.active ?? definition.active;
      definition.subjectType = subjectType;
      definition.taskTypeIds = taskTypeIds;
      const after = definitionSnapshot(definition);
      if (sameContent(before, after)) return this.definitionDetails(manager, id);

      await definitions.save(definition);
      await recordWorkflowAudit(manager, 'WORKFLOW_DEFINITION_UPDATED', actor.id, 'workflow_definition', {
        definitionId: id,
        key: definition.key,
        before,
        after,
      });
      if (scopeChanged) await this.refreshDraftSafety(manager, definition, actor.id, 'DEFINITION_UPDATED');
      return this.definitionDetails(manager, id);
    });
  }

  async deleteDefinition(id: number, actor: WorkflowActor): Promise<void> {
    await this.dataSource.transaction(async manager => {
      const definitions = manager.getRepository(WorkflowDefinition);
      const definition = await definitions.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!definition) throw this.definitionNotFound();
      const versions = await manager.getRepository(WorkflowVersion).find({ where: { definitionId: id } });
      if (versions.some(version => !isEditableStatus(version.status))) {
        throw new WorkflowError(
          'CONFLICT',
          'Opublikowanego procesu nie można usunąć – zostaje w historii. Możesz go wyłączyć (pole „Aktywny”).',
        );
      }
      const versionIds = versions.map(version => version.id);
      if (versionIds.length) {
        const steps = await manager.getRepository(WorkflowStep).find({ where: { versionId: In(versionIds) } });
        await deleteChainsForOwners(manager, WORKFLOW_STEP_OWNER, steps.map(step => step.id));
        await manager.getRepository(WorkflowTransition).delete({ versionId: In(versionIds) });
        await manager.getRepository(WorkflowStep).delete({ versionId: In(versionIds) });
        await manager.getRepository(WorkflowVersion).delete({ id: In(versionIds) });
      }
      await definitions.delete({ id });
      await recordWorkflowAudit(manager, 'WORKFLOW_DEFINITION_DELETED', actor.id, 'workflow_definition', {
        definitionId: id,
        key: definition.key,
        before: definitionSnapshot(definition),
        versions: versions.map(version => version.version),
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Wersje
  // ---------------------------------------------------------------------------

  async getVersion(versionId: number): Promise<WorkflowVersionDetails> {
    const version = await this.dataSource.getRepository(WorkflowVersion).findOne({ where: { id: versionId } });
    if (!version) throw this.versionNotFound();
    return this.versionDetails(this.dataSource, version);
  }

  /** PUT wersji roboczej: etapy, przejścia i ustawienia (pominięte sekcje bez zmian). */
  async saveDraft(versionId: number, body: unknown, actor: WorkflowActor): Promise<{ version: WorkflowVersionDetails; warning: string | null }> {
    const input = parseDraftInput(body);
    return this.dataSource.transaction(async manager => {
      const version = await this.lockVersion(manager, versionId);
      this.assertEditable(version);
      const definition = await this.loadDefinition(manager, version.definitionId);
      const stepRepository = manager.getRepository(WorkflowStep);
      const transitionRepository = manager.getRepository(WorkflowTransition);
      const existingSteps = (await stepRepository.find({ where: { versionId } })).sort(byStepOrder);
      const existingTransitions = (await transitionRepository.find({ where: { versionId } })).sort(byPriority);
      const before = draftSnapshot(version, existingSteps, existingTransitions);
      const problems: WorkflowProblem[] = [];

      // Bezpieczeństwo: wyliczane z typów zadań; proces, który właśnie stał się krytyczny, traci pomijanie audytu.
      const safetyCritical = await computeSafetyCritical(manager, definition.subjectType, definition.taskTypeIds ?? []);
      const currentAllow = version.allowSkipPurposeAudit && !(safetyCritical && !version.safetyCritical);
      const requestedAllow = input.allowSkipPurposeAudit ?? currentAllow;
      const enablingCriticalSkip = safetyCritical && requestedAllow && !currentAllow;
      if (enablingCriticalSkip && (input.skipJustification ?? '').length < SKIP_JUSTIFICATION_MIN_LENGTH) {
        problems.push({
          field: 'skipJustification',
          message: `Proces dotyczy systemu krytycznego dla bezpieczeństwa (SSP/SUG). Aby pozwolić na pominięcie audytu celowości, podaj uzasadnienie (co najmniej ${SKIP_JUSTIFICATION_MIN_LENGTH} znaków).`,
        });
      }

      const plannedSteps = input.steps ? this.planSteps(input.steps, existingSteps, problems) : null;
      if (problems.length) {
        throw new WorkflowError('VALIDATION_FAILED', problems.map(problem => problem.message).join(' '), problems);
      }

      let steps = existingSteps;
      if (plannedSteps) {
        const keptIds = new Set(plannedSteps.map(item => item.existing?.id).filter((id): id is number => id !== undefined));
        const removedIds = existingSteps.filter(step => !keptIds.has(step.id)).map(step => step.id);
        if (removedIds.length) {
          await deleteChainsForOwners(manager, WORKFLOW_STEP_OWNER, removedIds);
          await stepRepository.delete({ id: In(removedIds) });
        }
        const entities = plannedSteps.map((item, index) => Object.assign(item.existing ?? stepRepository.create({ versionId }), {
          key: item.key,
          name: item.input.name,
          sortOrder: index + 1,
          assigneeType: item.input.assigneeType,
          assigneeRef: item.input.assigneeRef,
          formTemplateId: item.input.formTemplateId,
          dueInHours: item.input.dueInHours,
        }));
        steps = entities.length ? await stepRepository.save(entities) : [];
      }

      let transitions = existingTransitions;
      if (input.transitions && !sameContent(input.transitions.map(transitionSnapshot), existingTransitions.map(transitionSnapshot))) {
        await transitionRepository.delete({ versionId });
        transitions = input.transitions.length
          ? await transitionRepository.save(input.transitions.map(transition => transitionRepository.create({ versionId, ...transition })))
          : [];
      }

      version.safetyCritical = safetyCritical;
      version.allowSkipPurposeAudit = requestedAllow;
      if (input.reviewConfig) version.reviewConfig = input.reviewConfig;
      const after = draftSnapshot(version, steps, transitions);
      if (!sameContent(before, after)) {
        version.updatedAt = new Date();
        await manager.getRepository(WorkflowVersion).save(version);
        await recordWorkflowAudit(manager, 'WORKFLOW_DRAFT_UPDATED', actor.id, 'workflow_version', {
          definitionId: definition.id,
          versionId: version.id,
          version: version.version,
          before,
          after,
        });
      }
      if (enablingCriticalSkip) {
        await recordWorkflowAudit(manager, 'SAFETY_SKIP_ENABLED', actor.id, 'workflow_version', {
          definitionId: definition.id,
          versionId: version.id,
          version: version.version,
          subjectType: definition.subjectType,
          taskTypeIds: definition.taskTypeIds,
          justification: input.skipJustification,
        });
      }
      return {
        version: await this.versionDetails(manager, version, definition),
        warning: version.safetyCritical && version.allowSkipPurposeAudit ? SAFETY_SKIP_WARNING : null,
      };
    });
  }

  /** „Nowa wersja”: kopia opublikowanej wersji (etapy, przejścia, łańcuchy, ustawienia) jako wersja robocza. */
  async createNextVersion(versionId: number, actor: WorkflowActor): Promise<WorkflowVersionDetails> {
    return this.dataSource.transaction(async manager => {
      const versionRepository = manager.getRepository(WorkflowVersion);
      const found = await versionRepository.findOne({ where: { id: versionId } });
      if (!found) throw this.versionNotFound();
      const definition = await manager.getRepository(WorkflowDefinition).findOne({
        where: { id: found.definitionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!definition) throw this.definitionNotFound();
      const versions = await versionRepository.find({ where: { definitionId: definition.id } });
      const source = versions.find(version => version.id === versionId);
      if (!source) throw this.versionNotFound();
      if (source.status !== 'PUBLISHED') {
        throw new WorkflowError('CONFLICT', 'Nową wersję tworzy się z wersji opublikowanej.');
      }
      const draft = versions.find(version => isEditableStatus(version.status));
      if (draft) {
        throw new WorkflowError(
          'CONFLICT',
          `Proces ma już wersję roboczą (wersja ${draft.version}) – wprowadź zmiany w niej zamiast tworzyć kolejną.`,
        );
      }

      const safetyCritical = await computeSafetyCritical(manager, definition.subjectType, definition.taskTypeIds ?? []);
      const created = await versionRepository.save(versionRepository.create({
        definitionId: definition.id,
        version: Math.max(...versions.map(version => version.version)) + 1,
        status: 'DRAFT',
        authorId: actor.id,
        safetyCritical,
        // Proces krytyczny: nowa wersja zawsze zaczyna z zablokowanym pomijaniem audytu celowości.
        allowSkipPurposeAudit: safetyCritical ? false : source.allowSkipPurposeAudit,
        reviewConfig: JSON.parse(JSON.stringify(source.reviewConfig ?? DEFAULT_REVIEW_CONFIG)),
        publishedAt: null,
        publishedById: null,
      }));

      const stepRepository = manager.getRepository(WorkflowStep);
      const sourceSteps = (await stepRepository.find({ where: { versionId: source.id } })).sort(byStepOrder);
      const copies = sourceSteps.length
        ? await stepRepository.save(sourceSteps.map(step => stepRepository.create({
          versionId: created.id,
          key: step.key,
          name: step.name,
          sortOrder: step.sortOrder,
          assigneeType: step.assigneeType,
          assigneeRef: step.assigneeRef,
          formTemplateId: step.formTemplateId,
          dueInHours: step.dueInHours,
        })))
        : [];
      const transitionRepository = manager.getRepository(WorkflowTransition);
      const sourceTransitions = (await transitionRepository.find({ where: { versionId: source.id } })).sort(byPriority);
      if (sourceTransitions.length) {
        await transitionRepository.save(sourceTransitions.map(transition => transitionRepository.create({
          versionId: created.id,
          ...transitionSnapshot(transition),
        })));
      }
      const stepIdMap = new Map(sourceSteps.map((step, index) => [step.id, copies[index].id]));
      const chains = await cloneChainsForOwners(manager, WORKFLOW_STEP_OWNER, stepIdMap);

      await recordWorkflowAudit(manager, 'WORKFLOW_VERSION_CREATED', actor.id, 'workflow_version', {
        definitionId: definition.id,
        versionId: created.id,
        version: created.version,
        sourceVersionId: source.id,
        sourceVersion: source.version,
        safetyCritical,
        allowSkipPurposeAudit: created.allowSkipPurposeAudit,
        copied: { steps: copies.length, transitions: sourceTransitions.length, chains: chains.length },
      });
      return this.versionDetails(manager, created, definition);
    });
  }

  /** Lista problemów wersji (bez publikacji i bez zmian w bazie). */
  async validateVersion(versionId: number): Promise<{ valid: boolean; issues: WorkflowIssue[] }> {
    const version = await this.dataSource.getRepository(WorkflowVersion).findOne({ where: { id: versionId } });
    if (!version) throw this.versionNotFound();
    const issues = await this.collectIssues(this.dataSource, version);
    return { valid: issues.length === 0, issues };
  }

  /** Publikacja (W3a: tylko administrator): DRAFT → PUBLISHED, poprzednia PUBLISHED → SUPERSEDED. */
  async publishVersion(versionId: number, actor: WorkflowActor): Promise<{ version: WorkflowVersionDetails; supersededVersionId: number | null }> {
    if (actor.permissions?.all !== true) {
      throw new WorkflowError('FORBIDDEN', 'Publikować procesy może tylko administrator.');
    }
    return this.dataSource.transaction(async manager => {
      const versionRepository = manager.getRepository(WorkflowVersion);
      const found = await versionRepository.findOne({ where: { id: versionId } });
      if (!found) throw this.versionNotFound();
      const definition = await manager.getRepository(WorkflowDefinition).findOne({
        where: { id: found.definitionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!definition) throw this.definitionNotFound();
      const version = await this.lockVersion(manager, versionId);
      if (version.status !== 'DRAFT') {
        throw new WorkflowError('CONFLICT', `Wersja ${version.version} nie jest wersją roboczą – opublikować można tylko wersję roboczą.`);
      }

      const safetyCritical = await computeSafetyCritical(manager, definition.subjectType, definition.taskTypeIds ?? []);
      if (safetyCritical && !version.safetyCritical) version.allowSkipPurposeAudit = false;
      version.safetyCritical = safetyCritical;
      const issues = await this.collectIssues(manager, version);
      if (issues.length) {
        throw new WorkflowError('DEFINITION_INVALID', `Nie można opublikować procesu – popraw błędy (${issues.length}).`, issues);
      }

      const previous = await versionRepository.find({ where: { definitionId: definition.id, status: 'PUBLISHED' } });
      for (const old of previous) {
        old.status = 'SUPERSEDED';
        await versionRepository.save(old);
        await recordWorkflowAudit(manager, 'WORKFLOW_VERSION_SUPERSEDED', actor.id, 'workflow_version', {
          definitionId: definition.id,
          versionId: old.id,
          version: old.version,
          supersededByVersionId: version.id,
        });
      }
      version.status = 'PUBLISHED';
      version.publishedAt = new Date();
      version.publishedById = actor.id;
      await versionRepository.save(version);
      const supersededVersionId = previous[0]?.id ?? null;
      await recordWorkflowAudit(manager, 'WORKFLOW_VERSION_PUBLISHED', actor.id, 'workflow_version', {
        definitionId: definition.id,
        versionId: version.id,
        version: version.version,
        safetyCritical: version.safetyCritical,
        allowSkipPurposeAudit: version.allowSkipPurposeAudit,
        supersededVersionId,
      });
      return { version: await this.versionDetails(manager, version, definition), supersededVersionId };
    });
  }

  /**
   * Przelicza safety_critical wersji roboczych procesów dotyczących typu zadania (po zmianie przełącznika
   * „Krytyczny dla bezpieczeństwa”). Wersje opublikowane zachowują stan z chwili publikacji.
   */
  async refreshDraftsForTaskType(manager: Manager, taskTypeId: number, actorId: number): Promise<number> {
    const definitions = await manager.getRepository(WorkflowDefinition).find({
      where: { subjectType: 'TASK', taskTypeIds: ArrayContains([taskTypeId]) },
    });
    let changed = 0;
    for (const definition of definitions) {
      if (await this.refreshDraftSafety(manager, definition, actorId, 'TASK_TYPE_CHANGED')) changed += 1;
    }
    return changed;
  }

  // ---------------------------------------------------------------------------
  // Pomocnicze
  // ---------------------------------------------------------------------------

  private definitionNotFound(): WorkflowError {
    return new WorkflowError('NOT_FOUND', 'Nie znaleziono procesu.');
  }

  private versionNotFound(): WorkflowError {
    return new WorkflowError('NOT_FOUND', 'Nie znaleziono wersji procesu.');
  }

  private async loadDefinition(manager: Manager, id: number): Promise<WorkflowDefinition> {
    const definition = await manager.getRepository(WorkflowDefinition).findOne({ where: { id } });
    if (!definition) throw this.definitionNotFound();
    return definition;
  }

  private async lockVersion(manager: Manager, versionId: number): Promise<WorkflowVersion> {
    const version = await manager.getRepository(WorkflowVersion).findOne({ where: { id: versionId }, lock: { mode: 'pessimistic_write' } });
    if (!version) throw this.versionNotFound();
    return version;
  }

  private assertEditable(version: WorkflowVersion): void {
    if (isEditableStatus(version.status)) return;
    const message = version.status === 'SUPERSEDED'
      ? `Wersja ${version.version} została zastąpiona nowszą i nie można jej zmieniać.`
      : `Wersja ${version.version} jest opublikowana i nie można jej zmieniać. Utwórz nową wersję.`;
    throw new WorkflowError('VERSION_IMMUTABLE', message);
  }

  private async assertTaskTypes(manager: Manager, subjectType: WorkflowSubjectType, taskTypeIds: number[]): Promise<void> {
    if (subjectType !== 'TASK') {
      if (taskTypeIds.length) {
        throw new WorkflowError('VALIDATION_FAILED', 'Typy zadań można wybrać tylko dla procesu, który dotyczy zadań.', [
          { field: 'taskTypeIds', message: 'Typy zadań można wybrać tylko dla procesu, który dotyczy zadań.' },
        ]);
      }
      return;
    }
    if (!taskTypeIds.length) return;
    const found = new Set((await manager.getRepository(TaskType).find({ where: { id: In(taskTypeIds) } })).map(taskType => taskType.id));
    const missing = taskTypeIds.filter(id => !found.has(id));
    if (missing.length) {
      const message = `Nie znaleziono typów zadań o identyfikatorach: ${missing.join(', ')}.`;
      throw new WorkflowError('VALIDATION_FAILED', message, [{ field: 'taskTypeIds', message }]);
    }
  }

  /** Dopasowanie etapów z żądania do istniejących: po id, potem po kluczu; brakujące klucze generowane z nazw. */
  private planSteps(input: DraftStepInput[], existing: WorkflowStep[], problems: WorkflowProblem[]) {
    const existingById = new Map(existing.map(step => [step.id, step]));
    const matched = new Set<number>();
    const plan = input.map((step, stepIndex) => {
      let current: WorkflowStep | null = null;
      if (step.id !== null) {
        current = existingById.get(step.id) ?? null;
        if (!current) {
          problems.push({
            stepIndex,
            field: 'id',
            message: `Etap „${step.name}” nie należy do tej wersji procesu – odśwież stronę i spróbuj ponownie.`,
          });
        } else {
          matched.add(current.id);
        }
      }
      return { input: step, existing: current, key: step.key ?? current?.key ?? null };
    });
    for (const item of plan) {
      if (item.existing || item.input.id !== null || item.key === null) continue;
      const sameKey = existing.find(step => !matched.has(step.id) && step.key === item.key);
      if (sameKey) {
        matched.add(sameKey.id);
        item.existing = sameKey;
      }
    }
    const taken = new Set(plan.map(item => item.key).filter((key): key is string => key !== null));
    for (const item of plan) {
      if (item.key !== null) continue;
      item.key = uniqueKey(keyFromName(item.input.name, 'etap', STEP_KEY_MAX_LENGTH), taken, STEP_KEY_MAX_LENGTH);
      taken.add(item.key);
    }
    return plan as Array<{ input: DraftStepInput; existing: WorkflowStep | null; key: string }>;
  }

  private async refreshDraftSafety(manager: Manager, definition: WorkflowDefinition, actorId: number, reason: string): Promise<boolean> {
    const versionRepository = manager.getRepository(WorkflowVersion);
    const drafts = await versionRepository.find({
      where: { definitionId: definition.id, status: In([...EDITABLE_VERSION_STATUSES]) },
      lock: { mode: 'pessimistic_write' },
    });
    const safetyCritical = await computeSafetyCritical(manager, definition.subjectType, definition.taskTypeIds ?? []);
    let changed = false;
    for (const draft of drafts) {
      if (draft.safetyCritical === safetyCritical) continue;
      const before = { safetyCritical: draft.safetyCritical, allowSkipPurposeAudit: draft.allowSkipPurposeAudit };
      draft.safetyCritical = safetyCritical;
      if (safetyCritical) draft.allowSkipPurposeAudit = false;
      await versionRepository.save(draft);
      await recordWorkflowAudit(manager, 'WORKFLOW_SAFETY_RECALCULATED', actorId, 'workflow_version', {
        definitionId: definition.id,
        versionId: draft.id,
        version: draft.version,
        reason,
        before,
        after: { safetyCritical: draft.safetyCritical, allowSkipPurposeAudit: draft.allowSkipPurposeAudit },
      });
      changed = true;
    }
    return changed;
  }

  private async collectIssues(manager: Manager, version: WorkflowVersion): Promise<WorkflowIssue[]> {
    const steps = (await manager.getRepository(WorkflowStep).find({ where: { versionId: version.id } })).sort(byStepOrder);
    const transitions = (await manager.getRepository(WorkflowTransition).find({ where: { versionId: version.id } })).sort(byPriority);
    const validationSteps = steps.map(step => ({
      key: step.key,
      name: step.name,
      assigneeType: step.assigneeType,
      assigneeRef: step.assigneeRef,
      formTemplateId: step.formTemplateId,
    }));
    const lookups = await loadValidationLookups(manager, validationSteps, version.reviewConfig);
    return validateWorkflowVersion({
      steps: validationSteps,
      transitions: transitions.map(transitionSnapshot),
      reviewConfig: version.reviewConfig,
      lookups,
    });
  }

  private async definitionDetails(manager: Manager, id: number): Promise<WorkflowDefinitionDetails> {
    const definition = await this.loadDefinition(manager, id);
    const versions = (await manager.getRepository(WorkflowVersion).find({ where: { definitionId: id } }))
      .sort((a, b) => b.version - a.version);
    return { ...definitionSummary(definition, versions), versions: versions.map(versionSummary) };
  }

  private async versionDetails(manager: Manager, version: WorkflowVersion, knownDefinition?: WorkflowDefinition): Promise<WorkflowVersionDetails> {
    const definition = knownDefinition ?? await this.loadDefinition(manager, version.definitionId);
    const steps = (await manager.getRepository(WorkflowStep).find({ where: { versionId: version.id } })).sort(byStepOrder);
    const transitions = (await manager.getRepository(WorkflowTransition).find({ where: { versionId: version.id } })).sort(byPriority);
    const chains = steps.length
      ? await manager.getRepository(AutomationChain).find({ where: { ownerType: WORKFLOW_STEP_OWNER, ownerId: In(steps.map(step => step.id)) } })
      : [];
    return {
      ...versionSummary(version),
      reviewConfig: version.reviewConfig,
      definition: definitionView(definition),
      steps: steps.map(step => ({
        ...stepSnapshot(step),
        id: step.id,
        chains: chains
          .filter(chain => chain.ownerId === step.id)
          .sort((a, b) => a.eventType.localeCompare(b.eventType))
          .map(chain => ({
            id: chain.id,
            eventType: chain.eventType,
            steps: chain.steps,
            onError: chain.onError,
            createdById: chain.createdById,
            updatedAt: chain.updatedAt,
          })),
      })),
      transitions: transitions.map(transition => ({ id: transition.id, ...transitionSnapshot(transition) })),
    };
  }
}

export const workflowService = new WorkflowService();
