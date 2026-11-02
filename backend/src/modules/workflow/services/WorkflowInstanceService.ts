import { IsNull, type DataSource, type EntityManager } from 'typeorm';
import { AppDataSource } from '../../../config/database';
import { Brigade } from '../../../entities/Brigade';
import { BrigadeMember } from '../../../entities/BrigadeMember';
import { Contract } from '../../../entities/Contract';
import { Device } from '../../../entities/Device';
import { FormFieldDefinition } from '../../../entities/FormFieldDefinition';
import { FormFieldValue } from '../../../entities/FormFieldValue';
import { FormInstance } from '../../../entities/FormInstance';
import { FormTemplateVersion } from '../../../entities/FormTemplateVersion';
import { FormInstanceStatus, FormVersionStatus } from '../../../entities/FormTypes';
import { Role } from '../../../entities/Role';
import { Task } from '../../../entities/Task';
import { TaskAssignment } from '../../../entities/TaskAssignment';
import { User } from '../../../entities/User';
import type { CreateFormInstanceDto, FormResponses } from '../../../dto/FormServiceDto';
import { FormDomainError } from '../../../errors/FormDomainError';
import { FormInstanceService } from '../../../services/FormInstanceService';
import { evaluateCondition, type Condition } from '../../../services/FormRules';
import { domainEventBus, type DomainEventBus, type DomainEventInput } from '../../events/DomainEventBus';
import { FunctionGroup } from '../../function-groups/entities/FunctionGroup';
import { EffectivePermissionsService } from '../../function-groups/services/EffectivePermissionsService';
import { WORKFLOW_SUBJECT_TYPES, type WorkflowSubjectType } from '../contracts';
import { WorkflowDefinition } from '../entities/WorkflowDefinition';
import { WorkflowInstance, type WorkflowInstanceStatus } from '../entities/WorkflowInstance';
import { WorkflowStep } from '../entities/WorkflowStep';
import { WorkflowStepRun, type WorkflowStepOutcome } from '../entities/WorkflowStepRun';
import { WorkflowTransition } from '../entities/WorkflowTransition';
import { WorkflowVersion } from '../entities/WorkflowVersion';
import { WorkflowError } from '../errors';
import { parseId } from '../validation/parseInput';
import type { WorkflowActor } from './WorkflowService';
import { recordWorkflowAudit } from './workflowAudit';

type Emit = (event: DomainEventInput) => void;
export interface WorkflowInstanceFilters {
  definitionId?: number;
  status?: WorkflowInstanceStatus;
  stepKey?: string;
  subjectType?: WorkflowSubjectType;
  subjectId?: number;
  overdue?: boolean;
}

export function hasWorkflowPermission(actor: WorkflowActor, action: 'read' | 'start' | 'execute' | 'override'): boolean {
  return actor.permissions.all === true || actor.permissions.workflow?.[action] === true;
}

function requirePermission(actor: WorkflowActor, action: 'read' | 'start' | 'execute' | 'override'): void {
  if (!hasWorkflowPermission(actor, action)) throw new WorkflowError('FORBIDDEN', 'Brak uprawnień do tej operacji procesu.');
}

function requireReason(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 4000) {
    throw new WorkflowError('VALIDATION_FAILED', 'Podaj uzasadnienie (maksymalnie 4000 znaków).');
  }
  return value.trim();
}

export class WorkflowInstanceService {
  constructor(
    private readonly dataSource: DataSource = AppDataSource,
    private readonly events: DomainEventBus = domainEventBus,
    private readonly effectivePermissions = EffectivePermissionsService.get.bind(EffectivePermissionsService),
  ) {}

