import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { useFormTemplates } from '../../hooks/useFormTemplates';
import { DynamicFormRenderer } from '../forms/DynamicFormRenderer';
import { FormBrandingPreview } from '../forms/FormBrandingPreview';
import { formsService, type UpdateFormDraftInput } from '../../services/forms.service';
import taskService from '../../services/task.service';
import variableEngineService, { type VariableEngineVariable } from '../../services/variableEngine.service';
import type { Task } from '../../types/task.types';
import type {
  FormBranding,
  FormAssignmentRule,
  FormCondition,
  FormField,
  FormKind,
  FormProcedureType,
  FormSection,
  FormTeamOption,
  FormTemplate,
  FormUserOption,
  FormVersion,
  FormVersionSummary,
} from '../../types/forms.types';
import './FormBuilderPage.css';

type BuilderTab = 'builder' | 'versions' | 'preview' | 'rules';
type DefinitionSection = FormSection & { id?: number };

const FIELD_TYPES: Array<{ value: string; label: string }> = [
  { value: 'TEXT', label: 'Tekst' },
  { value: 'TEXTAREA', label: 'Długi tekst' },
  { value: 'EMAIL', label: 'Adres e-mail' },
  { value: 'DATE', label: 'Data' },
  { value: 'SELECT', label: 'Lista wyboru' },
  { value: 'RADIO', label: 'Wybór jednej opcji' },
  { value: 'NUMBER', label: 'Liczba' },
  { value: 'PASS_FAIL', label: 'OK / Nie OK' },
  { value: 'CHECKBOX', label: 'Pole wyboru' },
  { value: 'MULTI_SELECT', label: 'Lista wielokrotnego wyboru' },
  { value: 'DATA', label: 'Dane z systemu' },
  { value: 'BOM_TABLE', label: 'Tabela BOM' },
];
const PROCEDURES: Array<{ value: FormProcedureType; label: string }> = [
  { value: 'CABINET_PREFABRICATION', label: 'Prefabrykacja szafy' },
  { value: 'DEVICE_PRECONFIGURATION', label: 'Prekonfiguracja urządzenia' },
  { value: 'FIELD_INSTALLATION', label: 'Montaż w terenie' },
];
const procedureLabel = (procedureType: FormProcedureType): string =>
  PROCEDURES.find(procedure => procedure.value === procedureType)?.label || procedureType;
const CONDITION_KEYS = ['visibleWhen', 'requiredWhen', 'blockCompletionWhen'] as const;
type ConditionKey = typeof CONDITION_KEYS[number] | 'when';
const OPERATOR_LABELS: Record<string, string> = {
  equals: 'równa się',
  notEquals: 'nie równa się',
  gt: 'większe niż',
  gte: 'większe lub równe',
  lt: 'mniejsze niż',
  lte: 'mniejsze lub równe',
  in: 'jest jedną z wartości',
  notIn: 'nie jest żadną z wartości',
  isEmpty: 'jest puste',
  isNotEmpty: 'nie jest puste',
};
const CONDITION_LABELS: Record<ConditionKey, string> = {
  visibleWhen: 'Widoczność zależy od',
  requiredWhen: 'Pole wymagane, gdy',
  blockCompletionWhen: 'Blokuj ukończenie, gdy',
  when: 'Warunek przypisania',
};
const RESERVED_KEYS = new Set([...Object.getOwnPropertyNames(Object.prototype), 'prototype']);

const uniqueKey = (base: string, used: string[]): string => {
  let candidate = base;
  let suffix = 2;
  while (used.includes(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  return candidate;
};

const keyFromLabel = (label: string): string => {
  const key = label.replace(/[Łł]/g, letter => letter === 'Ł' ? 'L' : 'l').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 100);
  return key || 'POLE';
};

const definitionError = (sections: DefinitionSection[]): string => {
  const sectionKeys = new Set<string>();
  const fieldKeys = new Set<string>();
  const validKey = (key: string) => /^[A-Za-z0-9_-]{1,100}$/.test(key) && !RESERVED_KEYS.has(key);
  for (const section of sections) {
    if (!validKey(section.key)) return `Nieprawidłowy klucz sekcji: ${section.key || '(pusty)'}.`;
    if (sectionKeys.has(section.key)) return `Klucz sekcji "${section.key}" musi być unikalny.`;
    if (!section.title.trim()) return `Sekcja "${section.key}" musi mieć nazwę.`;
    sectionKeys.add(section.key);
    for (const field of section.fields) {
      if (!validKey(field.key)) return `Nieprawidłowy klucz pola: ${field.key || '(pusty)'}.`;
      if (fieldKeys.has(field.key)) return `Klucz pola "${field.key}" musi być unikalny w całym formularzu.`;
      if (!field.label.trim()) return `Pole "${field.key}" musi mieć etykietę.`;
      fieldKeys.add(field.key);
      const min = field.validation.min;
      const max = field.validation.max;
      if (typeof min === 'number' && typeof max === 'number' && min > max) {
        return `Minimum pola "${field.key}" nie może przekraczać maksimum.`;
      }
      if (field.fieldType === 'DATA' &&
          (typeof field.options.source !== 'string' ||
           !['readonly', 'prefill'].includes(String(field.options.mode)) ||
           !['string', 'number', 'boolean'].includes(String(field.options.valueType)))) {
        return `Wybierz prawidłowe źródło danych systemowych dla pola "${field.key}".`;
      }
    }
  }
  return '';
};

const emptySection = (index: number): DefinitionSection => ({
  key: keyFromLabel(`Sekcja ${index + 1}`),
  title: `Sekcja ${index + 1}`,
  description: '',
  sortOrder: index,
  conditions: {},
  fields: [],
});

const emptyField = (index: number): FormField => ({
  key: keyFromLabel(`Pole ${index + 1}`),
  label: `Pole ${index + 1}`,
  fieldType: 'TEXT',
  required: false,
  sortOrder: index,
  validation: {},
  options: {},
  conditions: {},
});

const readError = (error: unknown): { message: string; fieldKey?: string } => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { code?: string; message?: string } } }).response;
    const code = response?.data?.code;
    const message = response?.data?.message || '';
    const fieldMatch = message.match(/(?:field key:|field:)\s*([A-Za-z0-9_-]+)/i)
      || message.match(/on field\s+([A-Za-z0-9_-]+)/i)
      || message.match(/numeric bounds on\s+([A-Za-z0-9_-]+)/i);
    const fieldKey = fieldMatch?.[1];
    const domainMessages: Record<string, string> = {
      TEMPLATE_NOT_FOUND: 'Nie znaleziono formularza.',
      VERSION_NOT_FOUND: 'Nie znaleziono wersji formularza.',
      INSTANCE_NOT_FOUND: 'Nie znaleziono formularza do wypełnienia.',
      VERSION_NOT_DRAFT: 'Opublikowana wersja jest tylko do odczytu.',
      VERSION_NOT_PUBLISHED: 'Ta operacja wymaga opublikowanej wersji.',
      DRAFT_ALREADY_EXISTS: 'Istnieje już wersja robocza tego formularza.',
      INVALID_DEFINITION: message.includes('numeric bounds')
        ? `Sprawdź zakres liczbowy pola „${fieldKey || ''}”.`
        : message.includes('assignment rule must have')
          ? 'Wybierz użytkownika lub brygadę dla reguły przypisania.'
          : message.includes('Assignment trigger')
            ? 'Wybrany trigger nie należy do tej wersji formularza.'
            : fieldKey && message.toLowerCase().includes('condition')
              ? `Sprawdź warunek pola „${fieldKey}”.`
        : message.includes('field key') || message.includes('field:')
          ? `Sprawdź klucz lub konfigurację pola „${fieldKey || ''}”.`
          : message.includes('section key')
            ? 'Sprawdź klucze sekcji; muszą być poprawne i unikalne.'
            : 'Definicja formularza zawiera nieprawidłowe dane. Sprawdź warunki, klucze i przypisania.',
      INVALID_RESPONSES: message.includes('tylko do odczytu')
        ? message
        : 'Odpowiedzi zawierają nieprawidłowe wartości. Sprawdź wskazane pola.',
      INVALID_ASSIGNMENT: 'Reguła przypisania jest nieprawidłowa. Sprawdź użytkownika, brygadę i trigger.',
      INVALID_INSTANCE_CONTEXT: 'Nie można połączyć formularza z wybranym elementem.',
      INVALID_INSTANCE_STATUS: 'Nie można wykonać tej operacji dla aktualnego statusu formularza.',
      INVALID_INSTALLATION_WORKFLOW: 'Nieprawidłowy etap instalacji dla tego formularza.',
      REJECTION_COMMENT_REQUIRED: 'Przed odrzuceniem dodaj komentarz.',
      OVERRIDE_COMMENT_REQUIRED: 'Przed nadpisaniem wyniku dodaj komentarz.',
    };
    if (code && domainMessages[code]) return { message: domainMessages[code], fieldKey };
    if (message && !code) return { message };
  }
  return { message: 'Nie udało się wykonać operacji. Sprawdź połączenie i spróbuj ponownie.' };
};

