// src/services/networkTopology.service.ts
// Service for Network Topology CRUD operations

import { api } from './api';
import type { NetworkTopologyData } from '../types/network-topology.types';

interface NetworkTopologyResponse {
  success: boolean;
  data: NetworkTopologyData;
}

interface NetworkTopologyListResponse {
  success: boolean;
  data: NetworkTopologyData[];
}

interface NetworkTopologyHistoryResponse {
  success: boolean;
  data: {
    data: NetworkTopologyData[];
    total: number;
    page: number;
    limit: number;
  };
}

class NetworkTopologyService {
  /** Create a new topology */
  async create(data: Partial<NetworkTopologyData>): Promise<NetworkTopologyData> {
    const res = await api.post<NetworkTopologyResponse>('/network-topologies', data);
    return res.data.data;
  }

  /** Get topology by ID */
  async getById(id: string): Promise<NetworkTopologyData> {
    const res = await api.get<NetworkTopologyResponse>(`/network-topologies/${id}`);
    return res.data.data;
  }

  /** Get the latest topology version for a contract/subsystem (returns null if not found) */
  async getByContractAndSubsystem(
    contractId: number,
    subsystemIndex: number
  ): Promise<NetworkTopologyData | null> {
    try {
      const res = await api.get<NetworkTopologyResponse>(
        `/network-topologies/contract/${contractId}/subsystem/${subsystemIndex}`
      );
      return res.data.data;
    } catch (error: unknown) {
      if ((error as { response?: { status?: number } }).response?.status === 404) return null;
      throw error;
    }
  }

  /** Get all topologies (latest version per contract/subsystem) */
  async getAll(): Promise<NetworkTopologyData[]> {
    const res = await api.get<NetworkTopologyListResponse>('/network-topologies');
    return res.data.data;
  }

  /** Get all topologies for a contract (latest versions) */
  async getAllByContract(contractId: number): Promise<NetworkTopologyData[]> {
    const res = await api.get<NetworkTopologyListResponse>(
      `/network-topologies/contract/${contractId}`
    );
    return res.data.data;
  }

  /** Update (save a new version of) an existing topology by its UUID */
  async update(id: string, data: Partial<NetworkTopologyData>): Promise<NetworkTopologyData> {
    const res = await api.put<NetworkTopologyResponse>(`/network-topologies/${id}`, data);
    return res.data.data;
  }

  /** Delete a topology by its UUID */
  async delete(id: string): Promise<void> {
    await api.delete(`/network-topologies/${id}`);
  }

  /** Get version history for a contract/subsystem */
  async getHistory(
    contractId: number,
    subsystemIndex: number
  ): Promise<NetworkTopologyData[]> {
    const res = await api.get<NetworkTopologyHistoryResponse>(
      `/network-topologies/contract/${contractId}/subsystem/${subsystemIndex}/history`
    );
    const paginatedResult = res.data.data;
    return paginatedResult.data;
  }
}

export default new NetworkTopologyService();

