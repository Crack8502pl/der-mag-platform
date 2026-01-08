// src/services/brigade.service.ts
// Service for brigade management

import api from './api';
import type {
  Brigade,
  BrigadeMember,
  CreateBrigadeDto,
  UpdateBrigadeDto,
  AddMemberDto,
  UpdateMemberDto,
  BrigadeStats,
  BrigadeFilters,
} from '../types/brigade.types';

class BrigadeService {
  /**
   * Get all brigades with optional filters
   */
  async getAll(filters?: BrigadeFilters): Promise<{
    brigades: Brigade[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const response = await api.get('/brigades', { params: filters });
    return {
      brigades: response.data.data || [],
      total: response.data.pagination?.total || 0,
      page: response.data.pagination?.page || 1,
      limit: response.data.pagination?.limit || 20,
      totalPages: response.data.pagination?.totalPages || 0,
    };
  }

  /**
   * Get brigade by ID
   */
  async getById(id: number): Promise<Brigade> {
    const response = await api.get(`/brigades/${id}`);
    return response.data.data;
  }

  /**
   * Create new brigade
   */
  async create(data: CreateBrigadeDto): Promise<Brigade> {
    const response = await api.post('/brigades', data);
    return response.data.data;
  }

  /**
   * Update brigade
   */
  async update(id: number, data: UpdateBrigadeDto): Promise<Brigade> {
    const response = await api.put(`/brigades/${id}`, data);
    return response.data.data;
  }

  /**
   * Delete brigade
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/brigades/${id}`);
  }

  /**
   * Get brigade statistics
   */
  async getStatistics(id: number): Promise<BrigadeStats> {
    const response = await api.get(`/brigades/${id}/stats`);
    return response.data.data;
  }

  /**
   * Add member to brigade
   */
  async addMember(brigadeId: number, data: AddMemberDto): Promise<BrigadeMember> {
    const response = await api.post(`/brigades/${brigadeId}/members`, data);
    return response.data.data;
  }

  /**
   * Get brigade members
   */
  async getMembers(brigadeId: number, filters?: { active?: boolean }): Promise<BrigadeMember[]> {
    const response = await api.get(`/brigades/${brigadeId}/members`, { params: filters });
    return response.data.data || [];
  }

  /**
   * Update brigade member
   */
  async updateMember(
    brigadeId: number,
    memberId: number,
    data: UpdateMemberDto
  ): Promise<BrigadeMember> {
    const response = await api.put(`/brigades/${brigadeId}/members/${memberId}`, data);
    return response.data.data;
  }

  /**
   * Remove member from brigade
   */
  async removeMember(brigadeId: number, memberId: number): Promise<void> {
    await api.delete(`/brigades/${brigadeId}/members/${memberId}`);
  }
}

export default new BrigadeService();
