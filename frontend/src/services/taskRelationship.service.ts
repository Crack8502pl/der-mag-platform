// src/services/taskRelationship.service.ts
// Service for task relationship management

import api from './api';

export interface TaskRelationshipSummary {
  parentTaskId: number;
  parentTaskNumber: string;
  parentType: string;
  children: Array<{
    childTaskId: number;
    childTaskNumber: string;
    childTaskType: string;
  }>;
}

export interface BulkFromWizardPayload {
  subsystemId: number;
  relationships: Array<{
    parentTaskNumber: string;
    childTaskNumbers: string[];
    parentType: string;
  }>;
}

class TaskRelationshipService {
  /**
   * Get all relationships for a subsystem
   */
  async getBySubsystem(subsystemId: number): Promise<TaskRelationshipSummary[]> {
    const response = await api.get(`/task-relationships/subsystem/${subsystemId}`);
    return response.data.data;
  }

  /**
   * Bulk create from wizard (using task numbers)
   */
  async bulkCreateFromWizard(payload: BulkFromWizardPayload): Promise<void> {
    await api.post('/task-relationships/bulk-from-wizard', payload);
  }
}

export default new TaskRelationshipService();
