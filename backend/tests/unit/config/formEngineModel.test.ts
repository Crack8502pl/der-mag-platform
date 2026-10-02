import { DataSource } from 'typeorm';
import { AppDataSource } from '../../../src/config/database';
import { FormTemplate } from '../../../src/entities/FormTemplate';
import { FormTemplateVersion } from '../../../src/entities/FormTemplateVersion';
import { FormSection } from '../../../src/entities/FormSection';
import { FormFieldDefinition } from '../../../src/entities/FormFieldDefinition';
import { FormTrigger } from '../../../src/entities/FormTrigger';
import { FormAssignmentRule } from '../../../src/entities/FormAssignmentRule';
import { FormInstance } from '../../../src/entities/FormInstance';
import { FormFieldValue } from '../../../src/entities/FormFieldValue';
import { FormApproval } from '../../../src/entities/FormApproval';
import { CreateFormChecklistEngine1790971200000 } from '../../../src/migrations/20261002_create_form_checklist_engine';

describe('Form Engine TypeORM model', () => {
  let source: DataSource;

  beforeAll(async () => {
    source = new DataSource(AppDataSource.options);
    await (source as unknown as { buildMetadatas(): Promise<void> }).buildMetadatas();
  });

  it('registers every entity and the dated migration without schema synchronization', () => {
    expect(source.options.synchronize).toBe(false);
    for (const entity of [
      FormTemplate, FormTemplateVersion, FormSection, FormFieldDefinition,
      FormTrigger, FormAssignmentRule, FormInstance, FormFieldValue, FormApproval
    ]) {
      expect(source.hasMetadata(entity)).toBe(true);
    }
    expect(source.options.migrations).toContain(CreateFormChecklistEngine1790971200000);
    expect(new CreateFormChecklistEngine1790971200000().name).toMatch(/\d{13}$/);
  });

  it('uses extensible field types and JSONB instead of a schema enum per field type', () => {
    const field = source.getMetadata(FormFieldDefinition);
    expect(field.findColumnWithPropertyName('fieldType')?.type).toBe('varchar');
    for (const property of ['validation', 'options', 'conditions']) {
      expect(field.findColumnWithPropertyName(property)?.type).toBe('jsonb');
    }
    expect(source.getMetadata(FormFieldValue).findColumnWithPropertyName('value')?.type).toBe('jsonb');
    expect(source.getMetadata(FormTemplate).findColumnWithPropertyName('kind')).toBeDefined();
  });

  it('ties sections, fields, triggers and values to the same version with composite foreign keys', () => {
    const relationColumns = (entity: Function, relation: string) =>
      source.getMetadata(entity).findRelationWithPropertyPath(relation)?.joinColumns.map(column => column.databaseName);
    expect(relationColumns(FormFieldDefinition, 'section')).toEqual(['section_id', 'template_version_id']);
    expect(relationColumns(FormAssignmentRule, 'trigger')).toEqual(['trigger_id', 'template_version_id']);
    expect(relationColumns(FormFieldValue, 'instance')).toEqual(['instance_id', 'template_version_id']);
    expect(relationColumns(FormFieldValue, 'fieldDefinition')).toEqual(['field_definition_id', 'template_version_id']);
    const versionColumn = source.getMetadata(FormInstance).findColumnWithPropertyName('templateVersionId');
    expect(versionColumn?.isNullable).toBe(false);
  });

  it('reuses domain entities without cascading writes or adding an installedIn relation', () => {
    const instance = source.getMetadata(FormInstance);
    const expectedTables: Record<string, string> = {
      contract: 'contracts', task: 'tasks', subsystemTask: 'subsystem_tasks',
      object: 'assets', device: 'devices', bomItem: 'task_generated_bom_items',
      workflowBomItem: 'workflow_generated_bom_items', assignedUser: 'users', assignedTeam: 'brigades'
    };
    for (const [property, table] of Object.entries(expectedTables)) {
      const relation = instance.findRelationWithPropertyPath(property)!;
      expect(relation.inverseEntityMetadata.tableName).toBe(table);
      expect(relation.isCascadeInsert || relation.isCascadeUpdate || relation.isCascadeRemove).toBe(false);
      expect(relation.onDelete).toBe('RESTRICT');
      expect(relation.isEager || relation.isLazy).toBe(false);
    }
    expect(instance.columns.some(column => /installed/i.test(column.databaseName))).toBe(false);
    const values = source.getMetadata(FormFieldValue);
    expect(values.findRelationWithPropertyPath('documents')?.inverseEntityMetadata.tableName).toBe('documents');
    expect(values.findRelationWithPropertyPath('photos')?.inverseEntityMetadata.tableName).toBe('photos');
  });

  it('provides indexed domain filters and unique version/answer keys', () => {
    const indexed = source.getMetadata(FormInstance).indices.map(index => index.columns.map(column => column.propertyName));
    for (const key of ['templateVersionId', 'taskId', 'deviceId', 'contractId', 'objectId', 'bomItemId']) {
      expect(indexed).toContainEqual([key]);
    }
    expect(source.getMetadata(FormTemplateVersion).uniques.map(unique => unique.columns.map(column => column.propertyName)))
      .toContainEqual(['templateId', 'version']);
    expect(source.getMetadata(FormFieldValue).uniques.map(unique => unique.columns.map(column => column.propertyName)))
      .toContainEqual(['instanceId', 'fieldDefinitionId']);
  });
});
