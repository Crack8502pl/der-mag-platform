import { DataSource, EntityManager } from 'typeorm';
import { AppDataSource } from '../config/database';
import { CreateFormInstanceDto, FormInstanceAssignmentInput, FormResponses } from '../dto/FormServiceDto';
import { FormFieldDefinition } from '../entities/FormFieldDefinition';
import { FormFieldValue } from '../entities/FormFieldValue';
import { FormInstance } from '../entities/FormInstance';
import { FormSection } from '../entities/FormSection';
import { FormInstanceStatus, FormVersionStatus } from '../entities/FormTypes';
import { Task } from '../entities/Task';
import { FormTemplateVersion } from '../entities/FormTemplateVersion';
import { FormDomainError } from '../errors/FormDomainError';
import { FormAuditService } from './FormAuditService';
import { validateFormResponses } from './FormRules';

export type FormInstanceAccessGuard = (manager: EntityManager, instance: FormInstance) => Promise<void>;

export class FormInstanceService {
  constructor(private readonly dataSource: DataSource = AppDataSource) {}

  async createInstance(input: CreateFormInstanceDto, actorId: number): Promise<FormInstance> {
    if (input.bomItemId !== undefined && input.bomItemId !== null
      && input.workflowBomItemId !== undefined && input.workflowBomItemId !== null) {
      throw new FormDomainError('INVALID_INSTANCE_CONTEXT', 'Only one BOM item context may be linked to an instance');
    }
    return this.dataSource.transaction(async manager => {
      const version = await manager.getRepository(FormTemplateVersion).findOne({
        where: { id: input.templateVersionId },
      });
      if (!version) {
        throw new FormDomainError('VERSION_NOT_FOUND', `Form version ${input.templateVersionId} was not found`);
      }
      if (version.status !== FormVersionStatus.PUBLISHED) {
        throw new FormDomainError('VERSION_NOT_PUBLISHED', 'Form instances require a published version');
      }

      if (input.taskId != null && input.contractId != null) {
        const task = await manager.getRepository(Task).findOne({ where: { id: input.taskId } });
        if (!task) {
          throw new FormDomainError('INVALID_INSTANCE_CONTEXT', `Task ${input.taskId} was not found`);
        }
        if (task.contractId !== input.contractId) {
          throw new FormDomainError('INVALID_INSTANCE_CONTEXT', 'Task does not belong to the supplied contract');
        }
      }

      const repository = manager.getRepository(FormInstance);
      const instance = await repository.save(repository.create({
        ...input,
        status: FormInstanceStatus.DRAFT,
        createdById: actorId,
      }));
      await FormAuditService.record(manager, 'FORM_INSTANCE_CREATED', actorId, 'form_instance', instance.id, [
        { field: 'templateVersionId', previousValue: null, newValue: instance.templateVersionId },
        { field: 'status', previousValue: null, newValue: instance.status },
      ]);
      return instance;
    });
  }

  async saveResponses(instanceId: number, responses: FormResponses, actorId: number, accessGuard?: FormInstanceAccessGuard): Promise<FormFieldValue[]> {
    return this.dataSource.transaction(async manager => {
      const instance = await this.lockInstance(manager, instanceId);
      await accessGuard?.(manager, instance);
      if (![FormInstanceStatus.DRAFT, FormInstanceStatus.IN_PROGRESS, FormInstanceStatus.REJECTED].includes(instance.status)) {
        throw new FormDomainError('INVALID_INSTANCE_STATUS', 'Responses can only be changed before approval');
      }
      if (!responses || typeof responses !== 'object' || Array.isArray(responses)) {
        throw new FormDomainError('INVALID_RESPONSES', 'Responses must be an object');
      }

      const [sections, fields, existingValues] = await this.loadDefinitionAndValues(manager, instance);
      const values = this.buildResponseMap(fields, existingValues, responses);
      const errors = validateFormResponses(sections, fields, values, false);
      if (errors.length) {
        throw new FormDomainError('INVALID_RESPONSES', 'One or more responses are invalid', { errors });
      }

      const fieldsByKey = new Map(fields.map(field => [field.key, field]));
      const valuesByFieldId = new Map(existingValues.map(value => [value.fieldDefinitionId, value]));
      const changes: Array<{ field: string; previousValue: unknown; newValue: unknown }> = [];
      const failed: string[] = [];
      const toSave = Object.entries(responses).map(([key, value]) => {
        const field = fieldsByKey.get(key)!;
        const existing = valuesByFieldId.get(field.id);
        if (JSON.stringify(existing?.value ?? null) !== JSON.stringify(value ?? null)) {
          changes.push({ field: key, previousValue: existing?.value ?? null, newValue: value });
          if (field.fieldType.toUpperCase() === 'PASS_FAIL' && value === 'FAIL') failed.push(key);
        }
        return manager.getRepository(FormFieldValue).create({
          ...(existing ? { id: existing.id } : {}),
          instanceId: instance.id,
          templateVersionId: instance.templateVersionId,
          fieldDefinitionId: field.id,
          value,
          updatedById: actorId,
        });
      });

      const savedValues = toSave.length ? await manager.getRepository(FormFieldValue).save(toSave) : [];
      const oldStatus = instance.status;
      if (instance.status !== FormInstanceStatus.IN_PROGRESS) {
        instance.status = FormInstanceStatus.IN_PROGRESS;
        await manager.getRepository(FormInstance).save(instance);
      }
      if (changes.length || oldStatus !== instance.status) {
        await FormAuditService.record(manager, 'FORM_RESPONSES_UPDATED', actorId, 'form_instance', instance.id, [
          ...changes,
          ...(oldStatus === instance.status ? [] : [{ field: 'status', previousValue: oldStatus, newValue: instance.status }]),
        ]);
      }
      if (failed.length) {
        await FormAuditService.record(manager, 'FORM_FAIL_RECORDED', actorId, 'form_instance', instance.id,
          changes.filter(change => failed.includes(change.field)), { failedFields: failed });
      }
      return savedValues;
    });
  }

