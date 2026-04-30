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
        `/contracts/${contractId}/subsystems/${subsystemIndex}/topology`
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
      const res = await api.get<NetworkTopologyResponse>(`/topologies/${id}`);
      return res.data.data;
    } catch (error: unknown) {
      if ((error as { response?: { status?: number } }).response?.status === 404) return null;
      throw error;
    }
  }

  /** Get all topologies for a contract (latest versions) */
  async getAllByContract(contractId: number): Promise<NetworkTopology[]> {
    const res = await api.get<NetworkTopologyListResponse>(`/contracts/${contractId}/topologies`);
    return res.data.data;
  }

  /** Create a new topology (version=1) */
  async create(dto: CreateNetworkTopologyDto): Promise<NetworkTopology> {
    const res = await api.post<NetworkTopologyResponse>('/topologies', dto);
    return res.data.data;
  }

  /** Save a new version of an existing topology (immutable — creates new record) */
  async save(contractId: number, subsystemIndex: number, dto: UpdateNetworkTopologyDto): Promise<NetworkTopology> {
    const res = await api.put<NetworkTopologyResponse>(
      `/contracts/${contractId}/subsystems/${subsystemIndex}/topology`,
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
      `/contracts/${contractId}/subsystems/${subsystemIndex}/topology/history`,
      { params: { page, limit } }
    );
    return res.data.data;
  }

  /** Soft-delete the latest topology version */
  async delete(contractId: number, subsystemIndex: number): Promise<void> {
    await api.delete(`/contracts/${contractId}/subsystems/${subsystemIndex}/topology`);
  }
}

export default new NetworkTopologyService();
