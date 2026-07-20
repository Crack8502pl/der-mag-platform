/**
 * Unit tests – BomSubsystemTemplateController.resolveWizardHierarchy
 *
 * Covers:
 * - POST with wizardRelationships (new contract, in-memory) → correct depth
 * - POST with taskNumber (extend) → uses DB traversal (mocked)
 * - Missing taskKey → 400 Bad Request
 * - Root task (LCS) → depth=0, isChildOfLcs=false
 * - Nastawnia under LCS → depth=1, isChildOfLcs=true
 * - Empty wizardRelationships → depth=0, standalone task
 */

import { Request, Response } from 'express';
import { BomSubsystemTemplateController } from '../../../src/controllers/BomSubsystemTemplateController';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock TaskRelationshipService to avoid DB access
jest.mock('../../../src/services/TaskRelationshipService', () => {
  return {
    TaskRelationshipService: jest.fn().mockImplementation(() => ({
      getParents: jest.fn().mockResolvedValue([]),
      getChildren: jest.fn().mockResolvedValue([]),
    })),
  };
});

// Mock AppDataSource
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

// Mock TaskRelationshipTraversalService to control traversal results
jest.mock(
  '../../../src/modules/variable-engine/providers/hierarchy/TaskRelationshipTraversalService',
  () => {
    return {
      TaskRelationshipTraversalService: jest.fn().mockImplementation(() => ({
        getAncestorPath: jest.fn().mockResolvedValue([]),
        getChildrenIds: jest.fn().mockResolvedValue([]),
        getParentId: jest.fn().mockResolvedValue(undefined),
      })),
    };
  }
);

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeMockRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnThis();
  return {
    json,
    status,
    // Minimal Response for controller
    res: { json, status } as unknown as Response,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BomSubsystemTemplateController.resolveWizardHierarchy', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── Input validation ──────────────────────────────────────────────────────────

  it('returns 400 when taskKey is missing', async () => {
    const req = { body: {} } as Request;
    const { res, status, json } = makeMockRes();

    await BomSubsystemTemplateController.resolveWizardHierarchy(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('returns 400 when taskKey is explicitly undefined', async () => {
    const req = { body: { taskKey: undefined } } as Request;
    const { res, status, json } = makeMockRes();

    await BomSubsystemTemplateController.resolveWizardHierarchy(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  // ── In-memory mode (new contract) ────────────────────────────────────────────

  it('returns depth=0 for a root LCS task with no parent in relationships', async () => {
    const req = {
      body: {
        taskKey: 'lcs-uuid-1',
        wizardRelationships: [
          { parentWizardId: 'lcs-uuid-1', parentType: 'LCS', childTaskKeys: ['nd-uuid-1'] },
        ],
      },
    } as Request;
    const { res, json } = makeMockRes();

    await BomSubsystemTemplateController.resolveWizardHierarchy(req, res);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          depth: 0,
          parentKey: null,
          isChildOfLcs: false,
        }),
      })
    );
  });

  it('returns depth=1 and isChildOfLcs=true for ND under LCS', async () => {
    const req = {
      body: {
        taskKey: 'nd-uuid-1',
        wizardRelationships: [
          { parentWizardId: 'lcs-uuid-1', parentType: 'LCS', childTaskKeys: ['nd-uuid-1'] },
        ],
      },
    } as Request;
    const { res, json } = makeMockRes();

    await BomSubsystemTemplateController.resolveWizardHierarchy(req, res);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          depth: 1,
          parentKey: 'lcs-uuid-1',
          isChildOfLcs: true,
          childrenCount: 0,
        }),
      })
    );
  });

  it('returns depth=2 for SKP under ND under LCS', async () => {
    const req = {
      body: {
        taskKey: 'skp-uuid-1',
        wizardRelationships: [
          { parentWizardId: 'lcs-uuid-1', parentType: 'LCS', childTaskKeys: ['nd-uuid-1'] },
          {
            parentWizardId: 'nd-uuid-1',
            parentType: 'NASTAWNIA',
            childTaskKeys: ['skp-uuid-1'],
          },
        ],
      },
    } as Request;
    const { res, json } = makeMockRes();

    await BomSubsystemTemplateController.resolveWizardHierarchy(req, res);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          depth: 2,
          isChildOfLcs: false,
        }),
      })
    );
  });

  it('returns depth=0 for a standalone task with no relationships', async () => {
    const req = {
      body: {
        taskKey: 'standalone-nd',
        wizardRelationships: [],
      },
    } as Request;
    const { res, json } = makeMockRes();

    await BomSubsystemTemplateController.resolveWizardHierarchy(req, res);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          depth: 0,
          parentKey: null,
          childrenCount: 0,
          isChildOfLcs: false,
        }),
      })
    );
  });

  it('treats empty string taskNumber as in-memory mode', async () => {
    const req = {
      body: {
        taskKey: 'nd-uuid-1',
        taskNumber: '',
        wizardRelationships: [
          { parentWizardId: 'lcs-uuid-1', parentType: 'LCS', childTaskKeys: ['nd-uuid-1'] },
        ],
      },
    } as Request;
    const { res, json } = makeMockRes();

    await BomSubsystemTemplateController.resolveWizardHierarchy(req, res);

    // Should use in-memory mode and return correct result
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ depth: 1 }),
      })
    );
  });

  // ── DB mode (extend contract) ─────────────────────────────────────────────────

  it('returns depth=0 defaults when task is not found in DB', async () => {
    // Mock AppDataSource.getRepository to return a repo that returns null for findOne
    const { AppDataSource } = require('../../../src/config/database');
    AppDataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    });

    const req = {
      body: {
        taskKey: 'Z-UNKNOWN',
        taskNumber: 'Z-UNKNOWN',
      },
    } as Request;
    const { res, json } = makeMockRes();

    await BomSubsystemTemplateController.resolveWizardHierarchy(req, res);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          depth: 0,
          parentKey: null,
          isChildOfLcs: false,
        }),
      })
    );
  });

  it('uses DB traversal when taskNumber is provided and returns depth from traversal mock', async () => {
    const { AppDataSource } = require('../../../src/config/database');
    const {
      TaskRelationshipTraversalService,
    } = require('../../../src/modules/variable-engine/providers/hierarchy/TaskRelationshipTraversalService');

    const mockTask = { id: 10, taskNumber: 'Z001' };
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue(mockTask),
      find: jest.fn().mockResolvedValue([
        { id: 1, taskNumber: 'Z000' },
        { id: 10, taskNumber: 'Z001' },
      ]),
    };
    AppDataSource.getRepository.mockReturnValue(mockRepo);

    // Override traversal mock to simulate ND under LCS: path=[1,10], depth=1
    TaskRelationshipTraversalService.mockImplementationOnce(() => ({
      getAncestorPath: jest.fn().mockResolvedValue([1, 10]),
      getChildrenIds: jest.fn().mockResolvedValue([]),
      getParentId: jest.fn().mockResolvedValue(1),
    }));

    // TaskRelationshipService mock returns parentType 'LCS'
    const { TaskRelationshipService } = require('../../../src/services/TaskRelationshipService');
    TaskRelationshipService.mockImplementationOnce(() => ({
      getParents: jest
        .fn()
        .mockResolvedValue([{ parentType: 'LCS', parentTaskId: 1 }]),
      getChildren: jest.fn().mockResolvedValue([]),
    }));

    const req = {
      body: {
        taskKey: 'Z001',
        taskNumber: 'Z001',
      },
    } as Request;
    const { res, json } = makeMockRes();

    await BomSubsystemTemplateController.resolveWizardHierarchy(req, res);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          depth: 1,
          isChildOfLcs: true,
        }),
      })
    );
  });
});