  async start(input: { definitionId?: unknown; subjectType?: unknown; subjectId?: unknown }, actor: WorkflowActor) {
    requirePermission(actor, 'start');
    const definitionId = parseId(input.definitionId, 'identyfikator definicji');
    const subjectId = parseId(input.subjectId, 'identyfikator przedmiotu');
    try {
      return await this.events.afterCommit(this.dataSource, async (manager, emit) => {
        const definition = await manager.getRepository(WorkflowDefinition).findOne({
          where: { id: definitionId }, lock: { mode: 'pessimistic_write' },
        });
        if (!definition || !definition.active) throw new WorkflowError('NOT_FOUND', 'Nie znaleziono aktywnej definicji procesu.');
        if (input.subjectType !== undefined && input.subjectType !== definition.subjectType) {
          throw new WorkflowError('VALIDATION_FAILED', 'Typ przedmiotu nie pasuje do definicji procesu.');
        }
        await this.validateSubject(manager, definition, subjectId);
        const version = await manager.getRepository(WorkflowVersion).findOne({
          where: { definitionId, status: 'PUBLISHED' }, order: { version: 'DESC' },
        });
        if (!version) throw new WorkflowError('CONFLICT', 'Proces nie ma opublikowanej wersji.');
        const steps = await this.steps(manager, version.id);
        if (!steps.length) throw new WorkflowError('CONFLICT', 'Proces nie ma etapów.');
        const repository = manager.getRepository(WorkflowInstance);
        const existing = await repository.findOne({ where: { definitionId, subjectType: definition.subjectType, subjectId, status: 'RUNNING' } });
        if (existing) throw new WorkflowError('CONFLICT', 'Dla tego przedmiotu trwa już realizacja procesu.');
        const instance = await repository.save(repository.create({
          definitionId, versionId: version.id, subjectType: definition.subjectType, subjectId,
          status: 'RUNNING', currentStepKey: null, currentStepRunId: null,
          startedById: actor.id, startedAt: new Date(), completedAt: null, cancelledReason: null,
        }));
        await recordWorkflowAudit(manager, 'WORKFLOW_INSTANCE_STARTED', actor.id, 'workflow_instance', { instanceId: instance.id, definitionId, versionId: version.id, subjectId, subjectType: instance.subjectType });
        this.emit(emit, 'WORKFLOW_STARTED', instance, actor.id);
        await this.enter(manager, emit, instance, steps[0], actor.id);
        return this.detail(manager, instance);
      });
    } catch (error) {
      const code = error as { code?: string; driverError?: { code?: string } };
      if (code.code === '23505' || code.driverError?.code === '23505') {
        throw new WorkflowError('CONFLICT', 'Dla tego przedmiotu trwa już realizacja procesu.');
      }
      if (error instanceof FormDomainError) throw new WorkflowError('VALIDATION_FAILED', 'Nie można utworzyć formularza etapu. Sprawdź jego definicję i kontekst przedmiotu.');
      throw error;
    }
  }

  async getById(id: number, actor: WorkflowActor) {
    requirePermission(actor, 'read');
    const instance = await this.dataSource.getRepository(WorkflowInstance).findOne({ where: { id } });
    if (!instance) throw new WorkflowError('NOT_FOUND', 'Nie znaleziono realizacji procesu.');
    return this.detail(this.dataSource.manager, instance);
  }

  async list(filters: WorkflowInstanceFilters, actor: WorkflowActor) {
    requirePermission(actor, 'read');
    if (filters.status !== undefined && !['RUNNING', 'COMPLETED', 'CANCELLED'].includes(filters.status)) {
      throw new WorkflowError('VALIDATION_FAILED', 'Nieprawidłowy status realizacji.');
    }
    if (filters.subjectType !== undefined && !WORKFLOW_SUBJECT_TYPES.includes(filters.subjectType)) {
      throw new WorkflowError('VALIDATION_FAILED', 'Nieprawidłowy typ przedmiotu.');
    }
    const { overdue, stepKey, ...where } = filters;
    const instances = await this.dataSource.getRepository(WorkflowInstance).find({
      where: { ...where, ...(stepKey ? { currentStepKey: stepKey } : {}) }, order: { id: 'DESC' },
    });
    const result = await Promise.all(instances.map(instance => this.detail(this.dataSource.manager, instance)));
    if (overdue === undefined) return result;
    return result.filter(instance => {
      const due = instance.currentStepRun?.dueAt;
      const isOverdue = instance.status === 'RUNNING' && due != null && new Date(due).getTime() < Date.now();
      return overdue === isOverdue;
    });
  }

  async mySteps(actor: WorkflowActor) {
    requirePermission(actor, 'read');
    const runs = await this.dataSource.getRepository(WorkflowStepRun).find({ where: { outcome: IsNull() }, order: { startedAt: 'ASC', id: 'ASC' } });
    const result = [];
    for (const run of runs) {
      if (!await this.isAssignee(this.dataSource.manager, run, actor.id)) continue;
      const instance = await this.dataSource.getRepository(WorkflowInstance).findOne({ where: { id: run.instanceId, status: 'RUNNING', currentStepRunId: run.id } });
      if (instance) result.push({ ...run, enteredAt: run.startedAt, reason: run.note, instance });
    }
    return result;
  }

