// src/services/networkTopology.service.ts
// Service for Network Topology CRUD operations

import { api } from './api';
import type {
  NetworkTopology,
  NetworkTopologyResponse,
  NetworkTopologyListResponse,
  NetworkTopologyHistoryResponse,
  CreateNetworkTopologyDto,
  UpdateNetworkTopologyDto,
} from '../types/networkTopology.types';

class NetworkTopologyService {
  /** Get the latest topology version for a contract/subsystem */
  async getLatest(contractId: number, subsystemIndex: number): Promise<NetworkTopology | null> {
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

  /** Get topology by ID */
  async getById(id: string): Promise<NetworkTopology | null> {
    try {
      const res = await api.get<NetworkTopologyResponse>(`/network-topologies/${id}`);
      return res.data.data;
    } catch (error: unknown) {
      if ((error as { response?: { status?: number } }).response?.status === 404) return null;
      throw error;
    }
  }

  /** Get all topologies for a contract (latest versions) */
  async getAllByContract(contractId: number): Promise<NetworkTopology[]> {
    const res = await api.get<NetworkTopologyListResponse>(`/network-topologies/contract/${contractId}`);
    return res.data.data;
  }

  /** Create a new topology (version=1) */
  async create(dto: CreateNetworkTopologyDto): Promise<NetworkTopology> {
    const res = await api.post<NetworkTopologyResponse>('/network-topologies', dto);
    return res.data.data;
  }

  /** Save a new version of an existing topology by its UUID (immutable — creates new record) */
  async save(id: string, dto: UpdateNetworkTopologyDto): Promise<NetworkTopology> {
    const res = await api.put<NetworkTopologyResponse>(
      `/network-topologies/${id}`,
      dto
    );
    return res.data.data;
  }

  /** Get version history with pagination */
  async getHistory(
    contractId: number,
    subsystemIndex: number,
    page = 1,
    limit = 20
  ): Promise<{ data: NetworkTopology[]; total: number; page: number; limit: number }> {
    const res = await api.get<NetworkTopologyHistoryResponse>(
      `/network-topologies/contract/${contractId}/subsystem/${subsystemIndex}/history`,
      { params: { page, limit } }
    );
    return res.data.data;
  }

  /** Soft-delete a topology by its UUID */
  async softDelete(id: string): Promise<void> {
    await api.delete(`/network-topologies/${id}`);
  }
}

export default new NetworkTopologyService();

