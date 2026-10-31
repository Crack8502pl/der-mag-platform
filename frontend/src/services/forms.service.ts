import api from './api';
import type {
  FormAssignmentRule,
  FormBranding,
  FormBrandingKind,
  FormBrandingMode,
  FormKind,
  FormInstance,
  FormInstanceValue,
  FormProcedureType,
  FormTemplate,
  FormTeamOption,
  FormUserOption,
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
  headerId?: number | null;
  footerId?: number | null;
}

export interface FormBrandingInput {
  name: string;
  kind: FormBrandingKind;
  mode: FormBrandingMode;
  heightMm: number;
  isDefault: boolean;
  layout?: FormBranding['layout'];
}

const unwrap = <T>(response: { data: ApiEnvelope<T> }): T => response.data.data;

const brandingFormData = (input: FormBrandingInput, file?: File): FormData => {
  const data = new FormData();
  data.append('name', input.name);
  data.append('kind', input.kind);
  data.append('mode', input.mode);
  data.append('heightMm', String(input.heightMm));
  data.append('isDefault', String(input.isDefault));
  if (input.layout) data.append('layout', JSON.stringify(input.layout));
  if (file) data.append('file', file);
  return data;
};

export const formsService = {
  async listBranding(): Promise<FormBranding[]> {
    return unwrap(await api.get<ApiEnvelope<FormBranding[]>>('/forms/branding'));
  },

  async createBranding(input: FormBrandingInput, file?: File): Promise<FormBranding> {
    const body = input.mode === 'FILE' ? brandingFormData(input, file) : input;
    return unwrap(await api.post<ApiEnvelope<FormBranding>>('/forms/branding', body));
  },

  async updateBranding(id: number, input: FormBrandingInput, file?: File): Promise<FormBranding> {
    const body = input.mode === 'FILE' ? brandingFormData(input, file) : input;
    return unwrap(await api.put<ApiEnvelope<FormBranding>>(`/forms/branding/${id}`, body));
  },

  async deleteBranding(id: number): Promise<void> {
    await api.delete(`/forms/branding/${id}`);
  },

  async uploadBrandingLogo(file: File): Promise<{ assetPath: string; fileMime: string; fileName: string }> {
    const body = new FormData();
    body.append('file', file);
    return unwrap(await api.post<ApiEnvelope<{ assetPath: string; fileMime: string; fileName: string }>>('/forms/branding/logos', body));
  },

  async getBrandingFile(id: number): Promise<Blob> {
    const response = await api.get<Blob>(`/forms/branding/${id}/file`, { responseType: 'blob' });
    return response.data;
  },

  async getBrandingSnapshotFile(filePath: string): Promise<Blob> {
    const fileName = filePath.split('/').pop() || '';
    const response = await api.get<Blob>(`/forms/branding/files/${encodeURIComponent(fileName)}`, { responseType: 'blob' });
    return response.data;
  },

  async getBrandingLogo(fileName: string): Promise<Blob> {
    const response = await api.get<Blob>(`/forms/branding/logos/${encodeURIComponent(fileName)}`, { responseType: 'blob' });
    return response.data;
  },

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

  async previewVersion(versionId: number, taskId: number): Promise<Record<string, unknown>> {
    return unwrap(await api.post<ApiEnvelope<Record<string, unknown>>>(`/forms/versions/${versionId}/preview`, { taskId }));
  },

  async createInstance(input: {
    templateVersionId: number;
    taskId?: number;
    contractId?: number;
    assignedUserId?: number;
    assignedTeamId?: number;
  }): Promise<FormInstance> {
    return unwrap(await api.post<ApiEnvelope<FormInstance>>('/forms/instances', input));
  },

  async getInstanceValues(instanceId: number, version: FormVersion): Promise<Record<string, unknown>> {
    const instance = unwrap(await api.get<ApiEnvelope<FormInstance>>(`/forms/instances/${instanceId}`));
    if (instance.templateVersionId !== version.id) {
      throw new Error('Instance version does not match the requested form version');
    }
    const rows = unwrap(await api.get<ApiEnvelope<FormInstanceValue[]>>(`/forms/instances/${instanceId}/values`));
    const keyById = new Map(version.fields.map(field => [field.id, field.key]));
    return Object.fromEntries(rows.flatMap(row => {
      const key = keyById.get(row.fieldDefinitionId);
      return key ? [[key, row.value]] : [];
    }));
  },

  async saveInstanceValues(instanceId: number, responses: Record<string, unknown>): Promise<FormInstanceValue[]> {
    return unwrap(await api.put<ApiEnvelope<FormInstanceValue[]>>(`/forms/instances/${instanceId}/values`, { responses }));
  },

  async refreshInstanceData(instanceId: number): Promise<void> {
    await api.post(`/forms/instances/${instanceId}/refresh-data`, {});
  },

  async getInstancePdf(instanceId: number): Promise<Blob> {
    const response = await api.get<Blob>(`/forms/instances/${instanceId}/pdf`, { responseType: 'blob' });
    return response.data;
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

  async listAssignmentUsers(search = ''): Promise<FormUserOption[]> {
    const response = await api.get<ApiEnvelope<{ users: FormUserOption[] }>>('/users', {
      params: { status: 'active', limit: 100, search: search || undefined },
    });
    return response.data.data.users;
  },

  async listAssignmentTeams(): Promise<FormTeamOption[]> {
    const response = await api.get<ApiEnvelope<FormTeamOption[]>>('/brigades', {
      params: { active: true, limit: 100 },
    });
    return response.data.data;
  },

  async replaceAssignmentRules(versionId: number, rules: FormAssignmentRule[]): Promise<FormAssignmentRule[]> {
    return unwrap(await api.put<ApiEnvelope<FormAssignmentRule[]>>(`/forms/versions/${versionId}/assignment-rules`, { rules }));
  },
};
