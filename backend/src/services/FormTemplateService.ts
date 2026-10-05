import { AppDataSource } from '../config/database';
import { FormFieldDefinition } from '../entities/FormFieldDefinition';
import { FormAssignmentRule } from '../entities/FormAssignmentRule';
import { FormSection } from '../entities/FormSection';
import { FormTemplate } from '../entities/FormTemplate';
import { FormTemplateVersion } from '../entities/FormTemplateVersion';
import { FormTrigger } from '../entities/FormTrigger';
import { FormVersionStatus } from '../entities/FormTypes';
import { CreateFormTemplateDto, DraftSectionDto, UpdateFormDraftDto } from '../dto/FormServiceDto';
import { FormDomainError } from '../errors/FormDomainError';
import { FormAuditService } from './FormAuditService';
import { validateFormConditionShape, validateFormDefinition } from './FormRules';
import { DataSource, EntityManager } from 'typeorm';

export class FormTemplateService {
  constructor(private readonly dataSource: DataSource = AppDataSource) {}

  async createTemplate(input: CreateFormTemplateDto, actorId: number): Promise<FormTemplate> {
    return this.dataSource.transaction(async manager => {
      const repository = manager.getRepository(FormTemplate);
      const template = await repository.save(repository.create({
        ...input,
        description: input.description ?? null,
        createdById: actorId,
      }));

      await FormAuditService.record(manager, 'FORM_TEMPLATE_CREATED', actorId, 'form_template', template.id, [
        { field: 'template', previousValue: null, newValue: { key: template.key, name: template.name } },
      ]);
      return template;
    });
  }

