// src/modules/workflow/validation/loadValidationLookups.ts
// Dane z bazy potrzebne do walidacji wersji procesu: formularze (z polami ostatniej opublikowanej wersji),
// role, funkcje, brygady i osoby wskazane w etapach oraz funkcje z ustawień zatwierdzania.

import { In, type EntityManager } from 'typeorm';
import { Brigade } from '../../../entities/Brigade';
import { FormFieldDefinition } from '../../../entities/FormFieldDefinition';
import { FormTemplate } from '../../../entities/FormTemplate';
import { FormTemplateVersion } from '../../../entities/FormTemplateVersion';
import { FormVersionStatus } from '../../../entities/FormTypes';
import { Role } from '../../../entities/Role';
import { User } from '../../../entities/User';
import { FunctionGroup } from '../../function-groups/entities/FunctionGroup';
import { REVIEW_STAGES } from '../contracts';
import {
  parseRefId,
  type ValidationForm,
  type ValidationStep,
  type WorkflowValidationLookups,
} from './validateWorkflowVersion';

const unique = <T>(values: T[]): T[] => [...new Set(values)];
const notNull = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;

function refIds(steps: ValidationStep[], assigneeType: string): number[] {
  return unique(steps.filter(step => step.assigneeType === assigneeType).map(step => parseRefId(step.assigneeRef?.trim() ?? null)).filter(notNull));
}

function reviewFunctionKeys(reviewConfig: unknown): string[] {
  if (typeof reviewConfig !== 'object' || reviewConfig === null) return [];
  return REVIEW_STAGES.map(stage => {
    const config = (reviewConfig as Record<string, unknown>)[stage];
    const key = typeof config === 'object' && config !== null ? (config as Record<string, unknown>).functionKey : undefined;
    return typeof key === 'string' && key.trim() ? key.trim() : null;
  }).filter(notNull);
}

async function loadForms(manager: Pick<EntityManager, 'getRepository'>, formIds: number[]): Promise<Map<number, ValidationForm>> {
  const forms = new Map<number, ValidationForm>();
  if (!formIds.length) return forms;
  const templates = await manager.getRepository(FormTemplate).find({ where: { id: In(formIds) } });
  if (!templates.length) return forms;
  const versions = await manager.getRepository(FormTemplateVersion).find({
    where: { templateId: In(templates.map(template => template.id)), status: FormVersionStatus.PUBLISHED },
    order: { version: 'DESC' },
  });
  const latestVersionByTemplate = new Map<number, number>();
  for (const version of versions) {
    if (!latestVersionByTemplate.has(version.templateId)) latestVersionByTemplate.set(version.templateId, version.id);
  }
  const fields = latestVersionByTemplate.size
    ? await manager.getRepository(FormFieldDefinition).find({ where: { templateVersionId: In([...latestVersionByTemplate.values()]) } })
    : [];
  const keysByVersion = new Map<number, Set<string>>();
  for (const field of fields) {
    const keys = keysByVersion.get(field.templateVersionId) ?? new Set<string>();
    keys.add(field.key);
    keysByVersion.set(field.templateVersionId, keys);
  }
  for (const template of templates) {
    const versionId = latestVersionByTemplate.get(template.id);
    forms.set(template.id, {
      name: template.name,
      publishedFieldKeys: versionId === undefined ? null : keysByVersion.get(versionId) ?? new Set<string>(),
    });
  }
  return forms;
}

export async function loadValidationLookups(
  manager: Pick<EntityManager, 'getRepository'>,
  steps: ValidationStep[],
  reviewConfig: unknown,
): Promise<WorkflowValidationLookups> {
  const roleIds = refIds(steps, 'ROLE');
  const brigadeIds = refIds(steps, 'BRIGADE');
  const userIds = refIds(steps, 'USER');
  const functionKeys = unique([
    ...steps.filter(step => step.assigneeType === 'FUNCTION_GROUP').map(step => step.assigneeRef?.trim() || null).filter(notNull),
    ...reviewFunctionKeys(reviewConfig),
  ]);

  // Zapytania po kolei – walidacja publikacji działa w transakcji na jednym połączeniu.
  const forms = await loadForms(manager, unique(steps.map(step => step.formTemplateId).filter(notNull)));
  const roles = roleIds.length ? await manager.getRepository(Role).find({ where: { id: In(roleIds) } }) : [];
  const brigades = brigadeIds.length ? await manager.getRepository(Brigade).find({ where: { id: In(brigadeIds) } }) : [];
  const users = userIds.length ? await manager.getRepository(User).find({ where: { id: In(userIds) } }) : [];
  const functionGroups = functionKeys.length
    ? await manager.getRepository(FunctionGroup).find({ where: { key: In(functionKeys) } })
    : [];

  return {
    forms,
    roles: new Map(roles.map(role => [role.id, { name: role.name }])),
    brigades: new Map(brigades.map(brigade => [brigade.id, { name: brigade.name, active: brigade.active }])),
    users: new Map(users.map(user => [
      user.id,
      { name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(), active: user.active && !user.deletedAt },
    ])),
    functionGroups: new Map(functionGroups.map(group => [group.key, { name: group.name, active: group.active }])),
  };
}