  async complete(id: number, actor: WorkflowActor) {
    requirePermission(actor, 'execute');
    return this.changeCurrent(id, actor, async (manager, emit, instance, run) => {
      if (!await this.isAssignee(manager, run, actor.id) && !hasWorkflowPermission(actor, 'override')) {
        throw new WorkflowError('FORBIDDEN', 'Tylko wykonawca etapu może go ukończyć.');
      }
      const answers = await this.completedFormAnswers(manager, run);
      const steps = await this.steps(manager, instance.versionId);
      const transitions = await manager.getRepository(WorkflowTransition).find({
        where: { versionId: instance.versionId, fromStepKey: run.stepKey }, order: { priority: 'ASC', id: 'ASC' },
      });
      const transition = transitions.find(item => item.condition === null || evaluateCondition(item.condition as Condition, answers));
      const index = steps.findIndex(step => step.id === run.stepId);
      const next = transition ? steps.find(step => step.key === transition.toStepKey) : steps[index + 1];
      if (transition && !next) throw new WorkflowError('CONFLICT', 'Nie znaleziono docelowego etapu procesu.');
      const outcome = next && steps.indexOf(next) <= index ? 'RETURNED' : 'COMPLETED';
      await this.finishRun(manager, emit, instance, run, actor.id, outcome, null);
      if (next) await this.enter(manager, emit, instance, next, actor.id);
      else {
        instance.status = 'COMPLETED';
        instance.completedAt = new Date();
        instance.currentStepKey = null;
        instance.currentStepRunId = null;
        await manager.getRepository(WorkflowInstance).save(instance);
        await recordWorkflowAudit(manager, 'WORKFLOW_INSTANCE_COMPLETED', actor.id, 'workflow_instance', { instanceId: instance.id, versionId: instance.versionId });
        this.emit(emit, 'WORKFLOW_COMPLETED', instance, actor.id);
      }
    });
  }

  async force(id: number, input: { reason?: unknown; toStepKey?: unknown; targetStepKey?: unknown }, actor: WorkflowActor) {
    requirePermission(actor, 'override');
    const reason = requireReason(input.reason);
    const targetStepKey = input.toStepKey ?? input.targetStepKey;
    if (typeof targetStepKey !== 'string' || !targetStepKey.trim()) {
      throw new WorkflowError('VALIDATION_FAILED', 'Wybierz docelowy etap procesu.');
    }
    return this.changeCurrent(id, actor, async (manager, emit, instance, run) => {
      const target = await manager.getRepository(WorkflowStep).findOne({ where: { versionId: instance.versionId, key: targetStepKey } });
      if (!target) throw new WorkflowError('VALIDATION_FAILED', 'Wybrany etap nie należy do wersji tej realizacji.');
      await this.finishRun(manager, emit, instance, run, actor.id, 'FORCED', reason, { toStepKey: target.key });
      await this.enter(manager, emit, instance, target, actor.id);
    });
  }

  async cancel(id: number, input: { reason?: unknown }, actor: WorkflowActor) {
    requirePermission(actor, 'override');
    const reason = requireReason(input.reason);
    return this.changeCurrent(id, actor, async (manager, emit, instance, run) => {
      await this.finishRun(manager, emit, instance, run, actor.id, 'CANCELLED', reason);
      instance.status = 'CANCELLED';
      instance.completedAt = new Date();
      instance.cancelledReason = reason;
      instance.currentStepKey = null;
      instance.currentStepRunId = null;
      await manager.getRepository(WorkflowInstance).save(instance);
      await recordWorkflowAudit(manager, 'WORKFLOW_INSTANCE_CANCELLED', actor.id, 'workflow_instance', { instanceId: instance.id, reason });
      this.emit(emit, 'WORKFLOW_CANCELLED', instance, actor.id, run, { reason });
    });
  }

