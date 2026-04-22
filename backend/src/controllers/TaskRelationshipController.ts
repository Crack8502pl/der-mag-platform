// src/controllers/TaskRelationshipController.ts
// REST API controller for task relationship management

import { Request, Response } from 'express';
import taskRelationshipService from '../services/TaskRelationshipService';

export class TaskRelationshipController {
  /**
   * POST /api/task-relationships
   * Create a single relationship
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { subsystemId, parentTaskId, childTaskId, parentType } = req.body;
      if (!subsystemId || !parentTaskId || !childTaskId || !parentType) {
        res.status(400).json({ success: false, message: 'Brak wymaganych pól' });
        return;
      }
      const relationship = await taskRelationshipService.create({
        subsystemId: Number(subsystemId),
        parentTaskId: Number(parentTaskId),
        childTaskId: Number(childTaskId),
        parentType: String(parentType),
      });
      res.status(201).json({ success: true, data: relationship });
    } catch (error: any) {
      console.error('Error creating task relationship:', error);
      res.status(500).json({ success: false, message: error.message || 'Błąd serwera' });
    }
  }

  /**
   * GET /api/task-relationships/subsystem/:subsystemId
   * Get summary of all relationships for a subsystem
   */
  async getBySubsystem(req: Request, res: Response): Promise<void> {
    try {
      const subsystemId = Number(req.params.subsystemId);
      if (isNaN(subsystemId)) {
        res.status(400).json({ success: false, message: 'Nieprawidłowe ID podsystemu' });
        return;
      }
      const data = await taskRelationshipService.getBySubsystem(subsystemId);
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error getting relationships by subsystem:', error);
      res.status(500).json({ success: false, message: error.message || 'Błąd serwera' });
    }
  }

  /**
   * GET /api/task-relationships/children/:parentTaskId
   * Get all children for a parent task
   */
  async getChildren(req: Request, res: Response): Promise<void> {
    try {
      const parentTaskId = Number(req.params.parentTaskId);
      if (isNaN(parentTaskId)) {
        res.status(400).json({ success: false, message: 'Nieprawidłowe ID zadania' });
        return;
      }
      const children = await taskRelationshipService.getChildren(parentTaskId);
      res.json({ success: true, data: children });
    } catch (error: any) {
      console.error('Error getting children:', error);
      res.status(500).json({ success: false, message: error.message || 'Błąd serwera' });
    }
  }

  /**
   * POST /api/task-relationships/bulk
   * Bulk create relationships from wizard (replaces existing for subsystem)
   * Body: { subsystemId, relationships: [{ parentTaskId, childTaskId, parentType }] }
   */
  async bulkCreate(req: Request, res: Response): Promise<void> {
    try {
      const { subsystemId, relationships } = req.body;
      if (!subsystemId || !Array.isArray(relationships)) {
        res.status(400).json({ success: false, message: 'Brak wymaganych pól (subsystemId, relationships[])' });
        return;
      }
      const created = await taskRelationshipService.bulkCreate(Number(subsystemId), relationships);
      res.status(201).json({ success: true, data: created, count: created.length });
    } catch (error: any) {
      console.error('Error bulk creating relationships:', error);
      res.status(500).json({ success: false, message: error.message || 'Błąd serwera' });
    }
  }

  /**
   * POST /api/task-relationships/bulk-from-wizard
   * Bulk create relationships using task numbers (wizard submits task numbers, not IDs)
   * Body: { subsystemId, relationships: [{ parentTaskNumber, childTaskNumbers, parentType }] }
   */
  async bulkCreateFromWizard(req: Request, res: Response): Promise<void> {
    try {
      const { subsystemId, relationships } = req.body;
      if (!subsystemId || !Array.isArray(relationships)) {
        res.status(400).json({ success: false, message: 'Brak wymaganych pól (subsystemId, relationships[])' });
        return;
      }
      const created = await taskRelationshipService.createFromWizard(Number(subsystemId), relationships);
      res.status(201).json({ success: true, data: created, count: created.length });
    } catch (error: any) {
      console.error('Error bulk creating relationships from wizard:', error);
      res.status(500).json({ success: false, message: error.message || 'Błąd serwera' });
    }
  }

  /**
   * DELETE /api/task-relationships/parent/:parentTaskId
   * Delete all relationships where this task is the parent
   */
  async deleteByParent(req: Request, res: Response): Promise<void> {
    try {
      const parentTaskId = Number(req.params.parentTaskId);
      if (isNaN(parentTaskId)) {
        res.status(400).json({ success: false, message: 'Nieprawidłowe ID zadania' });
        return;
      }
      await taskRelationshipService.deleteByParent(parentTaskId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting relationships by parent:', error);
      res.status(500).json({ success: false, message: error.message || 'Błąd serwera' });
    }
  }
}

export default new TaskRelationshipController();
