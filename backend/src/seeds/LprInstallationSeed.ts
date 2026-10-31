import { DataSource } from 'typeorm';
import { AppDataSource } from '../config/database';
import { FormFieldDefinition } from '../entities/FormFieldDefinition';
import { FormSection } from '../entities/FormSection';
import { FormTemplate } from '../entities/FormTemplate';
import { FormTemplateVersion } from '../entities/FormTemplateVersion';
import { FormKind, FormProcedureType, FormVersionStatus } from '../entities/FormTypes';
import { DraftSectionDto } from '../dto/FormServiceDto';
import { validateFormDefinition } from '../services/FormRules';

const FAIL_CONDITION = {
  field: 'plateRecognitionTest',
  operator: 'equals',
  value: 'FAIL',
} as const;

const sections: DraftSectionDto[] = [
  {
    key: 'mechanical_assembly',
    title: 'Montaż mechaniczny',
    sortOrder: 0,
    fields: [{
      key: 'cameraInstalled',
      label: 'Kamera zamontowana w docelowym miejscu',
      fieldType: 'PASS_FAIL',
      required: true,
    }],
  },
  {
    key: 'power',
    title: 'Zasilanie',
    sortOrder: 1,
    fields: [{
      key: 'powerVoltage',
      label: 'Napięcie zasilania (V)',
      fieldType: 'NUMBER',
      required: true,
      validation: { min: 1 },
      options: { unit: 'V' },
    }],
  },
  {
    key: 'network',
    title: 'Sieć',
    sortOrder: 2,
    fields: [
      {
        key: 'networkConnectivity',
        label: 'Łączność sieciowa',
        fieldType: 'PASS_FAIL',
        required: true,
      },
      {
        key: 'ipAddress',
        label: 'Adres IP',
        fieldType: 'TEXT',
        required: true,
      },
      {
        key: 'ntpSynchronization',
        label: 'Synchronizacja NTP',
        fieldType: 'PASS_FAIL',
        required: true,
      },
    ],
  },
  {
    key: 'configuration',
    title: 'Konfiguracja',
    sortOrder: 3,
    fields: [{
      key: 'configurationNotes',
      label: 'Uwagi do konfiguracji',
      fieldType: 'TEXTAREA',
    }],
  },
  {
    key: 'camera_position',
    title: 'Ustawienie kamery',
    sortOrder: 4,
    fields: [{
      key: 'cameraViewPhoto',
      label: 'Referencja do zdjęcia kadru kamery',
      fieldType: 'TEXT',
    }],
  },
  {
    key: 'lpr',
    title: 'LPR',
    sortOrder: 5,
    fields: [
      {
        key: 'plateRecognitionTest',
        label: 'Test rozpoznawania tablic',
        fieldType: 'PASS_FAIL',
        required: true,
      },
      {
        key: 'failureDescription',
        label: 'Opis niepowodzenia testu LPR',
        fieldType: 'TEXTAREA',
        conditions: { requiredWhen: FAIL_CONDITION },
      },
      {
        key: 'failurePhoto',
        label: 'Referencja do zdjęcia niepowodzenia testu LPR',
        fieldType: 'TEXT',
        conditions: { requiredWhen: FAIL_CONDITION },
      },
    ],
  },
  {
    key: 'recording',
    title: 'Nagrywanie',
    sortOrder: 6,
    fields: [{
      key: 'recordingTest',
      label: 'Test nagrywania',
      fieldType: 'PASS_FAIL',
      required: true,
    }],
  },
  {
    key: 'final_test',
    title: 'Test końcowy',
    sortOrder: 7,
    fields: [
      {
        key: 'playbackTest',
        label: 'Test odtwarzania',
        fieldType: 'PASS_FAIL',
        required: true,
      },
      {
        key: 'finalPhoto',
        label: 'Referencja do zdjęcia końcowego',
        fieldType: 'TEXT',
      },
    ],
  },
];

export class LprInstallationSeed {
  static async seed(dataSource: DataSource = AppDataSource): Promise<FormTemplate | null> {
    return dataSource.transaction(async manager => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['LPR_INSTALLATION']);
      const templates = manager.getRepository(FormTemplate);
      const existing = await templates.findOne({ where: { key: 'LPR_INSTALLATION' } });
      if (existing) return null;

      const template = await templates.save(templates.create({
        key: 'LPR_INSTALLATION',
        name: 'LPR Installation Checklist',
        description: 'Przykładowa checklista instalacji i uruchomienia systemu LPR.',
        kind: FormKind.CHECKLIST,
        procedureType: FormProcedureType.FIELD_INSTALLATION,
        active: true,
        createdById: null,
      }));

      const versionRepository = manager.getRepository(FormTemplateVersion);
      const version = await versionRepository.save(versionRepository.create({
        templateId: template.id,
        version: 1,
        status: FormVersionStatus.PUBLISHED,
        title: template.name,
        description: template.description,
        kind: template.kind,
        procedureType: template.procedureType,
        settings: {},
        publishedAt: new Date(),
        createdById: null,
      }));

      const sectionRepository = manager.getRepository(FormSection);
      const savedSections = await sectionRepository.save(sections.map(section =>
        sectionRepository.create({
          templateVersionId: version.id,
          key: section.key,
          title: section.title,
          description: section.description ?? null,
          sortOrder: section.sortOrder ?? 0,
          conditions: section.conditions ?? {},
        }),
      ));
      const sectionIds = new Map(savedSections.map(section => [section.key, section.id]));
      const fieldRepository = manager.getRepository(FormFieldDefinition);
      const fields = sections.flatMap(section => section.fields.map((field, sortOrder) =>
        fieldRepository.create({
          templateVersionId: version.id,
          sectionId: sectionIds.get(section.key)!,
          key: field.key,
          label: field.label,
          fieldType: field.fieldType,
          required: field.required ?? false,
          sortOrder,
          validation: field.validation ?? {},
          options: field.options ?? {},
          conditions: field.conditions ?? {},
        }),
      ));

      validateFormDefinition(savedSections, fields);
      await fieldRepository.save(fields);
      return template;
    });
  }
}