  private async changeCurrent(
    id: number, actor: WorkflowActor,
    work: (manager: EntityManager, emit: Emit, instance: WorkflowInstance, run: WorkflowStepRun) => Promise<void>,
  ) {
    // Odczyt przed oczekiwaniem na blokadę zapobiega ukończeniu nowego etapu przez drugie równoległe żądanie.
    const expected = await this.dataSource.getRepository(WorkflowInstance).findOne({ where: { id } });
    if (!expected) throw new WorkflowError('NOT_FOUND', 'Nie znaleziono realizacji procesu.');
    try {
      return await this.events.afterCommit(this.dataSource, async (manager, emit) => {
        const instance = await manager.getRepository(WorkflowInstance).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
        if (!instance || instance.status !== 'RUNNING' || !instance.currentStepRunId || instance.currentStepRunId !== expected.currentStepRunId) {
          throw new WorkflowError('CONFLICT', 'Etap został już zmieniony lub realizacja jest zakończona. Odśwież widok.');
        }
        const run = await manager.getRepository(WorkflowStepRun).findOne({ where: { id: instance.currentStepRunId, instanceId: id } });
        if (!run || run.outcome !== null) throw new WorkflowError('CONFLICT', 'Etap został już zakończony.');
        await work(manager, emit, instance, run);
        return this.detail(manager, instance);
      });
    } catch (error) {
      if (error instanceof FormDomainError) throw new WorkflowError('VALIDATION_FAILED', 'Nie można utworzyć formularza etapu. Sprawdź jego definicję i kontekst przedmiotu.');
      throw error;
    }
  }

  private async steps(manager: EntityManager, versionId: number) {
    return manager.getRepository(WorkflowStep).find({ where: { versionId }, order: { sortOrder: 'ASC', id: 'ASC' } });
  }

  private async detail(manager: EntityManager, instance: WorkflowInstance) {
    const runs = await manager.getRepository(WorkflowStepRun).find({ where: { instanceId: instance.id }, order: { startedAt: 'ASC', id: 'ASC' } });
    const history = runs.map(run => ({ ...run, enteredAt: run.startedAt, reason: run.note }));
    return {
      ...instance, createdAt: instance.startedAt, finishedAt: instance.completedAt, cancellationReason: instance.cancelledReason,
      currentStepRun: history.find(run => run.id === instance.currentStepRunId) ?? null, history, stepRuns: history,
    };
  }

  private async validateSubject(manager: EntityManager, definition: WorkflowDefinition, subjectId: number) {
    const subject = definition.subjectType === 'TASK'
      ? await manager.getRepository(Task).findOne({ where: { id: subjectId } })
      : definition.subjectType === 'CONTRACT'
        ? await manager.getRepository(Contract).findOne({ where: { id: subjectId } })
        : await manager.getRepository(Device).findOne({ where: { id: subjectId } });
    if (!subject || ('deletedAt' in subject && subject.deletedAt)) throw new WorkflowError('NOT_FOUND', 'Nie znaleziono przedmiotu procesu.');
    if (definition.subjectType === 'TASK' && !definition.taskTypeIds.includes((subject as Task).taskTypeId)) {
      throw new WorkflowError('VALIDATION_FAILED', 'Typ zadania nie jest obsługiwany przez ten proces.');
    }
  }

  private async subjectUser(manager: EntityManager, instance: WorkflowInstance): Promise<number | null> {
    if (instance.subjectType === 'CONTRACT') {
      return (await manager.getRepository(Contract).findOne({ where: { id: instance.subjectId } }))?.projectManagerId ?? null;
    }
    const taskId = instance.subjectType === 'TASK' ? instance.subjectId
      : (await manager.getRepository(Device).findOne({ where: { id: instance.subjectId } }))?.taskId;
    if (!taskId) return null;
    return (await manager.getRepository(TaskAssignment).findOne({ where: { taskId }, order: { assignedAt: 'ASC', id: 'ASC' } }))?.userId ?? null;
  }

  private async formContext(manager: EntityManager, instance: WorkflowInstance): Promise<Pick<CreateFormInstanceDto, 'taskId' | 'contractId' | 'deviceId'>> {
    if (instance.subjectType === 'CONTRACT') return { contractId: instance.subjectId };
    const device = instance.subjectType === 'DEVICE'
      ? await manager.getRepository(Device).findOne({ where: { id: instance.subjectId } }) : null;
    const taskId = instance.subjectType === 'TASK' ? instance.subjectId : device?.taskId;
    const task = taskId ? await manager.getRepository(Task).findOne({ where: { id: taskId } }) : null;
    return {
      ...(instance.subjectType === 'DEVICE' ? { deviceId: instance.subjectId } : {}),
      ...(task ? { taskId: task.id, contractId: task.contractId ?? null } : {}),
    };
  }