const templateSections = (version: FormVersion): DefinitionSection[] =>
  version.sections.map((section, sectionIndex) => ({
    key: section.key,
    title: section.title,
    description: section.description || '',
    sortOrder: section.sortOrder ?? sectionIndex,
    conditions: section.conditions || {},
    id: section.id,
    fields: version.fields
      .filter(field => field.sectionId === section.id)
      .map((field, fieldIndex) => ({
        key: field.key,
        label: field.label,
        fieldType: field.fieldType,
        required: field.required,
        sortOrder: field.sortOrder ?? fieldIndex,
        validation: field.validation || {},
        options: field.options || {},
        conditions: field.conditions || {},
      })),
  }));

const draftInput = (version: FormVersion, sections: DefinitionSection[]): UpdateFormDraftInput => ({
  title: version.title,
  description: version.description || undefined,
  settings: version.settings || {},
  sections: sections.map((section, sectionIndex) => ({
    key: section.key,
    title: section.title,
    description: section.description || undefined,
    sortOrder: sectionIndex,
    conditions: section.conditions,
    fields: section.fields.map((field, fieldIndex) => ({
      key: field.key,
      label: field.label,
      fieldType: field.fieldType,
      required: field.required,
      sortOrder: fieldIndex,
      validation: field.validation,
      options: field.options,
      conditions: field.conditions,
    })),
  })),
  headerId: version.headerId ?? null,
  footerId: version.footerId ?? null,
});

const samplePreviewValues = (version: FormVersion): Record<string, unknown> => {
  const values: Record<string, unknown> = {};
  for (const field of version.fields) {
    if (field.fieldType.toUpperCase() === 'DATA') {
      values[field.key] = field.options.source === 'task.number'
        ? 'Z00011026'
        : field.options.valueType === 'number'
          ? 42
          : field.options.valueType === 'boolean'
            ? true
            : 'Przykładowa wartość';
    } else if (field.fieldType.toUpperCase() === 'BOM_TABLE') {
      values[field.key] = [{
        bomItemId: 1,
        name: 'Przykładowy materiał',
        unit: 'szt.',
        plannedQty: 2,
        installedQty: null,
        installed: false,
        note: '',
      }];
    }
  }
  return values;
};

const reindex = <T extends { sortOrder: number }>(items: T[]): T[] =>
  items.map((item, sortOrder) => ({ ...item, sortOrder }));

const moveItem = <T,>(items: T[], from: number, to: number): T[] => {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
};

const DragHandle: React.FC<{ id: string; label: string; disabled: boolean; children: React.ReactNode }> = ({ id, label, disabled, children }) => {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id, disabled });
  const { setNodeRef: setDropRef } = useDroppable({ id, disabled });
  const setNodeRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };
  return (
    <div
      ref={setNodeRef}
      className={`form-builder__drag-item${isDragging ? ' is-dragging' : ''}`}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
    >
      <button
        type="button"
        className="form-builder__drag-handle"
        aria-label={`Przeciągnij: ${label}`}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      {children}
    </div>
  );
};