  async validateResponses(instanceId: number): Promise<string[]> {
    const instance = await this.dataSource.getRepository(FormInstance).findOne({ where: { id: instanceId } });
    if (!instance) throw new FormDomainError('INSTANCE_NOT_FOUND', `Form instance ${instanceId} was not found`);
    const manager = this.dataSource.manager;
    const [sections, fields, existingValues] = await this.loadDefinitionAndValues(manager, instance);
    const values = this.buildResponseMap(fields, existingValues, {});
    return validateFormResponses(sections, fields, values, true);
  }

  async complete(instanceId: number, actorId: number, accessGuard?: FormInstanceAccessGuard): Promise<FormInstance> {
    return this.dataSource.transaction(async manager => {
      const instance = await this.lockInstance(manager, instanceId);
      await accessGuard?.(manager, instance);
      if (![FormInstanceStatus.DRAFT, FormInstanceStatus.IN_PROGRESS, FormInstanceStatus.REJECTED].includes(instance.status)) {
        throw new FormDomainError('INVALID_INSTANCE_STATUS', 'Only editable form instances can be completed');
      }
      const [sections, fields, savedValues] = await this.loadDefinitionAndValues(manager, instance);
      const values = this.buildResponseMap(fields, savedValues, {});
      const errors = validateFormResponses(sections, fields, values, true);
      if (errors.length) {
        throw new FormDomainError('INVALID_RESPONSES', 'Form responses do not satisfy completion rules', { errors });
      }

      const oldStatus = instance.status;
      instance.status = FormInstanceStatus.SUBMITTED;
      instance.submittedAt = new Date();
      const saved = await manager.getRepository(FormInstance).save(instance);
      await FormAuditService.record(manager, 'FORM_INSTANCE_COMPLETED', actorId, 'form_instance', instance.id, [
        { field: 'status', previousValue: oldStatus, newValue: saved.status },
        { field: 'submittedAt', previousValue: null, newValue: saved.submittedAt },
      ]);
      return saved;
    });
  }

  async assignInstance(instanceId: number, input: FormInstanceAssignmentInput, actorId: number): Promise<FormInstance> {
    return this.dataSource.transaction(async manager => {
      const instance = await this.lockInstance(manager, instanceId);
      if (![FormInstanceStatus.DRAFT, FormInstanceStatus.IN_PROGRESS, FormInstanceStatus.REJECTED].includes(instance.status)) {
        throw new FormDomainError('INVALID_INSTANCE_STATUS', 'Only editable form instances can be reassigned');
      }
      if (input.assignedUserId === undefined && input.assignedTeamId === undefined) {
        throw new FormDomainError('INVALID_ASSIGNMENT', 'At least one assignment property must be supplied');
      }
      const assignedUserId = input.assignedUserId === undefined ? instance.assignedUserId : input.assignedUserId;
      const assignedTeamId = input.assignedTeamId === undefined ? instance.assignedTeamId : input.assignedTeamId;
      if (assignedUserId === null && assignedTeamId === null) {
        throw new FormDomainError('INVALID_ASSIGNMENT', 'An instance must retain a user or team assignment');
      }
      const changes = [
        { field: 'assignedUserId', previousValue: instance.assignedUserId, newValue: assignedUserId },
        { field: 'assignedTeamId', previousValue: instance.assignedTeamId, newValue: assignedTeamId },
      ];
      instance.assignedUserId = assignedUserId;
      instance.assignedTeamId = assignedTeamId;
      const saved = await manager.getRepository(FormInstance).save(instance);
      await FormAuditService.record(manager, 'FORM_INSTANCE_ASSIGNED', actorId, 'form_instance', instance.id, changes);
      return saved;
    });
  }

  private async lockInstance(manager: EntityManager, instanceId: number): Promise<FormInstance> {
    const instance = await manager.getRepository(FormInstance).findOne({
      where: { id: instanceId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!instance) throw new FormDomainError('INSTANCE_NOT_FOUND', `Form instance ${instanceId} was not found`);
    return instance;
  }

  private async loadDefinitionAndValues(
    manager: EntityManager,
    instance: FormInstance,
  ): Promise<[FormSection[], FormFieldDefinition[], FormFieldValue[]]> {
    const [sections, fields, values] = await Promise.all([
      manager.getRepository(FormSection).find({
        where: { templateVersionId: instance.templateVersionId },
      }),
      manager.getRepository(FormFieldDefinition).find({
        where: { templateVersionId: instance.templateVersionId },
      }),
      manager.getRepository(FormFieldValue).find({ where: { instanceId: instance.id } }),
    ]);
    return [sections, fields, values];
  }

  private buildResponseMap(
    fields: FormFieldDefinition[],
    savedValues: FormFieldValue[],
    updates: FormResponses,
  ): FormResponses {
    const values: FormResponses = Object.create(null);
    const keyById = new Map(fields.map(field => [field.id, field.key]));
    for (const saved of savedValues) {
      const key = keyById.get(saved.fieldDefinitionId);
      if (key) values[key] = saved.value;
    }
    const merged: FormResponses = Object.create(null);
    for (const [key, value] of Object.entries(values)) merged[key] = value;
    for (const [key, value] of Object.entries(updates)) merged[key] = value;
    return merged;
  }
}

export default FormInstanceService;
