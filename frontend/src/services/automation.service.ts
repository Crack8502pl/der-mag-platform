// src/services/automation.service.ts
// Klient API automatyzacji (/api/automation/*): katalog klocków, łańcuchy, test na zadaniu, dziennik uruchomień.

import api from './api';
import type {
  AutomationActionDefinition,
  AutomationChain,
  AutomationChainInput,
  AutomationChainTarget,
  AutomationLookupOption,
  AutomationLookupType,
  AutomationOwnerType,
  AutomationRun,
} from '../types/automation.types';

interface ApiEnvelope<T> {
  data: T;
}

const unwrap = <T>(response: { data: ApiEnvelope<T> }): T => response.data.data;

export const automationService = {
  async listActions(): Promise<AutomationActionDefinition[]> {
    return unwrap(await api.get<ApiEnvelope<AutomationActionDefinition[]>>('/automation/actions'));
  },

  async listLookups(
    type: AutomationLookupType,
    options: { search?: string; value?: string | number } = {},
  ): Promise<AutomationLookupOption[]> {
    const params: Record<string, string> = { type };
    if (options.search?.trim()) params.search = options.search.trim();
    if (options.value !== undefined && options.value !== '') params.value = String(options.value);
    return unwrap(await api.get<ApiEnvelope<AutomationLookupOption[]>>('/automation/lookups', { params }));
  },

  async getChain(target: AutomationChainTarget): Promise<AutomationChain | null> {
    return unwrap(await api.get<ApiEnvelope<AutomationChain | null>>('/automation/chains', { params: target }));
  },

  async saveChain(target: AutomationChainTarget, input: AutomationChainInput): Promise<AutomationChain> {
    return unwrap(await api.put<ApiEnvelope<AutomationChain>>('/automation/chains', input, { params: target }));
  },

  async testChain(chainId: number, taskId: number): Promise<AutomationRun> {
    return unwrap(await api.post<ApiEnvelope<AutomationRun>>(`/automation/chains/${chainId}/test`, { taskId }));
  },

  async listRuns(
    owner: { ownerType: AutomationOwnerType; ownerId: number },
    options: { instanceId?: number; limit?: number } = {},
  ): Promise<AutomationRun[]> {
    return unwrap(await api.get<ApiEnvelope<AutomationRun[]>>('/automation/runs', { params: { ...owner, ...options } }));
  },
};

export default automationService;
