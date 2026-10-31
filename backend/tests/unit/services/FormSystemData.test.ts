import { FormFieldDefinition } from '../../../src/entities/FormFieldDefinition';
import { FormFieldValue } from '../../../src/entities/FormFieldValue';
import { FormInstance } from '../../../src/entities/FormInstance';
import { FormSection } from '../../../src/entities/FormSection';
import { FormTemplateVersion } from '../../../src/entities/FormTemplateVersion';
import { FormInstanceStatus, FormVersionStatus } from '../../../src/entities/FormTypes';
import { Task } from '../../../src/entities/Task';
import { TaskMaterial } from '../../../src/entities/TaskMaterial';
import { FormInstanceService } from '../../../src/services/FormInstanceService';

jest.mock('../../../src/config/database', () => ({ AppDataSource: {} }));

const section = { id: 2, templateVersionId: 7, key: 'main', conditions: {} } as FormSection;
const dataField = {
  id: 11,
  templateVersionId: 7,
  sectionId: 2,
  key: 'taskNumber',
  label: 'Numer zadania',
  fieldType: 'DATA',
  required: false,
  validation: {},
  options: { source: 'task.number', mode: 'readonly', valueType: 'string' },
  conditions: {},
} as unknown as FormFieldDefinition;
const bomField = {
  id: 12,
  templateVersionId: 7,
  sectionId: 2,
  key: 'materials',
  label: 'Materiały',
  fieldType: 'BOM_TABLE',
  required: false,
  validation: {},
  options: { columns: ['plannedQty', 'installedQty', 'installed', 'note'] },
  conditions: {},
} as unknown as FormFieldDefinition;
const taskRecord = {
  id: 8,
  taskNumber: 'TSK-0008',
  status: 'in_progress',
  title: 'Montaż',
  priority: 2,
  plannedEndDate: null,
  completedAt: null,
  location: 'Warszawa',
  taskType: { name: 'Instalacja' },
  contract: null,
  subsystem: null,
  brigade: null,
  assignments: [],
  metrics: [],
};