  async createDraft(templateId: number, actorId: number): Promise<FormTemplateVersion> {
    return this.dataSource.transaction(async manager => {
      const templateRepository = manager.getRepository(FormTemplate);
      const template = await templateRepository.findOne({
        where: { id: templateId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!template) throw new FormDomainError('TEMPLATE_NOT_FOUND', `Form template ${templateId} was not found`);

      const versions = await manager.getRepository(FormTemplateVersion).find({
        where: { templateId },
        order: { version: 'DESC' },
      });
      if (versions.some(version => version.status === FormVersionStatus.DRAFT)) {
        throw new FormDomainError('DRAFT_ALREADY_EXISTS', `Form template ${templateId} already has a draft`);
      }

      const source = versions.find(version => version.status === FormVersionStatus.PUBLISHED);
      const draft = source
        ? await this.copyPublishedVersion(manager, source, actorId, versions[0].version + 1)
        : await manager.getRepository(FormTemplateVersion).save(
            manager.getRepository(FormTemplateVersion).create({
              templateId,
              version: 1,
              status: FormVersionStatus.DRAFT,
              title: template.name,
              description: template.description,
              kind: template.kind,
              procedureType: template.procedureType,
              settings: {},
              publishedAt: null,
              createdById: actorId,
            }),
          );

      await FormAuditService.record(manager, 'FORM_DRAFT_CREATED', actorId, 'form_template_version', draft.id, [
        { field: 'status', previousValue: null, newValue: draft.status },
      ], { templateId, version: draft.version });
      return draft;
    });
  }

  async createNextVersion(publishedVersionId: number, actorId: number): Promise<FormTemplateVersion> {
    return this.dataSource.transaction(async manager => {
      const versionRepository = manager.getRepository(FormTemplateVersion);
      const source = await versionRepository.findOne({
        where: { id: publishedVersionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!source) throw new FormDomainError('VERSION_NOT_FOUND', `Form version ${publishedVersionId} was not found`);
      if (source.status !== FormVersionStatus.PUBLISHED) {
        throw new FormDomainError('VERSION_NOT_PUBLISHED', 'A new version must be copied from a published version');
      }
      const template = await manager.getRepository(FormTemplate).findOne({
        where: { id: source.templateId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!template) {
        throw new FormDomainError('TEMPLATE_NOT_FOUND', `Form template ${source.templateId} was not found`);
      }

      const allVersions = await versionRepository.find({
        where: { templateId: source.templateId },
        order: { version: 'DESC' },
      });
      if (allVersions.some(version => version.status === FormVersionStatus.DRAFT)) {
        throw new FormDomainError('DRAFT_ALREADY_EXISTS', `Form template ${source.templateId} already has a draft`);
      }
      const draft = await this.copyPublishedVersion(manager, source, actorId, allVersions[0].version + 1);
      await FormAuditService.record(manager, 'FORM_VERSION_COPIED', actorId, 'form_template_version', draft.id, [
        { field: 'sourceVersionId', previousValue: null, newValue: source.id },
        { field: 'status', previousValue: null, newValue: draft.status },
      ], { templateId: source.templateId, version: draft.version });
      return draft;
    });
  }

  async updateDraft(versionId: number, input: UpdateFormDraftDto, actorId: number): Promise<FormTemplateVersion> {
    return this.dataSource.transaction(async manager => {
      const version = await this.lockVersion(manager, versionId);
      const changes: Array<{ field: string; previousValue: unknown; newValue: unknown }> = [];

      if (input.title !== undefined) {
        changes.push({ field: 'title', previousValue: version.title, newValue: input.title });
        version.title = input.title;
      }
      if (input.description !== undefined) {
        changes.push({ field: 'description', previousValue: version.description, newValue: input.description });
        version.description = input.description;
      }
      if (input.settings !== undefined) {
        changes.push({ field: 'settings', previousValue: version.settings, newValue: input.settings });
        version.settings = input.settings;
      }
      if (input.sections !== undefined) {
        this.validateDraftSections(input.sections);
        const previousDefinition = await this.replaceDefinition(manager, versionId, input.sections);
        changes.push({ field: 'definition', previousValue: previousDefinition, newValue: input.sections });
      }

      const updated = await manager.getRepository(FormTemplateVersion).save(version);
      await FormAuditService.record(manager, 'FORM_DRAFT_UPDATED', actorId, 'form_template_version', version.id, changes);
      return updated;
    });
  }

  async publishVersion(versionId: number, actorId: number): Promise<FormTemplateVersion> {
    return this.dataSource.transaction(async manager => {
      const version = await this.lockVersion(manager, versionId);
      const [sections, fields] = await Promise.all([
        manager.getRepository(FormSection).find({ where: { templateVersionId: version.id } }),
        manager.getRepository(FormFieldDefinition).find({ where: { templateVersionId: version.id } }),
      ]);
      validateFormDefinition(sections, fields);

      const oldStatus = version.status;
      version.status = FormVersionStatus.PUBLISHED;
      version.publishedAt = new Date();
      const published = await manager.getRepository(FormTemplateVersion).save(version);
      await FormAuditService.record(manager, 'FORM_VERSION_PUBLISHED', actorId, 'form_template_version', version.id, [
        { field: 'status', previousValue: oldStatus, newValue: published.status },
        { field: 'publishedAt', previousValue: null, newValue: published.publishedAt },
      ], { templateId: version.templateId, version: version.version });
      return published;
    });
  }

  private async lockVersion(manager: EntityManager, versionId: number): Promise<FormTemplateVersion> {
    const version = await manager.getRepository(FormTemplateVersion).findOne({
      where: { id: versionId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!version) throw new FormDomainError('VERSION_NOT_FOUND', `Form version ${versionId} was not found`);
    if (version.status !== FormVersionStatus.DRAFT) {
      throw new FormDomainError('VERSION_NOT_DRAFT', 'Published form versions are immutable');
    }
    return version;
  }

  private validateDraftSections(sections: DraftSectionDto[]): void {
    const sectionKeys = new Set<string>();
    const fieldKeys = new Set<string>();
    for (const section of sections) {
      if (!section.key || sectionKeys.has(section.key)) {
        throw new FormDomainError('INVALID_DEFINITION', `Duplicate or empty section key: ${section.key}`);
      }
      sectionKeys.add(section.key);
      for (const field of section.fields || []) {
        if (!field.key || fieldKeys.has(field.key)) {
          throw new FormDomainError('INVALID_DEFINITION', `Duplicate or empty field key: ${field.key}`);
        }
        fieldKeys.add(field.key);
      }
    }
    for (const section of sections) {
      validateFormConditionShape(section.conditions, fieldKeys, `section ${section.key}`, ['visibleWhen']);
      for (const field of section.fields || []) {
        validateFormConditionShape(field.conditions, fieldKeys, `field ${field.key}`);
      }
    }
  }

  private async replaceDefinition(
    manager: EntityManager,
    versionId: number,
    sections: DraftSectionDto[],
  ): Promise<{ sections: FormSection[]; fields: FormFieldDefinition[] }> {
    const fieldsRepository = manager.getRepository(FormFieldDefinition);
    const sectionsRepository = manager.getRepository(FormSection);
    const [previousSections, previousFields] = await Promise.all([
      sectionsRepository.find({ where: { templateVersionId: versionId } }),
      fieldsRepository.find({ where: { templateVersionId: versionId } }),
    ]);

    await fieldsRepository.delete({ templateVersionId: versionId });
    await sectionsRepository.delete({ templateVersionId: versionId });

    const sectionEntities = await sectionsRepository.save(sections.map(section =>
      sectionsRepository.create({
        templateVersionId: versionId,
        key: section.key,
        title: section.title,
        description: section.description ?? null,
        sortOrder: section.sortOrder ?? 0,
        conditions: section.conditions ?? {},
      }),
    ));
    const sectionIds = new Map(sectionEntities.map(section => [section.key, section.id]));
    const fieldEntities = sections.flatMap(section => (section.fields || []).map(field =>
      fieldsRepository.create({
        templateVersionId: versionId,
        sectionId: sectionIds.get(section.key)!,
        key: field.key,
        label: field.label,
        fieldType: field.fieldType,
        required: field.required ?? false,
        sortOrder: field.sortOrder ?? 0,
        validation: field.validation ?? {},
        options: field.options ?? {},
        conditions: field.conditions ?? {},
      }),
    ));
    if (fieldEntities.length) await fieldsRepository.save(fieldEntities);
    return { sections: previousSections, fields: previousFields };
  }

  private async copyPublishedVersion(
    manager: EntityManager,
    source: FormTemplateVersion,
    actorId: number,
    nextVersion: number,
  ): Promise<FormTemplateVersion> {
    const [sourceSections, sourceFields, sourceTriggers, sourceAssignments] = await Promise.all([
      manager.getRepository(FormSection).find({ where: { templateVersionId: source.id }, order: { sortOrder: 'ASC' } }),
      manager.getRepository(FormFieldDefinition).find({ where: { templateVersionId: source.id }, order: { sortOrder: 'ASC' } }),
      manager.getRepository(FormTrigger).find({ where: { templateVersionId: source.id } }),
      manager.getRepository(FormAssignmentRule).find({ where: { templateVersionId: source.id }, order: { priority: 'ASC' } }),
    ]);

    const versionRepository = manager.getRepository(FormTemplateVersion);
    const draft = await versionRepository.save(versionRepository.create({
      templateId: source.templateId,
      version: nextVersion,
      status: FormVersionStatus.DRAFT,
      title: source.title,
      description: source.description,
      kind: source.kind,
      procedureType: source.procedureType,
      settings: source.settings,
      publishedAt: null,
      createdById: actorId,
    }));

    const sectionsRepository = manager.getRepository(FormSection);
    const copiedSections = await sectionsRepository.save(sourceSections.map(section =>
      sectionsRepository.create({
        templateVersionId: draft.id,
        key: section.key,
        title: section.title,
        description: section.description,
        sortOrder: section.sortOrder,
        conditions: section.conditions,
      }),
    ));
    const sectionIdMap = new Map(sourceSections.map((section, index) => [section.id, copiedSections[index].id]));

    if (sourceFields.length) {
      const repository = manager.getRepository(FormFieldDefinition);
      await repository.save(sourceFields.map(field =>
        repository.create({
          templateVersionId: draft.id,
          sectionId: sectionIdMap.get(field.sectionId)!,
          key: field.key,
          label: field.label,
          fieldType: field.fieldType,
          required: field.required,
          sortOrder: field.sortOrder,
          validation: field.validation,
          options: field.options,
          conditions: field.conditions,
        }),
      ));
    }

    let triggerIdMap = new Map<number, number>();
    if (sourceTriggers.length) {
      const repository = manager.getRepository(FormTrigger);
      const copiedTriggers = await repository.save(sourceTriggers.map(trigger =>
        repository.create({
          templateVersionId: draft.id,
          eventType: trigger.eventType,
          active: trigger.active,
          conditions: trigger.conditions,
        }),
      ));
      triggerIdMap = new Map(sourceTriggers.map((trigger, index) => [trigger.id, copiedTriggers[index].id]));
    }

    if (sourceAssignments.length) {
      const repository = manager.getRepository(FormAssignmentRule);
      await repository.save(sourceAssignments.map(rule =>
        repository.create({
          templateVersionId: draft.id,
          triggerId: rule.triggerId === null ? null : triggerIdMap.get(rule.triggerId)!,
          priority: rule.priority,
          active: rule.active,
          conditions: rule.conditions,
          assignedUserId: rule.assignedUserId,
          assignedTeamId: rule.assignedTeamId,
        }),
      ));
    }
    return draft;
  }
}

export default FormTemplateService;
