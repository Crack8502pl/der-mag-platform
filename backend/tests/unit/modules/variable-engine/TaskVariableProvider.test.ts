/**
 * Unit tests – TaskVariableProvider (PR-6)
 *
 * Covers:
 * - task.number
 * - task.status
 * - task.title
 * - task.priority
 * - task.assignee.name
 * - task.due.date
 * - task.progress
 * - soft-fail on unknown fields
 * - soft-fail when entityId is missing or non-numeric
 * - soft-fail when data service returns undefined
 * - edge cases: entityId = 0, string numeric entityId
 */

import { TaskVariableProvider } from '../../../../src/modules/variable-engine/providers/task/TaskVariableProvider';
import type { ITaskDataService, TaskData } from '../../../../src/modules/variable-engine/providers/task/ITaskDataService';
import type { VariableContext } from '../../../../src/modules/variable-engine/contracts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_DATA: TaskData = {
  number: 'TSK-2024-042',
  status: 'in_progress',
  title: 'Install fiber backbone',
  priority: 'high',
  assigneeName: 'Jan Kowalski',
  dueDate: '2024-06-30',
  progress: 65,
};

function makeService(data: TaskData = DEFAULT_DATA): ITaskDataService {
  return {
    getTaskData: jest.fn().mockResolvedValue(data),
  };
}

function makeServiceReturningNoData(): ITaskDataService {
  return {
    getTaskData: jest.fn().mockResolvedValue(undefined),
  };
}

function ctx(entityId: number | string | undefined, entityType = 'task'): VariableContext {
  return { entityId, entityType };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TaskVariableProvider', () => {
  // ── Contract ─────────────────────────────────────────────────────────────────

  it('declares the "task" namespace', () => {
    const provider = new TaskVariableProvider(makeService());
    expect(provider.namespaces).toContain('task');
  });

  // ── task.number ───────────────────────────────────────────────────────────────

  describe('task.number', () => {
    it('returns task number', async () => {
      const provider = new TaskVariableProvider(makeService());
      expect(await provider.resolve('task.number', ctx(1))).toBe('TSK-2024-042');
    });

    it('passes entityId and entityType to the service', async () => {
      const service = makeService();
      const provider = new TaskVariableProvider(service);
      await provider.resolve('task.number', ctx(10, 'task'));
      expect(service.getTaskData).toHaveBeenCalledWith(10, 'task');
    });

    it('accepts a string numeric entityId', async () => {
      const service = makeService();
      const provider = new TaskVariableProvider(service);
      expect(await provider.resolve('task.number', ctx('42'))).toBe('TSK-2024-042');
      expect(service.getTaskData).toHaveBeenCalledWith(42, 'task');
    });
  });

  // ── task.status ───────────────────────────────────────────────────────────────

  describe('task.status', () => {
    it('returns task status', async () => {
      const provider = new TaskVariableProvider(makeService());
      expect(await provider.resolve('task.status', ctx(1))).toBe('in_progress');
    });
  });

  // ── task.title ────────────────────────────────────────────────────────────────

  describe('task.title', () => {
    it('returns task title', async () => {
      const provider = new TaskVariableProvider(makeService());
      expect(await provider.resolve('task.title', ctx(1))).toBe('Install fiber backbone');
    });
  });

  // ── task.priority ─────────────────────────────────────────────────────────────

  describe('task.priority', () => {
    it('returns task priority', async () => {
      const provider = new TaskVariableProvider(makeService());
      expect(await provider.resolve('task.priority', ctx(1))).toBe('high');
    });
  });

  // ── task.assignee.name ────────────────────────────────────────────────────────

  describe('task.assignee.name', () => {
    it('returns assignee full name', async () => {
      const provider = new TaskVariableProvider(makeService());
      expect(await provider.resolve('task.assignee.name', ctx(1))).toBe('Jan Kowalski');
    });
  });

  // ── task.due.date ─────────────────────────────────────────────────────────────

  describe('task.due.date', () => {
    it('returns due date', async () => {
      const provider = new TaskVariableProvider(makeService());
      expect(await provider.resolve('task.due.date', ctx(1))).toBe('2024-06-30');
    });
  });

  // ── task.progress ─────────────────────────────────────────────────────────────

  describe('task.progress', () => {
    it('returns progress percentage', async () => {
      const provider = new TaskVariableProvider(makeService());
      expect(await provider.resolve('task.progress', ctx(1))).toBe(65);
    });
  });

  // ── Soft-fail cases ───────────────────────────────────────────────────────────

  describe('soft-fail', () => {
    it('returns undefined for an unknown field', async () => {
      const provider = new TaskVariableProvider(makeService());
      expect(await provider.resolve('task.unknown', ctx(1))).toBeUndefined();
    });

    it('returns undefined for a partial field match', async () => {
      const provider = new TaskVariableProvider(makeService());
      expect(await provider.resolve('task.assignee', ctx(1))).toBeUndefined();
    });

    it('returns undefined when entityId is missing', async () => {
      const provider = new TaskVariableProvider(makeService());
      expect(await provider.resolve('task.number', ctx(undefined))).toBeUndefined();
    });

    it('returns undefined when entityId is a non-numeric string', async () => {
      const provider = new TaskVariableProvider(makeService());
      expect(await provider.resolve('task.number', ctx('no-id'))).toBeUndefined();
    });

    it('returns undefined when the data service returns undefined', async () => {
      const provider = new TaskVariableProvider(makeServiceReturningNoData());
      expect(await provider.resolve('task.number', ctx(1))).toBeUndefined();
    });

    it('returns undefined for an expression with no field segment', async () => {
      const provider = new TaskVariableProvider(makeService());
      expect(await provider.resolve('task', ctx(1))).toBeUndefined();
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles entityId = 0', async () => {
      const service = makeService();
      const provider = new TaskVariableProvider(service);
      await provider.resolve('task.number', ctx(0));
      expect(service.getTaskData).toHaveBeenCalledWith(0, 'task');
    });

    it('uses empty string as entityType when not provided in context', async () => {
      const service = makeService();
      const provider = new TaskVariableProvider(service);
      await provider.resolve('task.status', { entityId: 1 });
      expect(service.getTaskData).toHaveBeenCalledWith(1, '');
    });

    it('service is called only once per resolve call', async () => {
      const service = makeService();
      const provider = new TaskVariableProvider(service);
      await provider.resolve('task.progress', ctx(1));
      expect(service.getTaskData).toHaveBeenCalledTimes(1);
    });
  });
});