  private async assignment(manager: EntityManager, instance: WorkflowInstance, step: WorkflowStep) {
    const type = step.assigneeType;
    if (!type) throw new WorkflowError('CONFLICT', 'Etap nie ma wykonawcy.');
    if (type === 'USER' || type === 'SUBJECT_ASSIGNEE') {
      const userId = type === 'USER' ? Number(step.assigneeRef) : await this.subjectUser(manager, instance);
      const user = userId ? await manager.getRepository(User).findOne({ where: { id: userId } }) : null;
      if (!user || !user.active) throw new WorkflowError('CONFLICT', 'Nie znaleziono aktywnego wykonawcy etapu.');
      return { assigneeType: type, assignedUserId: user.id, assignedGroupType: null, assignedGroupRef: null };
    }
    const ref = step.assigneeRef;
    const group = type === 'FUNCTION_GROUP'
      ? await manager.getRepository(FunctionGroup).findOne({ where: { key: ref ?? '', active: true } })
      : type === 'ROLE'
        ? await manager.getRepository(Role).findOne({ where: { id: Number(ref) } })
        : await manager.getRepository(Brigade).findOne({ where: { id: Number(ref), active: true } });
    if (!group || !ref) throw new WorkflowError('CONFLICT', 'Nie znaleziono aktywnej grupy wykonawców.');
    return { assigneeType: type, assignedUserId: null, assignedGroupType: type, assignedGroupRef: ref };
  }

  async isAssignee(manager: EntityManager, run: WorkflowStepRun, userId: number): Promise<boolean> {
    const user = await manager.getRepository(User).findOne({ where: { id: userId } });
    if (!user || !user.active) return false;
    if (run.assignedUserId !== null) return run.assignedUserId === userId;
    if (run.assignedGroupType === 'ROLE') return user.roleId === Number(run.assignedGroupRef);
    if (run.assignedGroupType === 'FUNCTION_GROUP') {
      const effective = await this.effectivePermissions(userId);
      return effective?.functionGroups.some(group => group.key === run.assignedGroupRef) ?? false;
    }
    if (run.assignedGroupType === 'BRIGADE') {
      if (!await manager.getRepository(Brigade).findOne({ where: { id: Number(run.assignedGroupRef), active: true } })) return false;
      const members = await manager.getRepository(BrigadeMember).find({ where: { brigadeId: Number(run.assignedGroupRef), userId, active: true } });
      const today = new Date().toISOString().slice(0, 10);
      const date = (value: Date | string) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
      return members.some(member => date(member.validFrom) <= today && (!member.validTo || date(member.validTo) >= today));
    }
    return false;
  }

  private async enter(manager: EntityManager, emit: Emit, instance: WorkflowInstance, step: WorkflowStep, actorId: number) {
    const assignment = await this.assignment(manager, instance, step);
    const repository = manager.getRepository(WorkflowStepRun);
    const previous = await repository.findOne({ where: { instanceId: instance.id, stepKey: step.key }, order: { attempt: 'DESC' } });
    let formInstanceId: number | null = null;
    let formTemplateVersionId: number | null = null;
    if (step.formTemplateId !== null) {
      const version = await manager.getRepository(FormTemplateVersion).findOne({
        where: { templateId: step.formTemplateId, status: FormVersionStatus.PUBLISHED }, order: { version: 'DESC' },
      });
      if (!version) throw new WorkflowError('CONFLICT', 'Formularz etapu nie ma opublikowanej wersji.');
      const subjectContext = await this.formContext(manager, instance);
      const form = await new FormInstanceService(this.dataSource).createInstanceInTransaction(manager, {
        templateVersionId: version.id, ...subjectContext, assignedUserId: assignment.assignedUserId,
        assignedTeamId: assignment.assignedGroupType === 'BRIGADE' ? Number(assignment.assignedGroupRef) : null,
      }, actorId);
      formInstanceId = form.id;
      formTemplateVersionId = version.id;
    }
    const startedAt = new Date();
    const run = await repository.save(repository.create({
      instanceId: instance.id, stepId: step.id, stepKey: step.key, attempt: (previous?.attempt ?? 0) + 1,
      ...assignment, formInstanceId, formTemplateVersionId, startedAt,
      dueAt: step.dueInHours == null ? null : new Date(startedAt.getTime() + step.dueInHours * 3600000),
      completedAt: null, completedById: null, outcome: null, note: null,
    }));
    instance.currentStepKey = step.key;
    instance.currentStepRunId = run.id;
    await manager.getRepository(WorkflowInstance).save(instance);
    await recordWorkflowAudit(manager, 'WORKFLOW_STEP_ENTERED', actorId, 'workflow_instance', { instanceId: instance.id, stepRunId: run.id, stepId: step.id, stepKey: step.key, attempt: run.attempt, ...assignment, formInstanceId, formTemplateVersionId });
    this.emit(emit, 'STEP_ENTERED', instance, actorId, run);
  }

