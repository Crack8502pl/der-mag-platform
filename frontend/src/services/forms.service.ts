import api from './api';
import type {
  FormAssignmentRule,
  FormKind,
  FormProcedureType,
  FormTemplate,
  FormVersion,
  FormVersionSummary,
  Paginated,
} from '../types/forms.types';

interface ApiEnvelope<T> {
  data: T;
}

export interface CreateFormTemplateInput {
  key: string;
  name: string;
  description?: string;
  kind: FormKind;
  procedureType: FormProcedureType;
}

export interface UpdateFormDraftInput {
  title: string;
  description?: string;
  settings: Record<string, unknown>;
  sections: Array<{
    key: string;
    title: string;
    description?: string;
    sortOrder: number;
    conditions: Record<string, unknown>;
    fields: Array<{
      key: string;
      label: string;
      fieldType: string;
      required: boolean;
      sortOrder: number;
      validation: Record<string, unknown>;
      options: Record<string, unknown>;
      conditions: Record<string, unknown>;
    }>;
  }>;
}

const unwrap = <T>(response: { data: ApiEnvelope<T> }): T => response.data.data;

export const formsService = {
  async listTemplates(page = 1, limit = 100): Promise<Paginated<FormTemplate>> {
    return unwrap(await api.get<ApiEnvelope<Paginated<FormTemplate>>>('/forms/templates', { params: { page, limit } }));
  },

  async createTemplate(input: CreateFormTemplateInput): Promise<FormTemplate> {
    return unwrap(await api.post<ApiEnvelope<FormTemplate>>('/forms/templates', input));
  },

  async listVersions(templateId: number): Promise<Paginated<FormVersionSummary>> {
    return unwrap(await api.get<ApiEnvelope<Paginated<FormVersionSummary>>>(`/forms/templates/${templateId}/versions`));
  },

  async createDraft(templateId: number): Promise<FormVersion> {
    return unwrap(await api.post<ApiEnvelope<FormVersion>>(`/forms/templates/${templateId}/draft`, {}));
  },

  async getVersion(versionId: number): Promise<FormVersion> {
    return unwrap(await api.get<ApiEnvelope<FormVersion>>(`/forms/versions/${versionId}`));
  },

  async updateDraft(versionId: number, input: UpdateFormDraftInput): Promise<FormVersion> {
    return unwrap(await api.put<ApiEnvelope<FormVersion>>(`/forms/versions/${versionId}/draft`, input));
  },

  async publishVersion(versionId: number): Promise<FormVersion> {
    return unwrap(await api.post<ApiEnvelope<FormVersion>>(`/forms/versions/${versionId}/publish`, {}));
  },

  async createNextVersion(versionId: number): Promise<FormVersion> {
    return unwrap(await api.post<ApiEnvelope<FormVersion>>(`/forms/versions/${versionId}/next`, {}));
  },

  async listAssignmentRules(versionId: number): Promise<FormAssignmentRule[]> {
    return unwrap(await api.get<ApiEnvelope<FormAssignmentRule[]>>(`/forms/versions/${versionId}/assignment-rules`));
  },

  async replaceAssignmentRules(versionId: number, rules: FormAssignmentRule[]): Promise<FormAssignmentRule[]> {
    return unwrap(await api.put<ApiEnvelope<FormAssignmentRule[]>>(`/forms/versions/${versionId}/assignment-rules`, { rules }));
  },
};
