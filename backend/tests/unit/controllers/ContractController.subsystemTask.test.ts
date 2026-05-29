import { Request, Response } from 'express';
import { ContractController } from '../../../src/controllers/ContractController';
import { ContractService } from '../../../src/services/ContractService';
import { SubsystemService } from '../../../src/services/SubsystemService';
import { SubsystemTaskService } from '../../../src/services/SubsystemTaskService';
import { TaskRelationshipService } from '../../../src/services/TaskRelationshipService';
import { AppDataSource } from '../../../src/config/database';
import { ContractStatus } from '../../../src/entities/Contract';

jest.mock('../../../src/services/ContractService');
jest.mock('../../../src/services/SubsystemService');
jest.mock('../../../src/services/SubsystemTaskService');
jest.mock('../../../src/services/TaskRelationshipService');
jest.mock('../../../src/services/BomSubsystemTemplateService', () => ({
  BomSubsystemTemplateService: {
    getTemplate: jest.fn().mockResolvedValue(null),
    applyTemplateToTask: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));
jest.mock('../../../src/utils/logger', () => ({
  serverLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ContractController - KOMPLETACJA_SZAF substatus update', () => {
  let controller: ContractController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let subsystemTaskRepo: any;
  let taskService: jest.Mocked<SubsystemTaskService>;

  beforeEach(() => {
    jest.clearAllMocks();

    (ContractService as jest.Mock).mockImplementation(() => ({
      createContract: jest.fn().mockResolvedValue({
        id: 1,
        contractNumber: 'R0000001_A',
        customName: 'Test',
        status: ContractStatus.CREATED,
        orderDate: new Date('2026-01-06'),
        managerCode: 'ABC',
        projectManagerId: 1,
      }),
    }));

    (SubsystemService as jest.Mock).mockImplementation(() => ({
      createSubsystem: jest.fn().mockResolvedValue({ id: 10, subsystemNumber: 'S001', ipPool: null }),
    }));

    let taskCounter = 0;
    (SubsystemTaskService as jest.Mock).mockImplementation(() => ({
      createTask: jest.fn().mockImplementation(async () => ({
        id: ++taskCounter,
        taskNumber: taskCounter === 1 ? 'Z00010126' : 'Z00010126_KOMPLETACJA_SZAF',
      })),
    }));

    (TaskRelationshipService as jest.Mock).mockImplementation(() => ({
      createRelation: jest.fn(),
    }));

    subsystemTaskRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (entity: any) => entity),
    };

    const taskTypeRepo = { findOne: jest.fn().mockResolvedValue({ id: 1 }) };
    const taskRepo = {
      create: jest.fn().mockImplementation((d: any) => d),
      save: jest.fn().mockImplementation(async (d: any) => ({ id: 123, ...d })),
    };

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      const name = typeof entity === 'function' ? entity.name : String(entity);
      if (name === 'TaskType') return taskTypeRepo;
      if (name === 'Task') return taskRepo;
      if (name === 'SubsystemTask') return subsystemTaskRepo;
      return { findOne: jest.fn(), save: jest.fn(), create: jest.fn() };
    });

    req = {
      body: {
        customName: 'Test',
        orderDate: '2026-01-06',
        managerCode: 'ABC',
        projectManagerId: 1,
        infrastructure: {
          perTask: {
            'SMOKIP_A-0': { cabinetType: 'SZAFA_TERENOWA', generateCabinetCompletion: true },
          },
        },
        subsystems: [
          {
            type: 'SMOKIP_A',
            params: {},
            tasks: [{ number: '001', name: 'SKP #1', type: 'SKP' }],
          },
        ],
      },
      user: { id: 1 } as any,
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    controller = new ContractController();
    taskService = (controller as any).taskService;
  });

  it('should update substatus using find+save pattern', async () => {
    subsystemTaskRepo.findOne.mockResolvedValue({ id: 99, taskNumber: 'Z00010126', substatus: null });

    await controller.createContractWithWizard(req as Request, res as Response);

    expect(taskService.createTask).toHaveBeenCalledTimes(2);
    expect(subsystemTaskRepo.findOne).toHaveBeenCalledWith({
      where: { taskNumber: 'Z00010126' },
    });
    expect(subsystemTaskRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        taskNumber: 'Z00010126',
        substatus: 'szafa_wygenerowana',
      })
    );
  });

  it('should not throw if subsystem task not found', async () => {
    subsystemTaskRepo.findOne.mockResolvedValue(null);

    await expect(controller.createContractWithWizard(req as Request, res as Response)).resolves.toBeUndefined();
    expect(subsystemTaskRepo.save).not.toHaveBeenCalled();
  });
});