  private async completedFormAnswers(manager: EntityManager, run: WorkflowStepRun): Promise<FormResponses> {
    if (run.formInstanceId === null) return {};
    const form = await manager.getRepository(FormInstance).findOne({ where: { id: run.formInstanceId }, lock: { mode: 'pessimistic_read' } });
    if (!form) throw new WorkflowError('CONFLICT', 'Nie znaleziono formularza etapu.');
    const version = await manager.getRepository(FormTemplateVersion).findOne({ where: { id: form.templateVersionId } });
    if (!version) throw new WorkflowError('CONFLICT', 'Nie znaleziono wersji formularza etapu.');
    const settings = version.settings ?? {};
    const approval = settings.approval;
    const requiresApproval = settings.requiresApproval === true || settings.approvalRequired === true
      || (approval !== null && typeof approval === 'object' && !Array.isArray(approval) && (approval.required === true || approval.enabled === true));
    const allowed = requiresApproval ? [FormInstanceStatus.APPROVED] : [FormInstanceStatus.SUBMITTED, FormInstanceStatus.APPROVED];
    if (!allowed.includes(form.status)) throw new WorkflowError('CONFLICT', requiresApproval ? 'Formularz etapu wymaga zatwierdzenia.' : 'Najpierw ukończ formularz etapu.');
    const [fields, values] = await Promise.all([
      manager.getRepository(FormFieldDefinition).find({ where: { templateVersionId: form.templateVersionId } }),
      manager.getRepository(FormFieldValue).find({ where: { instanceId: form.id } }),
    ]);
    const byId = new Map(fields.map(field => [field.id, field.key]));
    return Object.fromEntries(values.filter(value => byId.has(value.fieldDefinitionId)).map(value => [byId.get(value.fieldDefinitionId)!, value.value]));
  }

  private async finishRun(manager: EntityManager, emit: Emit, instance: WorkflowInstance, run: WorkflowStepRun, actorId: number, outcome: WorkflowStepOutcome, reason: string | null, extra: Record<string, unknown> = {}) {
    run.outcome = outcome;
    run.completedAt = new Date();
    run.completedById = actorId;
    run.note = reason;
    await manager.getRepository(WorkflowStepRun).save(run);
    const eventType = outcome === 'FORCED' ? 'WORKFLOW_STEP_FORCED' : 'WORKFLOW_STEP_COMPLETED';
    await recordWorkflowAudit(manager, eventType, actorId, 'workflow_instance', { instanceId: instance.id, stepRunId: run.id, stepId: run.stepId, attempt: run.attempt, outcome, reason, ...extra });
    if (outcome !== 'CANCELLED') this.emit(emit, 'STEP_COMPLETED', instance, actorId, run, { outcome, reason, ...extra });
    if (outcome === 'FORCED') this.emit(emit, 'WORKFLOW_FORCED', instance, actorId, run, { outcome, reason, ...extra });
  }

  private emit(emit: Emit, type: string, instance: WorkflowInstance, actorId: number, run?: WorkflowStepRun, extra: Record<string, unknown> = {}) {
    emit({
      type, actorId, subject: { type: instance.subjectType, id: instance.subjectId },
      payload: {
        workflowInstanceId: instance.id, workflowVersionId: instance.versionId, definitionId: instance.definitionId,
        subjectType: instance.subjectType, subjectId: instance.subjectId,
        ...(instance.subjectType === 'TASK' ? { taskId: instance.subjectId } : {}),
        ...(instance.subjectType === 'CONTRACT' ? { contractId: instance.subjectId } : {}),
        ...(instance.subjectType === 'DEVICE' ? { deviceId: instance.subjectId } : {}),
        ...(run ? { workflowStepId: run.stepId, stepKey: run.stepKey, stepRunId: run.id, attempt: run.attempt, instanceId: run.formInstanceId, formTemplateVersionId: run.formTemplateVersionId } : {}),
        ...extra,
      },
    });
  }
}

export const workflowInstances = new WorkflowInstanceService();
