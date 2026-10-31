export type FormKind = 'FORM' | 'CHECKLIST';
export type FormProcedureType = 'CABINET_PREFABRICATION' | 'DEVICE_PRECONFIGURATION' | 'FIELD_INSTALLATION';
export type FormVersionStatus = 'DRAFT' | 'PUBLISHED';
export type FormBrandingKind = 'HEADER' | 'FOOTER';
export type FormBrandingMode = 'FILE' | 'CUSTOM';

export interface FormBrandingElement {
  type: 'text' | 'logo' | 'variable' | 'pageNumber' | 'printDate';
  text?: string;
  assetPath?: string;
  alt?: string;
  source?: string;
}

export interface FormBrandingLayout {
  columns: {
    left: FormBrandingElement[];
    center: FormBrandingElement[];
    right: FormBrandingElement[];
  };
  separator: boolean;
}

export interface FormBrandingSnapshot {
  id: number;
  name: string;
  kind: FormBrandingKind;
  mode: FormBrandingMode;
  heightMm: number;
  filePath: string | null;
  fileMime: string | null;
  layout: FormBrandingLayout | null;
}

export interface FormBranding extends FormBrandingSnapshot {
  isDefault: boolean;
}

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
  description?: string | null;
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
  headerId?: number | null;
  footerId?: number | null;
  headerSnapshot?: FormBrandingSnapshot | null;
  footerSnapshot?: FormBrandingSnapshot | null;
  publishedAt: string | null;
  sections: Array<Omit<FormSection, 'fields'> & { id: number }>;
  fields: Array<FormField & { id: number; sectionId: number }>;
  triggers?: FormTrigger[];
  assignmentRules: FormAssignmentRule[];
}

export interface FormTrigger {
  id: number;
  eventType: string;
  active: boolean;
}

export interface FormUserOption {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
}

export interface FormTeamOption {
  id: number;
  code: string;
  name: string;
}

export type FormVersionSummary = Pick<
  FormVersion,
  'id' | 'templateId' | 'version' | 'status' | 'title' | 'description' | 'kind' | 'procedureType' | 'publishedAt'
>;

export interface FormAssignmentRule {
  id?: number;
  assignedUserId?: number | null;
  assignedTeamId?: number | null;
  triggerId?: number | null;
  priority: number;
  active: boolean;
  conditions: Record<string, unknown>;
}

export interface FormInstance {
  id: number;
  templateVersionId: number;
  taskId: number | null;
  status: string;
}

export interface FormInstanceValue {
  fieldDefinitionId: number;
  value: unknown;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