const ConditionEditor: React.FC<{
  value: Record<string, FormCondition>;
  fields: FormField[];
  section?: boolean;
  conditionKeys?: ConditionKey[];
  disabled: boolean;
  onChange: (conditions: Record<string, FormCondition>) => void;
}> = ({ value, fields, section = false, conditionKeys, disabled, onChange }) => {
  const allowed: ConditionKey[] = conditionKeys || (section ? ['visibleWhen'] : [...CONDITION_KEYS]);
  const targetFields = fields;
  const selectedFields = (key: ConditionKey) => {
    const selectedKey = value[key]?.field;
    return selectedKey ? targetFields.find(field => field.key === selectedKey) : undefined;
  };
  const optionsFor = (field?: FormField): string[] =>
    field && Array.isArray(field.options.values)
      ? field.options.values.filter((option): option is string => typeof option === 'string')
      : [];
  const operatorOptions = (field?: FormField) => field?.fieldType === 'NUMBER'
    ? ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'in', 'notIn', 'isEmpty', 'isNotEmpty']
    : ['equals', 'notEquals', 'in', 'notIn', 'isEmpty', 'isNotEmpty'];
  const addCondition = (key: string) => onChange({
    ...value,
    [key]: { field: targetFields[0]?.key || '', operator: 'equals', value: '' },
  });

  return (
    <fieldset className="form-builder__conditions" disabled={disabled}>
      <legend>Warunki</legend>
      {allowed.map(key => {
        const condition = value[key];
        if (!condition) {
          return (
            <button key={key} type="button" className="btn btn-secondary form-builder__small-button" onClick={() => addCondition(key)}>
              + {CONDITION_LABELS[key]}
            </button>
          );
        }
        const target = selectedFields(key);
        const options = optionsFor(target);
        const requiresValue = !['isEmpty', 'isNotEmpty'].includes(condition.operator);
        const isMembershipOperator = ['in', 'notIn'].includes(condition.operator);
        const legacyValue = typeof condition.value === 'string' ? condition.value : '';
        const conditionValues = Array.isArray(condition.value)
          ? condition.value
          : condition.value === undefined ? [] : [condition.value];
        const updateValue = (raw: string) => {
          const parsed = target?.fieldType === 'NUMBER' && raw !== '' ? Number(raw) : raw;
          onChange({ ...value, [key]: { ...condition, value: parsed } });
        };
        const updateValueList = (nextValues: string[]) => {
          const parsed = target?.fieldType === 'NUMBER'
            ? nextValues.filter(item => item !== '').map(Number)
            : target?.fieldType === 'CHECKBOX'
              ? nextValues.map(item => item === 'true')
              : nextValues;
          onChange({ ...value, [key]: { ...condition, value: parsed } });
        };
        const operatorChoices = operatorOptions(target);
        if (!operatorChoices.includes(condition.operator)) operatorChoices.push(condition.operator);
        return (
          <div className="form-builder__condition" key={key}>
            <label>
              {CONDITION_LABELS[key]} — pole
              <select
                aria-label={`${key} pole`}
                value={condition.field}
                onChange={event => {
                  const nextField = targetFields.find(field => field.key === event.target.value);
                  onChange({
                    ...value,
                    [key]: { field: event.target.value, operator: 'equals', value: nextField?.fieldType === 'CHECKBOX' ? true : '' },
                  });
                }}
              >
                <option value="">Wybierz pole</option>
                {targetFields.map(field => <option key={field.key} value={field.key}>{field.label} ({field.key})</option>)}
              </select>
            </label>
            <label>
              Operator
              <select
                aria-label={`${key} operator`}
                value={condition.operator}
                onChange={event => {
                  const operator = event.target.value;
                  onChange({ ...value, [key]: { ...condition, operator, value: ['isEmpty', 'isNotEmpty'].includes(operator) ? undefined : condition.value } });
                }}
              >
                {operatorChoices.map(operator => <option key={operator} value={operator}>{OPERATOR_LABELS[operator] || operator}</option>)}
              </select>
            </label>
            {requiresValue && target?.fieldType === 'CHECKBOX' && (
              <label>
                Wartość
                <select
                  aria-label={`${key} wartość`}
                  multiple={isMembershipOperator}
                  value={isMembershipOperator ? conditionValues.map(String) : condition.value === true ? 'true' : condition.value === false ? 'false' : ''}
                  onChange={event => isMembershipOperator
                    ? updateValueList(Array.from(event.currentTarget.selectedOptions, option => option.value))
                    : onChange({ ...value, [key]: { ...condition, value: event.target.value === '' ? undefined : event.target.value === 'true' } })}
                >
                  {!isMembershipOperator && <option value="">Wybierz</option>}
                  <option value="true">Zaznaczone</option><option value="false">Niezaznaczone</option>
                </select>
              </label>
            )}
            {requiresValue && target?.fieldType === 'PASS_FAIL' && (
              <label>Wartość
                <select
                  aria-label={`${key} wartość`}
                  multiple={isMembershipOperator}
                  value={isMembershipOperator ? conditionValues.map(String) : legacyValue}
                  onChange={event => isMembershipOperator
                    ? updateValueList(Array.from(event.currentTarget.selectedOptions, option => option.value))
                    : updateValue(event.target.value)}
                >
                  {!isMembershipOperator && <option value="">Wybierz</option>}
                  <option value="PASS">OK</option><option value="FAIL">Nie OK</option>
                </select>
              </label>
            )}
            {requiresValue && ['SELECT', 'RADIO'].includes(target?.fieldType || '') && (
              <label>Wartość
                <select
                  aria-label={`${key} wartość`}
                  multiple={isMembershipOperator}
                  value={isMembershipOperator ? conditionValues.map(String) : legacyValue}
                  onChange={event => isMembershipOperator
                    ? onChange({ ...value, [key]: { ...condition, value: Array.from(event.currentTarget.selectedOptions, option => option.value).filter(Boolean) } })
                    : updateValue(event.target.value)}
                >
                  {!isMembershipOperator && <option value="">Wybierz</option>}
                  {!options.includes(legacyValue) && legacyValue && <option value={legacyValue}>{legacyValue}</option>}
                  {options.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            )}
            {requiresValue && target?.fieldType === 'MULTI_SELECT' && (
              <label>Wartość
                <select
                  aria-label={`${key} wartość`}
                  multiple
                  value={Array.isArray(condition.value) ? condition.value.map(String) : legacyValue ? [legacyValue] : []}
                  onChange={event => {
                    const selected = Array.from(event.currentTarget.selectedOptions, option => option.value);
                    onChange({ ...value, [key]: { ...condition, value: selected } });
                  }}
                >
                  {options.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            )}
            {requiresValue && target?.fieldType === 'NUMBER' && !isMembershipOperator && (
              <label>Wartość
                <input type="number" aria-label={`${key} wartość`} value={typeof condition.value === 'number' ? condition.value : ''} onChange={event => updateValue(event.target.value)} />
              </label>
            )}
            {requiresValue && target?.fieldType === 'NUMBER' && isMembershipOperator && (
              <fieldset className="form-builder__condition-values">
                <legend>Wartości</legend>
                {conditionValues.map((item, index) => (
                  <div className="form-builder__condition-value" key={index}>
                    <input type="number" aria-label={`${key} wartość ${index + 1}`} value={typeof item === 'number' ? item : ''} onChange={event => updateValueList(conditionValues.map((current, currentIndex) => currentIndex === index ? event.target.value : String(current)))} />
                    <button type="button" className="btn btn-secondary" aria-label={`Usuń wartość ${index + 1}`} onClick={() => updateValueList(conditionValues.filter((_, currentIndex) => currentIndex !== index).map(String))}>Usuń</button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary" onClick={() => updateValueList([...conditionValues.map(String), '0'])}>+ Dodaj wartość</button>
              </fieldset>
            )}
            {requiresValue && (!target || !['CHECKBOX', 'PASS_FAIL', 'SELECT', 'RADIO', 'MULTI_SELECT', 'NUMBER'].includes(target.fieldType)) && !isMembershipOperator && (
              <label>Wartość
                <input aria-label={`${key} wartość`} value={legacyValue} onChange={event => updateValue(event.target.value)} />
              </label>
            )}
            {requiresValue && (!target || !['CHECKBOX', 'PASS_FAIL', 'SELECT', 'RADIO', 'MULTI_SELECT', 'NUMBER'].includes(target.fieldType)) && isMembershipOperator && (
              <fieldset className="form-builder__condition-values">
                <legend>Wartości</legend>
                {conditionValues.map((item, index) => (
                  <div className="form-builder__condition-value" key={index}>
                    <input aria-label={`${key} wartość ${index + 1}`} value={String(item ?? '')} onChange={event => updateValueList(conditionValues.map((current, currentIndex) => currentIndex === index ? event.target.value : String(current)))} />
                    <button type="button" className="btn btn-secondary" aria-label={`Usuń wartość ${index + 1}`} onClick={() => updateValueList(conditionValues.filter((_, currentIndex) => currentIndex !== index).map(String))}>Usuń</button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary" onClick={() => updateValueList([...conditionValues.map(String), ''])}>+ Dodaj wartość</button>
              </fieldset>
            )}
            <button
              type="button"
              className="btn btn-secondary form-builder__small-button"
              aria-label={`Usuń warunek ${key}`}
              onClick={() => {
                const next = { ...value };
                delete next[key];
                onChange(next);
              }}
            >
              Usuń
            </button>
          </div>
        );
      })}
    </fieldset>
  );
};

export const FormBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { templates, loading, error: listError, reload } = useFormTemplates();
  const canCreate = hasPermission('forms', 'create');
  const canUpdate = hasPermission('forms', 'update');
  const canPublish = hasPermission('forms', 'publish');
  const canAssign = hasPermission('forms', 'assign');
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [version, setVersion] = useState<FormVersion | null>(null);
  const [versions, setVersions] = useState<FormVersionSummary[]>([]);
  const [sections, setSections] = useState<DefinitionSection[]>([]);
  const [tab, setTab] = useState<BuilderTab>('builder');
  const [previewTaskSearch, setPreviewTaskSearch] = useState('');
  const [previewTasks, setPreviewTasks] = useState<Task[]>([]);
  const [previewTaskId, setPreviewTaskId] = useState('');
  const [previewValues, setPreviewValues] = useState<Record<string, unknown>>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewTaskError, setPreviewTaskError] = useState('');
  const [rules, setRules] = useState<FormAssignmentRule[]>([]);
  const [assignmentUsers, setAssignmentUsers] = useState<FormUserOption[]>([]);
  const [assignmentTeams, setAssignmentTeams] = useState<FormTeamOption[]>([]);
  const [assignmentLookupsLoading, setAssignmentLookupsLoading] = useState(false);
  const [assignmentLookupErrors, setAssignmentLookupErrors] = useState({ users: '', teams: '' });
  const [assignmentUserSearch, setAssignmentUserSearch] = useState('');
  const [assignmentTeamSearch, setAssignmentTeamSearch] = useState('');
  const [assignmentTriggerSearch, setAssignmentTriggerSearch] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [systemDataSources, setSystemDataSources] = useState<VariableEngineVariable[]>([]);
  const [systemDataSourceError, setSystemDataSourceError] = useState('');
  const [brandingItems, setBrandingItems] = useState<FormBranding[]>([]);
  const [brandingError, setBrandingError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorFieldKey, setErrorFieldKey] = useState<string>();
  const [autoSectionKeys, setAutoSectionKeys] = useState<Set<string>>(new Set());
  const [autoFieldKeys, setAutoFieldKeys] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    key: '', name: '', description: '', kind: 'FORM' as FormKind,
    procedureType: 'CABINET_PREFABRICATION' as FormProcedureType,
  });
  const [ruleForm, setRuleForm] = useState({
    assignedUserId: '', assignedTeamId: '', triggerId: '', priority: '0', conditions: {} as Record<string, FormCondition>,
  });

  useEffect(() => {
    let cancelled = false;
    variableEngineService.listVariables().then(variables => {
      if (!cancelled) setSystemDataSources(variables.filter(variable => variable.usableInForms));
    }).catch(() => {
      if (!cancelled) setSystemDataSourceError('Nie udało się pobrać źródeł danych systemowych.');
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    formsService.listBranding().then(items => {
      if (!cancelled) setBrandingItems(items);
    }).catch(() => {
      if (!cancelled) setBrandingError('Nie udało się pobrać biblioteki nagłówków i stopek.');
    });
    return () => { cancelled = true; };
  }, []);

  const readOnly = !canUpdate || version?.status !== 'DRAFT';
  const currentVersionId = version?.id;
  const conditionFields = useMemo(() => sections.flatMap(section => section.fields), [sections]);
  const draftDefinitionError = useMemo(() => definitionError(sections), [sections]);
  const showError = useCallback((error: unknown) => {
    const result = readError(error);
    setMessage(result.message);
    setErrorFieldKey(result.fieldKey);
  }, []);

  const loadVersion = useCallback(async (selected: FormTemplate, versionId: number) => {
    setLoadingDetail(true);
    setMessage('');
    try {
      const [nextVersion, nextVersions] = await Promise.all([
        formsService.getVersion(versionId),
        formsService.listVersions(selected.id),
      ]);
      setSelectedTemplate(selected);
      setVersion(nextVersion);
      setVersions(nextVersions.items);
      setSections(templateSections(nextVersion));
      setAutoSectionKeys(new Set());
      setAutoFieldKeys(new Set());
      setPreviewTaskId('');
      setPreviewTaskSearch('');
      setErrorFieldKey(undefined);
      setTab('builder');
    } catch (error) {
      showError(error);
    } finally {
      setLoadingDetail(false);
    }
  }, [showError]);

  const openTemplate = async (template: FormTemplate) => {
    setLoadingDetail(true);
    setMessage('');
    try {
      const result = await formsService.listVersions(template.id);
      setSelectedTemplate(template);
      setVersions(result.items);
      const chosen = result.items.find(item => item.status === 'DRAFT') || result.items[0];
      if (chosen) {
        await loadVersion(template, chosen.id);
      } else {
        setVersion(null);
        setSections([]);
        setTab('versions');
      }
    } catch (error) {
      showError(error);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (!version) {
      setRules([]);
      return;
    }
    let cancelled = false;
    formsService.listAssignmentRules(version.id).then(result => {
      if (!cancelled) setRules(result);
    }).catch(error => {
      if (!cancelled) showError(error);
    });
    return () => { cancelled = true; };
  }, [showError, version]);

  useEffect(() => {
    if (!currentVersionId || tab !== 'rules') return;
    let cancelled = false;
    setAssignmentLookupsLoading(true);
    setAssignmentLookupErrors({ users: '', teams: '' });
    const timer = window.setTimeout(() => {
      Promise.allSettled([
        formsService.listAssignmentUsers(assignmentUserSearch),
        formsService.listAssignmentTeams(),
      ]).then(([usersResult, teamsResult]) => {
        if (cancelled) return;
        if (usersResult.status === 'fulfilled') setAssignmentUsers(usersResult.value);
        else setAssignmentLookupErrors(current => ({ ...current, users: 'Nie udało się pobrać listy użytkowników. Sprawdź uprawnienie users.read.' }));
        if (teamsResult.status === 'fulfilled') setAssignmentTeams(teamsResult.value);
        else setAssignmentLookupErrors(current => ({ ...current, teams: 'Nie udało się pobrać listy brygad. Sprawdź uprawnienie brigades.read.' }));
      }).finally(() => {
        if (!cancelled) setAssignmentLookupsLoading(false);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [assignmentUserSearch, currentVersionId, tab]);

  useEffect(() => {
    const search = previewTaskSearch.trim();
    if (tab !== 'preview' || !search) {
      setPreviewTasks([]);
      setPreviewTaskError('');
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setPreviewTaskError('');
      taskService.getAll({ search, page: 1, limit: 20 }).then(result => {
        if (!cancelled) setPreviewTasks(result.data);
      }).catch(() => {
        if (!cancelled) setPreviewTaskError('Nie udało się wyszukać zadań.');
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [previewTaskSearch, tab]);

  useEffect(() => {
    if (!version || tab !== 'preview') return;
    const selectedTask = previewTasks.find(task => String(task.id) === previewTaskId);
    if (!selectedTask) {
      setPreviewValues(samplePreviewValues(version));
      setPreviewError('');
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewValues({});
    formsService.previewVersion(version.id, selectedTask.id).then(values => {
      if (!cancelled) setPreviewValues(values);
    }).catch(() => {
      if (!cancelled) setPreviewError('Nie udało się pobrać danych podglądu dla zadania.');
    }).finally(() => {
      if (!cancelled) setPreviewLoading(false);
    });
    return () => { cancelled = true; };
  }, [previewTaskId, previewTasks, tab, version]);

  const createTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const template = await formsService.createTemplate({
        ...templateForm,
        key: templateForm.key.trim().toUpperCase(),
        name: templateForm.name.trim(),
        description: templateForm.description.trim() || undefined,
      });
      await reload();
      setCreateOpen(false);
      const draft = await formsService.createDraft(template.id);
      await loadVersion(template, draft.id);
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    if (!version) return;
    if (draftDefinitionError) {
      setMessage(draftDefinitionError);
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const updated = await formsService.updateDraft(version.id, draftInput(version, sections));
      await loadVersion(selectedTemplate!, updated.id);
      setMessage('Wersja robocza została zapisana.');
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!version) return;
    if (draftDefinitionError) {
      setMessage(draftDefinitionError);
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await formsService.updateDraft(version.id, draftInput(version, sections));
      const published = await formsService.publishVersion(version.id);
      await loadVersion(selectedTemplate!, published.id);
      setMessage('Wersja została opublikowana.');
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  };

  const createNextVersion = async (sourceVersionId: number) => {
    if (!selectedTemplate) return;
    setSaving(true);
    setMessage('');
    try {
      const draft = await formsService.createNextVersion(sourceVersionId);
      await loadVersion(selectedTemplate, draft.id);
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  };

  const changeSection = (index: number, update: Partial<DefinitionSection>) =>
    setSections(current => current.map((section, sectionIndex) => sectionIndex === index ? { ...section, ...update } : section));

  const changeSectionTitle = (index: number, title: string) => {
    const section = sections[index];
    if (!section || !autoSectionKeys.has(section.key)) {
      changeSection(index, { title });
      return;
    }
    const key = uniqueKey(keyFromLabel(title), sections.filter((_, sectionIndex) => sectionIndex !== index).map(item => item.key));
    setAutoSectionKeys(current => new Set([...Array.from(current).filter(value => value !== section.key), key]));
    changeSection(index, { title, key });
  };

  const changeSectionKey = (index: number, key: string) => {
    const previousKey = sections[index]?.key;
    if (previousKey) {
      setAutoSectionKeys(current => new Set(Array.from(current).filter(value => value !== previousKey)));
    }
    changeSection(index, { key });
  };

  const changeField = (sectionIndex: number, fieldIndex: number, update: Partial<FormField>) =>
    setSections(current => current.map((section, currentSectionIndex) => currentSectionIndex === sectionIndex
      ? { ...section, fields: section.fields.map((field, currentFieldIndex) => currentFieldIndex === fieldIndex ? { ...field, ...update } : field) }
      : section));

  const changeFieldLabel = (sectionIndex: number, fieldIndex: number, label: string) => {
    const field = sections[sectionIndex]?.fields[fieldIndex];
    if (!field || !autoFieldKeys.has(field.key)) {
      changeField(sectionIndex, fieldIndex, { label });
      return;
    }
    const used = sections.flatMap(section => section.fields.map(item => item.key)).filter(key => key !== field.key);
    const key = uniqueKey(keyFromLabel(label), used);
    setAutoFieldKeys(current => new Set([...Array.from(current).filter(value => value !== field.key), key]));
    changeField(sectionIndex, fieldIndex, { label, key });
  };

  const changeFieldKey = (sectionIndex: number, fieldIndex: number, key: string) => {
    const previousKey = sections[sectionIndex]?.fields[fieldIndex]?.key;
    if (previousKey) {
      setAutoFieldKeys(current => new Set(Array.from(current).filter(value => value !== previousKey)));
    }
    changeField(sectionIndex, fieldIndex, { key });
  };

  const reorder = (items: DefinitionSection[], event: DragEndEvent): DefinitionSection[] => {
    if (!event.over || event.active.id === event.over.id) return items;
    const from = items.findIndex(item => item.key === event.active.id);
    const to = items.findIndex(item => item.key === event.over?.id);
    return from < 0 || to < 0 ? items : reindex(moveItem(items, from, to));
  };

  const reorderFields = (sectionIndex: number, event: DragEndEvent) => {
    setSections(current => current.map((section, index) => {
      if (sectionIndex !== index || !event.over || event.active.id === event.over.id) return section;
      const from = section.fields.findIndex(field => field.key === event.active.id);
      const to = section.fields.findIndex(field => field.key === event.over?.id);
      return from < 0 || to < 0 ? section : { ...section, fields: reindex(moveItem(section.fields, from, to)) };
    }));
  };

  const saveRules = async () => {
    if (!version) return;
    setSaving(true);
    setMessage('');
    try {
      const saved = await formsService.replaceAssignmentRules(version.id, rules);
      setRules(saved);
      setMessage('Reguły przypisań zostały zapisane.');
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  };

  const addRule = (event: React.FormEvent) => {
    event.preventDefault();
    setRules(current => [...current, {
      assignedUserId: ruleForm.assignedUserId ? Number(ruleForm.assignedUserId) : null,
      assignedTeamId: ruleForm.assignedTeamId ? Number(ruleForm.assignedTeamId) : null,
      triggerId: ruleForm.triggerId ? Number(ruleForm.triggerId) : null,
      priority: Number(ruleForm.priority) || 0,
      active: true,
      conditions: ruleForm.conditions.when ? { when: ruleForm.conditions.when } : {},
    }]);
    setRuleForm({ assignedUserId: '', assignedTeamId: '', triggerId: '', priority: '0', conditions: {} });
  };

  const addField = (sectionIndex: number) => {
    const section = sections[sectionIndex];
    if (!section) return;
    const field = emptyField(section.fields.length);
    const key = uniqueKey(keyFromLabel(field.label), sections.flatMap(item => item.fields.map(itemField => itemField.key)));
    setAutoFieldKeys(current => new Set([...current, key]));
    setSections(current => current.map((item, index) => index === sectionIndex
      ? { ...item, fields: [...item.fields, { ...field, key }] }
      : item));
  };

  const duplicateField = (sectionIndex: number, fieldIndex: number) => {
    const section = sections[sectionIndex];
    const original = section?.fields[fieldIndex];
    if (!section || !original) return;
    const label = `${original.label} (kopia)`;
    const key = uniqueKey(keyFromLabel(label), sections.flatMap(item => item.fields.map(field => field.key)));
    setAutoFieldKeys(current => new Set([...current, key]));
    setSections(current => current.map((item, index) => index === sectionIndex
      ? { ...item, fields: [...item.fields, { ...original, key, label, sortOrder: item.fields.length }] }
      : item));
  };

  const tabs: Array<{ id: BuilderTab; label: string }> = [
    { id: 'builder', label: 'Edytor' },
    { id: 'versions', label: 'Wersje' },
    { id: 'preview', label: 'Podgląd' },
    { id: 'rules', label: 'Przypisania i reguły' },
  ];

  return (
    <main className="form-builder">
      <header className="form-builder__header">
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin')}>← Panel administratora</button>
        <div className="form-builder__heading">
          <div>
            <h1>Edytor formularzy</h1>
            <p>Definicje formularzy i checklist — wersjonowane przez istniejące API.</p>
          </div>
          {canCreate && !selectedTemplate && (
            <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(open => !open)}>
              {createOpen ? 'Anuluj' : '+ Nowy formularz'}
            </button>
          )}
        </div>
      </header>

      {message && <div className={`form-builder__notice${errorFieldKey ? ' form-builder__notice--error' : ''}`} role={errorFieldKey ? 'alert' : 'status'}>{message}</div>}
      {listError && <div className="form-builder__notice form-builder__notice--error" role="alert">{listError}</div>}

      {createOpen && (
        <form className="form-builder__card form-builder__create" onSubmit={createTemplate}>
          <h2>Nowy formularz</h2>
            <label>Nazwa <input required maxLength={255} value={templateForm.name} onChange={event => {
              const name = event.target.value;
              setTemplateForm(current => ({
                ...current,
                name,
                key: uniqueKey(keyFromLabel(name), templates.map(item => item.key)),
              }));
            }} /></label>
            <label>Opis <textarea value={templateForm.description} onChange={event => setTemplateForm({ ...templateForm, description: event.target.value })} /></label>
          <label>Typ <select value={templateForm.kind} onChange={event => setTemplateForm({ ...templateForm, kind: event.target.value as FormKind })}>
            <option value="FORM">Formularz</option><option value="CHECKLIST">Checklista</option>
          </select></label>
          <label>Procedura <select value={templateForm.procedureType} onChange={event => setTemplateForm({ ...templateForm, procedureType: event.target.value as FormProcedureType })}>
            {PROCEDURES.map(procedure => <option value={procedure.value} key={procedure.value}>{procedure.label}</option>)}
          </select></label>
          <details className="form-builder__advanced form-builder__create-advanced">
            <summary>Zaawansowane</summary>
            <label>Klucz techniczny
              <input required pattern="[A-Za-z0-9_-]+" maxLength={100} value={templateForm.key} onChange={event => setTemplateForm({ ...templateForm, key: event.target.value })} />
            </label>
          </details>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Tworzenie…' : 'Utwórz draft'}</button>
        </form>
      )}

      {!selectedTemplate ? (
        <section aria-labelledby="form-list-heading">
          <h2 id="form-list-heading">Formularze</h2>
          {loading ? <p role="status">Ładowanie formularzy…</p> : templates.length === 0 ? (
            <div className="form-builder__empty">
              <h3>Brak formularzy</h3>
              <p>Utwórz formularz lub checklistę, aby rozpocząć pracę nad wersją roboczą.</p>
            </div>
          ) : (
            <div className="form-builder__template-list">
              {templates.map(template => (
                <button type="button" className="form-builder__template" key={template.id} onClick={() => void openTemplate(template)}>
                  <span><strong>{template.name}</strong><small>{template.key} · {template.kind} · {procedureLabel(template.procedureType)}</small></span>
                  <span aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section>
          <div className="form-builder__selected">
            <button type="button" className="btn btn-secondary" onClick={() => { setSelectedTemplate(null); setVersion(null); setMessage(''); }}>← Lista formularzy</button>
            <div>
              <h2>{selectedTemplate.name}</h2>
              <p>{selectedTemplate.key} · {selectedTemplate.kind} · {procedureLabel(selectedTemplate.procedureType)}</p>
            </div>
            {version && <span className={`form-builder__status form-builder__status--${version.status.toLowerCase()}`}>{version.status} · v{version.version}</span>}
          </div>
          <nav className="form-builder__tabs" aria-label="Widoki formularza">
            {tabs.map(item => <button type="button" key={item.id} className={tab === item.id ? 'is-active' : ''} aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}>{item.label}</button>)}
          </nav>
          {loadingDetail ? <p role="status">Ładowanie definicji…</p> : !version ? (
            <div className="form-builder__empty">
              <h3>Brak wersji</h3>
              <p>Utwórz pierwszą wersję roboczą dla tego formularza.</p>
              {canCreate && <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void (async () => {
                if (!selectedTemplate) return;
                setSaving(true);
                try { const draft = await formsService.createDraft(selectedTemplate.id); await loadVersion(selectedTemplate, draft.id); }
                catch (error) { showError(error); }
                finally { setSaving(false); }
              })()}>Utwórz draft</button>}
            </div>
          ) : tab === 'builder' ? (
            <div className="form-builder__workspace">
              <div className="form-builder__toolbar">
                <span>{readOnly ? 'Wersja tylko do odczytu' : 'Edycja wersji roboczej'}</span>
                <div>
                  {version.status === 'PUBLISHED' && canCreate && <button className="btn btn-secondary" disabled={saving} onClick={() => void createNextVersion(version.id)}>Nowa wersja</button>}
                  {canUpdate && version.status === 'DRAFT' && <button className="btn btn-secondary" disabled={saving || Boolean(draftDefinitionError)} onClick={() => void saveDraft()}>{saving ? 'Zapisywanie…' : 'Zapisz draft'}</button>}
                  {canPublish && version.status === 'DRAFT' && <button className="btn btn-primary" disabled={saving || Boolean(draftDefinitionError)} onClick={() => void publish()}>{saving ? 'Publikowanie…' : 'Publikuj wersję'}</button>}
                </div>
              </div>
              {draftDefinitionError && <p className="form-builder__notice form-builder__notice--error" role="alert">{draftDefinitionError}</p>}
              <label className="form-builder__title-input">Tytuł wersji
                <input value={version.title} disabled={readOnly} onChange={event => setVersion({ ...version, title: event.target.value })} />
              </label>
              <label className="form-builder__title-input">Opis wersji
                <textarea value={version.description || ''} disabled={readOnly} onChange={event => setVersion({ ...version, description: event.target.value })} />
              </label>
              <section className="form-builder__branding" aria-labelledby="form-branding-heading">
                <div className="form-builder__section-actions">
                  <h3 id="form-branding-heading">Nagłówek i stopka</h3>
                  {canUpdate && <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/forms/branding')}>Biblioteka brandingu</button>}
                </div>
                {brandingError && <p className="form-builder__notice form-builder__notice--error" role="alert">{brandingError}</p>}
                {(['HEADER', 'FOOTER'] as const).map(kind => {
                  const key = kind === 'HEADER' ? 'headerId' : 'footerId';
                  const title = kind === 'HEADER' ? 'Nagłówek' : 'Stopka';
                  const selected = brandingItems.find(item => item.id === version[key])
                    ?? (kind === 'HEADER' ? version.headerSnapshot : version.footerSnapshot);
                  return <div className="form-builder__branding-choice" key={kind}>
                    <label>{title}
                      <select
                        value={version[key] ?? ''}
                        disabled={readOnly}
                        onChange={event => setVersion({
                          ...version,
                          [key]: event.target.value ? Number(event.target.value) : null,
                        })}
                      >
                        <option value="">Domyślny element (jeśli ustawiony)</option>
                        {brandingItems.filter(item => item.kind === kind).map(item => (
                          <option value={item.id} key={item.id}>{item.name}{item.isDefault ? ' · domyślny' : ''}</option>
                        ))}
                      </select>
                    </label>
                    <FormBrandingPreview snapshot={selected} compact />
                  </div>;
                })}
              </section>
              <div className="form-builder__section-actions">
                <h3>Sekcje</h3>
                {!readOnly && <button type="button" className="btn btn-secondary" onClick={() => {
                  const section = emptySection(sections.length);
                  const key = uniqueKey(keyFromLabel(section.title), sections.map(item => item.key));
                  setAutoSectionKeys(current => new Set([...current, key]));
                  setSections(current => [...current, { ...section, key }]);
                }}>+ Dodaj sekcję</button>}
              </div>
              {sections.length === 0 && <p className="form-builder__hint">Dodaj sekcję, aby rozpocząć budowanie formularza.</p>}
              <DndContext sensors={sensors} onDragEnd={event => setSections(current => reorder(current, event))}>
                <div className="form-builder__sections">
                  {sections.map((section, sectionIndex) => (
                    <DragHandle key={section.key} id={section.key} label={section.title} disabled={readOnly}>
                      <article className="form-builder__section">
                        <div className="form-builder__section-head">
                          <label>Nazwa sekcji
                            <input value={section.title} disabled={readOnly} onChange={event => changeSectionTitle(sectionIndex, event.target.value)} />
                          </label>
                          {!readOnly && <button type="button" className="btn btn-secondary" aria-label={`Usuń sekcję ${section.title}`} onClick={() => setSections(current => current.filter((_, index) => index !== sectionIndex))}>Usuń sekcję</button>}
                        </div>
                        <details className="form-builder__advanced">
                          <summary>Zaawansowane</summary>
                          <label>Klucz techniczny sekcji
                            <input value={section.key} disabled={readOnly} onChange={event => changeSectionKey(sectionIndex, event.target.value)} />
                          </label>
                        </details>
                        <label>Opis
                          <input value={section.description || ''} disabled={readOnly} onChange={event => changeSection(sectionIndex, { description: event.target.value })} />
                        </label>
                        <ConditionEditor value={section.conditions} fields={conditionFields} section disabled={readOnly} onChange={conditions => changeSection(sectionIndex, { conditions })} />
                        <div className="form-builder__section-actions">
                          <h4>Pola ({section.fields.length})</h4>
                          {!readOnly && <button type="button" className="btn btn-secondary" onClick={() => addField(sectionIndex)}>+ Dodaj pole</button>}
                        </div>
                        <DndContext sensors={sensors} onDragEnd={event => reorderFields(sectionIndex, event)}>
                          <div className="form-builder__fields">
                            {section.fields.map((field, fieldIndex) => (
                              <DragHandle key={field.key} id={field.key} label={field.label} disabled={readOnly}>
                                <FieldEditor
                                  field={field}
                                  index={fieldIndex}
                                  fields={conditionFields}
                                  dataSources={systemDataSources}
                                  dataSourceError={systemDataSourceError}
                                  disabled={readOnly}
                                  error={errorFieldKey === field.key ? message : ''}
                                  onLabelChange={label => changeFieldLabel(sectionIndex, fieldIndex, label)}
                                  onKeyChange={key => changeFieldKey(sectionIndex, fieldIndex, key)}
                                  onChange={update => changeField(sectionIndex, fieldIndex, update)}
                                  onDuplicate={() => duplicateField(sectionIndex, fieldIndex)}
                                  onDelete={() => changeSection(sectionIndex, { fields: section.fields.filter((_, index) => index !== fieldIndex) })}
                                />
                              </DragHandle>
                            ))}
                          </div>
                        </DndContext>
                      </article>
                    </DragHandle>
                  ))}
                </div>
              </DndContext>
            </div>
          ) : tab === 'versions' ? (
            <div className="form-builder__card">
              <h3>Wersje</h3>
              {versions.length === 0 ? <p>Ten formularz nie ma jeszcze wersji.</p> : versions.map(item => (
                <div className="form-builder__version-row" key={item.id}>
                  <span><strong>v{item.version}</strong> · {item.status} · {item.title}</span>
                  <div>
                    <button type="button" className="btn btn-secondary" onClick={() => selectedTemplate && void loadVersion(selectedTemplate, item.id)}>Otwórz</button>
                    {item.status === 'PUBLISHED' && canCreate && <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void createNextVersion(item.id)}>Utwórz kolejną wersję</button>}
                  </div>
                </div>
              ))}
            </div>
          ) : tab === 'preview' ? (
            <div className="form-builder__preview">
              <p className="form-builder__hint">Podgląd wersji roboczej w trybie tylko do odczytu. Bez wybranego zadania pola systemowe i tabela BOM pokazują dane przykładowe.</p>
              <div className="form-builder__task-preview">
                <label>Wyszukaj zadanie po numerze
                  <input
                    type="search"
                    value={previewTaskSearch}
                    onChange={event => {
                      setPreviewTaskSearch(event.target.value);
                      setPreviewTaskId('');
                    }}
                    placeholder="np. Z00011026"
                  />
                </label>
                <label>Zadanie
                  <select
                    aria-label="Zadanie do podglądu"
                    value={previewTaskId}
                    onChange={event => setPreviewTaskId(event.target.value)}
                  >
                    <option value="">Dane przykładowe</option>
                    {previewTasks.map(task => (
                      <option key={task.id} value={task.id}>{task.taskNumber} — {task.title}</option>
                    ))}
                  </select>
                </label>
              </div>
              {previewTaskError && <p className="form-builder__notice form-builder__notice--error" role="alert">{previewTaskError}</p>}
              {previewError && <p className="form-builder__notice form-builder__notice--error" role="alert">{previewError}</p>}
              {previewLoading && <p role="status">Pobieranie danych zadania…</p>}
              <DynamicFormRenderer versionId={version.id} initialValues={previewValues} disabled />
            </div>
          ) : (
            <div className="form-builder__card">
              <div className="form-builder__section-actions">
                <div>                <h3>Przypisania i reguły</h3><p>Konfiguracja reguł przypisań. Automatyczne wykonywanie należy do etapu 8.</p></div>
                {canAssign && version.status === 'DRAFT' && <button className="btn btn-primary" disabled={saving} onClick={() => void saveRules()}>{saving ? 'Zapisywanie…' : 'Zapisz reguły'}</button>}
              </div>
              {rules.length === 0 && <p>Brak reguł przypisań.</p>}
              <div className="form-builder__rules">
                {rules.map((rule, index) => (
                  <div className="form-builder__rule" key={rule.id ?? `${rule.priority}-${index}`}>
                    <span>Priorytet {rule.priority} · {rule.active ? 'aktywna' : 'nieaktywna'} · użytkownik: {assignmentUsers.find(user => user.id === rule.assignedUserId)?.firstName
                      ? `${assignmentUsers.find(user => user.id === rule.assignedUserId)?.firstName} ${assignmentUsers.find(user => user.id === rule.assignedUserId)?.lastName}`
                      : rule.assignedUserId ? `ID ${rule.assignedUserId}` : '—'} · brygada: {assignmentTeams.find(team => team.id === rule.assignedTeamId)?.name
                      || (rule.assignedTeamId ? `ID ${rule.assignedTeamId}` : '—')} · trigger: {version.triggers?.find(trigger => trigger.id === rule.triggerId)?.eventType
                      || (rule.triggerId ? `ID ${rule.triggerId}` : '—')}</span>
                    {canAssign && version.status === 'DRAFT' && <button className="btn btn-secondary" aria-label={`Usuń regułę ${index + 1}`} onClick={() => setRules(current => current.filter((_, ruleIndex) => ruleIndex !== index))}>Usuń</button>}
                  </div>
                ))}
              </div>
              {canAssign && version.status === 'DRAFT' && (
                <form className="form-builder__rule-form" onSubmit={addRule}>
                  <h4>Dodaj regułę</h4>
                  <label>Szukaj użytkownika <input type="search" value={assignmentUserSearch} onChange={event => setAssignmentUserSearch(event.target.value)} /></label>
                  <label>Użytkownik <select value={ruleForm.assignedUserId} disabled={assignmentLookupsLoading} onChange={event => setRuleForm({ ...ruleForm, assignedUserId: event.target.value })}>
                    <option value="">{assignmentLookupsLoading ? 'Ładowanie…' : 'Nie przypisuj użytkownika'}</option>
                    {assignmentUsers.map(user => <option value={user.id} key={user.id}>{user.firstName} {user.lastName} ({user.username})</option>)}
                  </select></label>
                  <label>Szukaj brygady <input type="search" value={assignmentTeamSearch} onChange={event => setAssignmentTeamSearch(event.target.value)} /></label>
                  <label>Brygada <select value={ruleForm.assignedTeamId} disabled={assignmentLookupsLoading} onChange={event => setRuleForm({ ...ruleForm, assignedTeamId: event.target.value })}>
                    <option value="">{assignmentLookupsLoading ? 'Ładowanie…' : 'Nie przypisuj brygady'}</option>
                    {assignmentTeams.filter(team => `${team.name} ${team.code}`.toLocaleLowerCase().includes(assignmentTeamSearch.toLocaleLowerCase())).map(team => <option value={team.id} key={team.id}>{team.name} ({team.code})</option>)}
                  </select></label>
                  <label>Szukaj triggera <input type="search" value={assignmentTriggerSearch} onChange={event => setAssignmentTriggerSearch(event.target.value)} /></label>
                  <label>Trigger wersji (opcjonalnie) <select value={ruleForm.triggerId} onChange={event => setRuleForm({ ...ruleForm, triggerId: event.target.value })}>
                    <option value="">Bez triggera</option>
                    {(version.triggers || []).filter(trigger => trigger.eventType.toLocaleLowerCase().includes(assignmentTriggerSearch.toLocaleLowerCase())).map(trigger => <option value={trigger.id} key={trigger.id}>{trigger.eventType}{trigger.active ? '' : ' (nieaktywny)'}</option>)}
                  </select></label>
                  <label>Priorytet <input type="number" value={ruleForm.priority} onChange={event => setRuleForm({ ...ruleForm, priority: event.target.value })} /></label>
                  <ConditionEditor
                    value={ruleForm.conditions}
                    fields={conditionFields}
                    conditionKeys={['when']}
                    disabled={false}
                    onChange={conditions => setRuleForm(current => ({ ...current, conditions }))}
                  />
                  {assignmentLookupErrors.users && <p className="form-builder__notice form-builder__notice--error" role="alert">{assignmentLookupErrors.users}</p>}
                  {assignmentLookupErrors.teams && <p className="form-builder__notice form-builder__notice--error" role="alert">{assignmentLookupErrors.teams}</p>}
                  <button className="btn btn-secondary" disabled={!ruleForm.assignedUserId && !ruleForm.assignedTeamId}>Dodaj regułę</button>
                </form>
              )}
              {!canAssign && <p className="form-builder__hint">Do edycji reguł wymagane jest uprawnienie forms.assign.</p>}
            </div>
          )}
        </section>
      )}
    </main>
  );
};

const FieldEditor: React.FC<{
  field: FormField;
  index: number;
  fields: FormField[];
  dataSources: VariableEngineVariable[];
  dataSourceError: string;
  disabled: boolean;
  error: string;
  onLabelChange: (label: string) => void;
  onKeyChange: (key: string) => void;
  onChange: (update: Partial<FormField>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}> = ({
  field, index, fields, dataSources, dataSourceError, disabled, error,
  onLabelChange, onKeyChange, onChange, onDuplicate, onDelete,
}) => {
  const optionValues = Array.isArray(field.options.values)
    ? field.options.values.filter((option): option is string => typeof option === 'string')
    : [];
  const validationMin = typeof field.validation.min === 'number' ? field.validation.min : '';
  const validationMax = typeof field.validation.max === 'number' ? field.validation.max : '';
  const updateOptions = (values: string[]) => onChange({ options: { ...field.options, values } });
  const bomColumns = ['plannedQty', 'installedQty', 'installed', 'note'] as const;
  const selectedBomColumns = Array.isArray(field.options.columns)
    ? field.options.columns.filter((column): column is typeof bomColumns[number] =>
      typeof column === 'string' && bomColumns.includes(column as typeof bomColumns[number]))
    : [...bomColumns];
  const bomColumnLabels: Record<typeof bomColumns[number], string> = {
    plannedQty: 'Ilość planowana',
    installedQty: 'Ilość zamontowana',
    installed: 'Zainstalowane',
    note: 'Uwagi',
  };
  const moveOption = (from: number, to: number) => updateOptions(moveItem(optionValues, from, to));
  const fieldTypeLabel = (type: string) => FIELD_TYPES.find(item => item.value === type)?.label || type;
  const groupedDataSources = [...new Set(dataSources.map(source => source.group || source.provider))].map(group => ({
    group,
    sources: dataSources.filter(source => (source.group || source.provider) === group),
  }));
  const selectedDataSource = dataSources.find(source => source.expression === field.options.source);
  const selectedGroup = selectedDataSource?.group || selectedDataSource?.provider || groupedDataSources[0]?.group || '';
  const sourcesInGroup = groupedDataSources.find(item => item.group === selectedGroup)?.sources || [];
  return (
    <fieldset className="form-builder__field">
      <legend>{field.label || `Pole ${index + 1}`}</legend>
      <div className="form-builder__field-grid">
        <label>Etykieta <input value={field.label} disabled={disabled} onChange={event => onLabelChange(event.target.value)} /></label>
        <label>Typ <select value={field.fieldType} disabled={disabled} onChange={event => {
          if (event.target.value === 'DATA') {
            const source = dataSources[0];
            onChange({
              fieldType: 'DATA',
              options: { source: source?.expression || '', mode: 'readonly', valueType: source?.type || 'string' },
            });
          } else if (event.target.value === 'BOM_TABLE') {
            onChange({
              fieldType: 'BOM_TABLE',
              options: { columns: [...bomColumns] },
            });
          } else {
            onChange({ fieldType: event.target.value });
          }
        }}>
          {field.fieldType === 'STRING' && <option value="STRING">Tekst (starszy typ)</option>}
          {FIELD_TYPES.map(type => <option value={type.value} key={type.value}>{type.label}</option>)}
        </select></label>
        <label className="form-builder__checkbox"><input type="checkbox" checked={field.required} disabled={disabled} onChange={event => onChange({ required: event.target.checked })} /> Wymagane</label>
        {field.fieldType === 'NUMBER' && (
          <>
            <label>Minimum <input type="number" value={validationMin} disabled={disabled} onChange={event => onChange({ validation: { ...field.validation, min: event.target.value === '' ? undefined : Number(event.target.value) } })} /></label>
            <label>Maksimum <input type="number" value={validationMax} disabled={disabled} onChange={event => onChange({ validation: { ...field.validation, max: event.target.value === '' ? undefined : Number(event.target.value) } })} /></label>
          </>
        )}
        {field.fieldType === 'DATA' ? (
          <fieldset className="form-builder__option-editor form-builder__wide" disabled={disabled}>
            <legend>Dane z systemu</legend>
            <label>Grupa
              <select
                value={selectedGroup}
                disabled={disabled || dataSources.length === 0}
                onChange={event => {
                  const source = groupedDataSources.find(item => item.group === event.target.value)?.sources[0];
                  if (source) onChange({ options: { ...field.options, source: source.expression, valueType: source.type } });
                }}
              >
                {groupedDataSources.map(({ group }) => <option key={group} value={group}>{group}</option>)}
              </select>
            </label>
            <label>Pole
              <select
                value={typeof field.options.source === 'string' ? field.options.source : ''}
                disabled={disabled || sourcesInGroup.length === 0}
                onChange={event => {
                  const source = sourcesInGroup.find(item => item.expression === event.target.value);
                  if (source) onChange({ options: { ...field.options, source: source.expression, valueType: source.type } });
                }}
              >
                {sourcesInGroup.map(source => (
                  <option key={source.expression} value={source.expression}>{source.label || source.description}</option>
                ))}
                {!selectedDataSource && typeof field.options.source === 'string' && field.options.source !== '' && (
                  <option value={field.options.source}>{field.options.source} (niedostępne)</option>
                )}
              </select>
            </label>
            {dataSourceError && <p className="form-builder__field-error" role="alert">{dataSourceError}</p>}
            {!dataSources.length && !dataSourceError && <p>Brak dostępnych źródeł danych systemowych.</p>}
            {selectedDataSource && <p>{selectedDataSource.description}</p>}
            <label>Tryb
              <select
                value={field.options.mode === 'prefill' ? 'prefill' : 'readonly'}
                disabled={disabled}
                onChange={event => onChange({ options: { ...field.options, mode: event.target.value } })}
              >
                <option value="readonly">Tylko do odczytu</option>
                <option value="prefill">Wartość początkowa (można zmienić)</option>
              </select>
            </label>
          </fieldset>
        ) : (
          <label>Jednostka <input value={typeof field.options.unit === 'string' ? field.options.unit : ''} disabled={disabled} onChange={event => onChange({ options: { ...field.options, unit: event.target.value } })} /></label>
        )}
        {field.fieldType === 'BOM_TABLE' && (
          <fieldset className="form-builder__option-editor form-builder__wide" disabled={disabled}>
            <legend>Kolumny tabeli BOM</legend>
            {bomColumns.map(column => (
              <label className="form-builder__checkbox" key={column}>
                <input
                  type="checkbox"
                  checked={selectedBomColumns.includes(column)}
                  disabled={selectedBomColumns.length === 1 && selectedBomColumns.includes(column)}
                  onChange={event => {
                    const nextColumns = event.target.checked
                      ? [...selectedBomColumns, column]
                      : selectedBomColumns.filter(item => item !== column);
                    onChange({ options: { ...field.options, columns: nextColumns } });
                  }}
                />
                {bomColumnLabels[column]}
              </label>
            ))}
            <label>Kategoria materiału (opcjonalnie)
              <input
                maxLength={100}
                value={typeof field.options.filter === 'string' ? field.options.filter : ''}
                onChange={event => onChange({
                  options: { ...field.options, filter: event.target.value || undefined },
                })}
              />
            </label>
          </fieldset>
        )}
        {['SELECT', 'RADIO', 'MULTI_SELECT'].includes(field.fieldType) && (
          <fieldset className="form-builder__option-editor form-builder__wide" disabled={disabled}>
            <legend>Opcje listy</legend>
            {optionValues.map((option, optionIndex) => (
              <div className="form-builder__option-row" key={`${optionIndex}-${option}`}>
                <label>Opcja {optionIndex + 1}
                  <input value={option} onChange={event => updateOptions(optionValues.map((item, index) => index === optionIndex ? event.target.value : item))} />
                </label>
                <button type="button" className="btn btn-secondary" aria-label={`Przesuń opcję ${optionIndex + 1} w górę`} disabled={optionIndex === 0} onClick={() => moveOption(optionIndex, optionIndex - 1)}>↑</button>
                <button type="button" className="btn btn-secondary" aria-label={`Przesuń opcję ${optionIndex + 1} w dół`} disabled={optionIndex === optionValues.length - 1} onClick={() => moveOption(optionIndex, optionIndex + 1)}>↓</button>
                <button type="button" className="btn btn-secondary" aria-label={`Usuń opcję ${optionIndex + 1}`} onClick={() => updateOptions(optionValues.filter((_, index) => index !== optionIndex))}>Usuń</button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={() => updateOptions([...optionValues, `Opcja ${optionValues.length + 1}`])}>+ Dodaj opcję</button>
          </fieldset>
        )}
      </div>
      <details className="form-builder__advanced">
        <summary>Zaawansowane</summary>
        <label>Klucz techniczny pola
          <input value={field.key} disabled={disabled} onChange={event => onKeyChange(event.target.value)} />
        </label>
        <span>Typ pola: {fieldTypeLabel(field.fieldType)}</span>
      </details>
      {error && <p className="form-builder__field-error" role="alert">{error}</p>}
      <ConditionEditor value={field.conditions} fields={fields} disabled={disabled} onChange={conditions => onChange({ conditions })} />
      {!disabled && <div className="form-builder__field-actions">
        <button type="button" className="btn btn-secondary" onClick={onDuplicate}>Kopiuj pole</button>
        <button type="button" className="btn btn-secondary" onClick={onDelete}>Usuń pole</button>
      </div>}
    </fieldset>
  );
};
