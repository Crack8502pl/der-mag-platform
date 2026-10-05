export type FormKind = 'FORM' | 'CHECKLIST';
export type FormProcedureType = 'CABINET_PREFABRICATION' | 'DEVICE_PRECONFIGURATION' | 'FIELD_INSTALLATION';
export type FormVersionStatus = 'DRAFT' | 'PUBLISHED';

export interface FormTemplate {
  id: number;
  key: string;
  name: string;
  description: string | null;
  kind: FormKind;
  procedureType: FormProcedureType;
  active: boolean;
}

export interface FormCondition {
  field: string;
  operator: string;
  value?: string | number | boolean | null | Array<string | number | boolean | null>;
}

export interface FormField {
  key: string;
  label: string;
  fieldType: string;
  required: boolean;
  sortOrder: number;
  validation: Record<string, unknown>;
  options: Record<string, unknown>;
  conditions: Record<string, FormCondition>;
}

export interface FormSection {
  key: string;
  title: string;
  description?: string;
  sortOrder: number;
  conditions: Record<string, FormCondition>;
  fields: FormField[];
}

export interface FormVersion {
  id: number;
  templateId: number;
  version: number;
  status: FormVersionStatus;
  title: string;
  description: string | null;
  kind: FormKind;
  procedureType: FormProcedureType;
  settings: Record<string, unknown>;
  publishedAt: string | null;
  sections: Array<Omit<FormSection, 'fields'> & { id: number }>;
  fields: Array<FormField & { id: number; sectionId: number }>;
  assignmentRules: FormAssignmentRule[];
}

export interface FormAssignmentRule {
  id?: number;
  assignedUserId?: number | null;
  assignedTeamId?: number | null;
  triggerId?: number | null;
  priority: number;
  active: boolean;
  conditions: Record<string, unknown>;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
