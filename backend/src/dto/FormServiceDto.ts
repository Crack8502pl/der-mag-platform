import { FormJsonObject, FormJsonValue, FormKind, FormProcedureType } from '../entities/FormTypes';

export interface CreateFormTemplateDto {
  key: string;
  name: string;
  description?: string | null;
  kind?: FormKind;
  procedureType: FormProcedureType;
}

export interface DraftFieldDto {
  key: string;
  label: string;
  fieldType: string;
  required?: boolean;
  sortOrder?: number;
  validation?: FormJsonObject;
  options?: FormJsonObject;
  conditions?: FormJsonObject;
}

export interface DraftSectionDto {
  key: string;
  title: string;
  description?: string | null;
  sortOrder?: number;
  conditions?: FormJsonObject;
  fields: DraftFieldDto[];
}

export interface UpdateFormDraftDto {
  title?: string;
  description?: string | null;
  settings?: FormJsonObject;
  sections?: DraftSectionDto[];
}

export interface CreateFormInstanceDto {
  templateVersionId: number;
  contractId?: number | null;
  taskId?: number | null;
  subsystemTaskId?: number | null;
  objectId?: number | null;
  deviceId?: number | null;
  bomItemId?: number | null;
  workflowBomItemId?: number | null;
  assignedUserId?: number | null;
  assignedTeamId?: number | null;
}

export type FormResponses = Record<string, FormJsonValue>;

export interface FormInstanceAssignmentInput {
  assignedUserId?: number | null;
  assignedTeamId?: number | null;
}

export interface FormAssignmentRuleInput {
  triggerId?: number | null;
  priority?: number;
  active?: boolean;
  conditions?: FormJsonObject;
  assignedUserId?: number;
  assignedTeamId?: number;
}
