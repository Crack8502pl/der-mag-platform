import { FormFieldDefinition } from '../../../src/entities/FormFieldDefinition';
import { FormSection } from '../../../src/entities/FormSection';
import { FormTemplate } from '../../../src/entities/FormTemplate';
import { FormTemplateVersion } from '../../../src/entities/FormTemplateVersion';
import { FormKind, FormProcedureType, FormVersionStatus } from '../../../src/entities/FormTypes';
import { LprInstallationSeed } from '../../../src/seeds/LprInstallationSeed';
import { validateFormResponses } from '../../../src/services/FormRules';

jest.mock('../../../src/config/database', () => ({ AppDataSource: {} }));

describe('LprInstallationSeed', () => {
  const createHarness = (existingTemplate: FormTemplate | null = null) => {
    const templateRepository = {
      create: jest.fn((value: unknown) => value),
      findOne: jest.fn().mockResolvedValue(existingTemplate),
      save: jest.fn(async (value: any) => ({ id: 1, ...value })),
    };
    const versionRepository = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (value: any) => ({ id: 7, ...value })),
    };
    const sectionRepository = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (values: any[]) => values.map((value, index) => ({ id: index + 10, ...value }))),
    };
    const fieldRepository = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (values: any[]) => values),
    };
    const repositories = new Map<unknown, any>([
      [FormTemplate, templateRepository],
      [FormTemplateVersion, versionRepository],
      [FormSection, sectionRepository],
      [FormFieldDefinition, fieldRepository],
    ]);
    const manager = {
      getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
      query: jest.fn().mockResolvedValue(undefined),
    };
    const dataSource = {
      transaction: jest.fn((callback: (manager: any) => unknown) => callback(manager)),
    };
    return {
      dataSource,
      manager,
      templateRepository,
      versionRepository,
      sectionRepository,
      fieldRepository,
    };
  };

  it('creates a published CHECKLIST version with all sections and conditional LPR failure evidence', async () => {
    const h = createHarness();

    await expect(LprInstallationSeed.seed(h.dataSource as any)).resolves.toMatchObject({
      key: 'LPR_INSTALLATION',
      kind: FormKind.CHECKLIST,
      procedureType: FormProcedureType.FIELD_INSTALLATION,
      createdById: null,
    });

    expect(h.manager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      ['LPR_INSTALLATION'],
    );
    expect(h.versionRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      templateId: 1,
      version: 1,
      status: FormVersionStatus.PUBLISHED,
      publishedAt: expect.any(Date),
    }));
    expect(h.sectionRepository.save).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ key: 'mechanical_assembly', sortOrder: 0 }),
      expect.objectContaining({ key: 'power', sortOrder: 1 }),
      expect.objectContaining({ key: 'network', sortOrder: 2 }),
      expect.objectContaining({ key: 'configuration', sortOrder: 3 }),
      expect.objectContaining({ key: 'camera_position', sortOrder: 4 }),
      expect.objectContaining({ key: 'lpr', sortOrder: 5 }),
      expect.objectContaining({ key: 'recording', sortOrder: 6 }),
      expect.objectContaining({ key: 'final_test', sortOrder: 7 }),
    ]));
    const fields = h.fieldRepository.save.mock.calls[0][0];
    expect(fields).toHaveLength(13);
    expect(fields).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'failureDescription',
        conditions: { requiredWhen: { field: 'plateRecognitionTest', operator: 'equals', value: 'FAIL' } },
      }),
      expect.objectContaining({
        key: 'failurePhoto',
        conditions: { requiredWhen: { field: 'plateRecognitionTest', operator: 'equals', value: 'FAIL' } },
      }),
    ]));
    const savedSections = await h.sectionRepository.save.mock.results[0].value;
    const passingErrors = validateFormResponses(savedSections, fields, {
      cameraInstalled: 'PASS',
      powerVoltage: 12,
      networkConnectivity: 'PASS',
      ipAddress: '192.0.2.10',
      ntpSynchronization: 'PASS',
      plateRecognitionTest: 'PASS',
      recordingTest: 'PASS',
      playbackTest: 'PASS',
    }, true);
    expect(passingErrors).toEqual([]);
    const errors = validateFormResponses(savedSections, fields, {
      cameraInstalled: 'PASS',
      powerVoltage: 12,
      networkConnectivity: 'PASS',
      ipAddress: '192.0.2.10',
      ntpSynchronization: 'PASS',
      plateRecognitionTest: 'FAIL',
      recordingTest: 'PASS',
      playbackTest: 'PASS',
    }, true);
    expect(errors).toEqual(expect.arrayContaining([
      'failureDescription: is required',
      'failurePhoto: is required',
      'plateRecognitionTest: FAIL blocks completion',
    ]));
  });

  it('does not overwrite an existing template or create duplicate versions', async () => {
    const existing = { id: 4, key: 'LPR_INSTALLATION' } as FormTemplate;
    const h = createHarness(existing);

    await expect(LprInstallationSeed.seed(h.dataSource as any)).resolves.toBeNull();

    expect(h.templateRepository.save).not.toHaveBeenCalled();
    expect(h.versionRepository.save).not.toHaveBeenCalled();
    expect(h.sectionRepository.save).not.toHaveBeenCalled();
    expect(h.fieldRepository.save).not.toHaveBeenCalled();
  });
});