describe('Form system data snapshots', () => {
  it('stores typed source values when creating an instance linked to a task', async () => {
    const storedValues: any[] = [];
    const versionRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 7, status: FormVersionStatus.PUBLISHED }),
    };
    const sectionRepository = { find: jest.fn().mockResolvedValue([section]) };
    const fieldRepository = { find: jest.fn().mockResolvedValue([dataField]) };
    const instanceRepository = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (value: any) => ({ id: 44, ...value })),
    };
    const valueRepository = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (values: any[]) => {
        storedValues.push(...values);
        return values;
      }),
    };
    const taskRepository = { findOne: jest.fn().mockResolvedValue(taskRecord) };
    const repositories = new Map<unknown, any>([
      [FormTemplateVersion, versionRepository],
      [FormSection, sectionRepository],
      [FormFieldDefinition, fieldRepository],
      [FormInstance, instanceRepository],
      [FormFieldValue, valueRepository],
      [Task, taskRepository],
    ]);
    const manager = {
      getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
      query: jest.fn().mockResolvedValue(undefined),
    };
    const dataSource = { transaction: jest.fn(callback => callback(manager)) };

    await expect(new FormInstanceService(dataSource as any).createInstance({
      templateVersionId: 7,
      taskId: 8,
    }, 3)).resolves.toMatchObject({ id: 44, taskId: 8, status: FormInstanceStatus.DRAFT });
    expect(storedValues).toEqual([expect.objectContaining({
      instanceId: 44,
      fieldDefinitionId: 11,
      value: 'TSK-0008',
      updatedById: 3,
    })]);
  });

  it('rejects client changes to readonly values before writing any response', async () => {
    const instance = {
      id: 44, templateVersionId: 7, taskId: 8, status: FormInstanceStatus.DRAFT,
    } as FormInstance;
    const instanceRepository = {
      findOne: jest.fn().mockResolvedValue(instance),
      save: jest.fn(),
    };
    const valueRepository = {
      find: jest.fn().mockResolvedValue([{
        id: 13, instanceId: 44, fieldDefinitionId: 11, value: 'TSK-0008',
      }]),
      create: jest.fn(value => value),
      save: jest.fn(),
    };
    const repositories = new Map<unknown, any>([
      [FormInstance, instanceRepository],
      [FormSection, { find: jest.fn().mockResolvedValue([section]) }],
      [FormFieldDefinition, { find: jest.fn().mockResolvedValue([dataField]) }],
      [FormFieldValue, valueRepository],
    ]);
    const manager = { getRepository: jest.fn((entity: unknown) => repositories.get(entity)) };
    const dataSource = { transaction: jest.fn(callback => callback(manager)) };

    await expect(new FormInstanceService(dataSource as any).saveResponses(44, {
      taskNumber: 'forged value',
    }, 3)).rejects.toMatchObject({ code: 'INVALID_RESPONSES' });
    expect(valueRepository.save).not.toHaveBeenCalled();
    expect(instanceRepository.save).not.toHaveBeenCalled();
  });

  it('refreshes readonly values and audits changed snapshots', async () => {
    const instance = {
      id: 44,
      templateVersionId: 7,
      taskId: 8,
      status: FormInstanceStatus.DRAFT,
    } as FormInstance;
    const valueRepository = {
      find: jest.fn().mockResolvedValue([{
        id: 13, instanceId: 44, fieldDefinitionId: 11, value: 'TSK-OLD',
      }]),
      create: jest.fn(value => value),
      save: jest.fn(async values => values),
    };
    const taskRepository = { findOne: jest.fn().mockResolvedValue(taskRecord) };
    const repositories = new Map<unknown, any>([
      [FormInstance, { findOne: jest.fn().mockResolvedValue(instance) }],
      [FormSection, { find: jest.fn().mockResolvedValue([section]) }],
      [FormFieldDefinition, { find: jest.fn().mockResolvedValue([dataField]) }],
      [FormFieldValue, valueRepository],
      [Task, taskRepository],
    ]);
    const manager = {
      getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
      query: jest.fn().mockResolvedValue(undefined),
    };
    const dataSource = { transaction: jest.fn(callback => callback(manager)) };

    await expect(new FormInstanceService(dataSource as any).refreshData(44, 3)).resolves.toEqual([
      expect.objectContaining({ value: 'TSK-0008', updatedById: 3 }),
    ]);
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_logs'),
      expect.arrayContaining(['FORM_DATA_SNAPSHOT_REFRESHED', 3, expect.stringContaining('"field":"taskNumber"')]),
    );
  });

  it('creates a single-query BOM snapshot with mutable installation answers', async () => {
    const savedValues: any[] = [];
    const materials = [
      { id: 31, materialName: 'Kamera', unit: 'szt.', plannedQuantity: '2.00', category: 'Urządzenia' },
      { id: 32, materialName: 'Switch', unit: 'szt.', plannedQuantity: 1, category: 'Urządzenia' },
      { id: 33, materialName: 'Przewód', unit: 'm', plannedQuantity: '12.50', category: 'Okablowanie' },
    ];
    const materialRepository = { find: jest.fn().mockResolvedValue(materials) };
    const instanceRepository = {
      create: jest.fn(value => value),
      save: jest.fn(async value => ({ id: 45, ...value })),
    };
    const valueRepository = {
      create: jest.fn(value => value),
      save: jest.fn(async values => {
        savedValues.push(...values);
        return values;
      }),
    };
    const repositories = new Map<unknown, any>([
      [FormTemplateVersion, { findOne: jest.fn().mockResolvedValue({ id: 7, status: FormVersionStatus.PUBLISHED }) }],
      [FormSection, { find: jest.fn().mockResolvedValue([section]) }],
      [FormFieldDefinition, { find: jest.fn().mockResolvedValue([
        bomField,
        { ...bomField, id: 13, key: 'devices', options: { ...bomField.options, filter: 'Urządzenia' } },
      ]) }],
      [FormInstance, instanceRepository],
      [FormFieldValue, valueRepository],
      [TaskMaterial, materialRepository],
    ]);
    const manager = {
      getRepository: jest.fn(entity => repositories.get(entity)),
      query: jest.fn().mockResolvedValue(undefined),
    };
    const dataSource = { transaction: jest.fn(callback => callback(manager)) };

    await expect(new FormInstanceService(dataSource as any).createInstance({
      templateVersionId: 7,
      taskId: 8,
    }, 3)).resolves.toMatchObject({ id: 45 });
    expect(materialRepository.find).toHaveBeenCalledTimes(1);
    expect(materialRepository.find).toHaveBeenCalledWith({
      where: { taskId: 8 },
      order: { id: 'ASC' },
    });
    expect(savedValues).toEqual([
      expect.objectContaining({
        fieldDefinitionId: 12,
        value: [
          { bomItemId: 31, name: 'Kamera', unit: 'szt.', plannedQty: 2, installedQty: null, installed: false, note: '' },
          { bomItemId: 32, name: 'Switch', unit: 'szt.', plannedQty: 1, installedQty: null, installed: false, note: '' },
          { bomItemId: 33, name: 'Przewód', unit: 'm', plannedQty: 12.5, installedQty: null, installed: false, note: '' },
        ],
      }),
      expect.objectContaining({
        fieldDefinitionId: 13,
        value: [
          { bomItemId: 31, name: 'Kamera', unit: 'szt.', plannedQty: 2, installedQty: null, installed: false, note: '' },
          { bomItemId: 32, name: 'Switch', unit: 'szt.', plannedQty: 1, installedQty: null, installed: false, note: '' },
        ],
      }),
    ]);
  });

  it('rejects attempts to change or remove immutable BOM identity and planned fields', async () => {
    const instance = {
      id: 44, templateVersionId: 7, taskId: 8, status: FormInstanceStatus.DRAFT,
    } as FormInstance;
    const snapshot = [{
      bomItemId: 31, name: 'Kamera', unit: 'szt.', plannedQty: 2,
      installedQty: null, installed: false, note: '',
    }];
    const valueRepository = {
      find: jest.fn().mockResolvedValue([{ id: 13, instanceId: 44, fieldDefinitionId: 12, value: snapshot }]),
      create: jest.fn(value => value),
      save: jest.fn(),
    };
    const repositories = new Map<unknown, any>([
      [FormInstance, { findOne: jest.fn().mockResolvedValue(instance) }],
      [FormSection, { find: jest.fn().mockResolvedValue([section]) }],
      [FormFieldDefinition, { find: jest.fn().mockResolvedValue([bomField]) }],
      [FormFieldValue, valueRepository],
    ]);
    const manager = { getRepository: jest.fn(entity => repositories.get(entity)) };
    const dataSource = { transaction: jest.fn(callback => callback(manager)) };

    await expect(new FormInstanceService(dataSource as any).saveResponses(44, {
      materials: [{ ...snapshot[0], plannedQty: 10 }],
    }, 3)).rejects.toMatchObject({ code: 'INVALID_RESPONSES' });
    expect(valueRepository.save).not.toHaveBeenCalled();
  });
});
