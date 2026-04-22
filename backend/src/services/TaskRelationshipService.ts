// src/services/TaskRelationshipService.ts
// Service for managing hierarchical task relationships

import { AppDataSource } from '../config/database';
import { TaskRelationship } from '../entities/TaskRelationship';
import { SubsystemTask } from '../entities/SubsystemTask';
import { In } from 'typeorm';

export class TaskRelationshipService {
  private get repo() {
    return AppDataSource.getRepository(TaskRelationship);
  }

  private get taskRepo() {
    return AppDataSource.getRepository(SubsystemTask);
  }

  /**
   * Create a single parent-child relationship
   */
  async create(data: {
    subsystemId: number;
    parentTaskId: number;
    childTaskId: number;
    parentType: string;
  }): Promise<TaskRelationship> {
    const relationship = this.repo.create(data);
    return await this.repo.save(relationship);
  }

  /**
   * Bulk create relationships for a subsystem (replaces all existing ones)
   */
  async bulkCreate(
    subsystemId: number,
    relationships: Array<{
      parentTaskId: number;
      childTaskId: number;
      parentType: string;
    }>
  ): Promise<TaskRelationship[]> {
    // Delete existing relationships for this subsystem
    await this.repo.delete({ subsystemId });

    if (relationships.length === 0) return [];

    const entities = relationships.map((r) =>
      this.repo.create({ subsystemId, ...r })
    );
    return await this.repo.save(entities);
  }

  /**
   * Get all relationships for a subsystem with task details
   */
  async getBySubsystem(subsystemId: number): Promise<{
    parentTaskId: number;
    parentTaskNumber: string;
    parentType: string;
    children: Array<{ childTaskId: number; childTaskNumber: string; childTaskType: string }>;
  }[]> {
    const relationships = await this.repo.find({
      where: { subsystemId },
      relations: ['parentTask', 'childTask'],
      order: { parentTaskId: 'ASC' },
    });

    // Group by parent
    const grouped = new Map<
      number,
      {
        parentTaskId: number;
        parentTaskNumber: string;
        parentType: string;
        children: Array<{ childTaskId: number; childTaskNumber: string; childTaskType: string }>;
      }
    >();

    for (const rel of relationships) {
      if (!grouped.has(rel.parentTaskId)) {
        grouped.set(rel.parentTaskId, {
          parentTaskId: rel.parentTaskId,
          parentTaskNumber: rel.parentTask?.taskNumber || '',
          parentType: rel.parentType,
          children: [],
        });
      }
      const group = grouped.get(rel.parentTaskId)!;
      group.children.push({
        childTaskId: rel.childTaskId,
        childTaskNumber: rel.childTask?.taskNumber || '',
        childTaskType: rel.childTask?.taskType || '',
      });
    }

    return Array.from(grouped.values());
  }

  /**
   * Get all children for a specific parent task
   */
  async getChildren(parentTaskId: number): Promise<TaskRelationship[]> {
    return await this.repo.find({
      where: { parentTaskId },
      relations: ['childTask'],
      order: { id: 'ASC' },
    });
  }

  /**
   * Delete all relationships for a given parent task
   */
  async deleteByParent(parentTaskId: number): Promise<void> {
    await this.repo.delete({ parentTaskId });
  }

  /**
   * Delete all relationships for a subsystem
   */
  async deleteBySubsystem(subsystemId: number): Promise<void> {
    await this.repo.delete({ subsystemId });
  }

  /**
   * Bulk create from wizard data:
   * Maps wizard task keys (subsystemTaskNumbers) to DB ids and saves relationships.
   */
  async createFromWizard(
    subsystemId: number,
    wizardRelationships: Array<{
      parentTaskNumber: string;
      childTaskNumbers: string[];
      parentType: string;
    }>
  ): Promise<TaskRelationship[]> {
    if (wizardRelationships.length === 0) {
      await this.repo.delete({ subsystemId });
      return [];
    }

    // Gather all task numbers
    const allNumbers = new Set<string>();
    for (const wr of wizardRelationships) {
      allNumbers.add(wr.parentTaskNumber);
      wr.childTaskNumbers.forEach((n) => allNumbers.add(n));
    }

    const tasks = await this.taskRepo.find({
      where: { taskNumber: In([...allNumbers]) },
      select: ['id', 'taskNumber'],
    });

    const taskMap = new Map(tasks.map((t) => [t.taskNumber, t.id]));

    const relationships: Array<{
      parentTaskId: number;
      childTaskId: number;
      parentType: string;
    }> = [];

    for (const wr of wizardRelationships) {
      const parentId = taskMap.get(wr.parentTaskNumber);
      if (!parentId) continue;
      for (const childNum of wr.childTaskNumbers) {
        const childId = taskMap.get(childNum);
        if (!childId) continue;
        relationships.push({ parentTaskId: parentId, childTaskId: childId, parentType: wr.parentType });
      }
    }

    return await this.bulkCreate(subsystemId, relationships);
  }
}

export default new TaskRelationshipService();
