// src/services/BomGroupService.ts
// Service for managing BOM material groups

import { AppDataSource } from '../config/database';
import { BomGroup } from '../entities/BomGroup';

export interface CreateBomGroupDto {
  name: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export interface UpdateBomGroupDto extends Partial<CreateBomGroupDto> {
  isActive?: boolean;
}

export class BomGroupService {
  /**
   * Get all groups (optionally include inactive)
   */
  static async getAll(includeInactive: boolean = false): Promise<BomGroup[]> {
    const groupRepository = AppDataSource.getRepository(BomGroup);
    
    const queryBuilder = groupRepository
      .createQueryBuilder('group')
      .orderBy('group.sortOrder', 'ASC')
      .addOrderBy('group.name', 'ASC');

    if (!includeInactive) {
      queryBuilder.andWhere('group.isActive = :isActive', { isActive: true });
    }

    return await queryBuilder.getMany();
  }

  /**
   * Get a specific group by ID
   */
  static async getById(id: number): Promise<BomGroup | null> {
    const groupRepository = AppDataSource.getRepository(BomGroup);
    
    return await groupRepository.findOne({
      where: { id }
    });
  }

  /**
   * Create a new group
   */
  static async create(data: CreateBomGroupDto): Promise<BomGroup> {
    const groupRepository = AppDataSource.getRepository(BomGroup);
    
    const group = groupRepository.create({
      name: data.name,
      icon: data.icon || null,
      color: data.color || null,
      sortOrder: data.sortOrder || 0
    });

    return await groupRepository.save(group);
  }

  /**
   * Update an existing group
   */
  static async update(id: number, data: UpdateBomGroupDto): Promise<BomGroup> {
    const groupRepository = AppDataSource.getRepository(BomGroup);
    
    const group = await groupRepository.findOne({ where: { id } });
    if (!group) {
      throw new Error('Group not found');
    }

    if (data.name !== undefined) group.name = data.name;
    if (data.icon !== undefined) group.icon = data.icon || null;
    if (data.color !== undefined) group.color = data.color || null;
    if (data.sortOrder !== undefined) group.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) group.isActive = data.isActive;

    return await groupRepository.save(group);
  }

  /**
   * Delete a group (soft delete - set isActive to false)
   */
  static async delete(id: number): Promise<void> {
    const groupRepository = AppDataSource.getRepository(BomGroup);
    
    const group = await groupRepository.findOne({ where: { id } });
    if (!group) {
      throw new Error('Group not found');
    }

    group.isActive = false;
    await groupRepository.save(group);
  }
}
