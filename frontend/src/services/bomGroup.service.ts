// src/services/bomGroup.service.ts
// API client for BOM group operations

import api from './api';

export interface BomGroup {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBomGroupDto {
  name: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export interface UpdateBomGroupDto extends Partial<CreateBomGroupDto> {
  isActive?: boolean;
}

class BomGroupService {
  /**
   * Get all BOM groups
   */
  async getAll(includeInactive: boolean = false): Promise<BomGroup[]> {
    const response = await api.get<{ success: boolean; data: BomGroup[] }>(
      '/bom-groups',
      { params: { includeInactive } }
    );
    return response.data.data;
  }

  /**
   * Get a specific BOM group by ID
   */
  async getById(id: number): Promise<BomGroup> {
    const response = await api.get<{ success: boolean; data: BomGroup }>(
      `/bom-groups/${id}`
    );
    return response.data.data;
  }

  /**
   * Create a new BOM group
   */
  async create(data: CreateBomGroupDto): Promise<BomGroup> {
    const response = await api.post<{ success: boolean; data: BomGroup }>(
      '/bom-groups',
      data
    );
    return response.data.data;
  }

  /**
   * Update an existing BOM group
   */
  async update(id: number, data: UpdateBomGroupDto): Promise<BomGroup> {
    const response = await api.put<{ success: boolean; data: BomGroup }>(
      `/bom-groups/${id}`,
      data
    );
    return response.data.data;
  }

  /**
   * Delete a BOM group (soft delete)
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/bom-groups/${id}`);
  }
}

export default new BomGroupService();
