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
import { formsService, type UpdateFormDraftInput } from '../../services/forms.service';
import type {
  FormAssignmentRule,
  FormCondition,
  FormField,
  FormKind,
  FormProcedureType,
  FormSection,
  FormTemplate,
  FormVersion,
  FormVersionSummary,
} from '../../types/forms.types';
import './FormBuilderPage.css';

type BuilderTab = 'builder' | 'versions' | 'preview' | 'rules';
type DefinitionSection = FormSection & { id?: number };

const FIELD_TYPES = ['TEXT', 'STRING', 'TEXTAREA', 'EMAIL', 'DATE', 'SELECT', 'RADIO', 'NUMBER', 'PASS_FAIL', 'CHECKBOX', 'MULTI_SELECT'];
const PROCEDURES: FormProcedureType[] = ['CABINET_PREFABRICATION', 'DEVICE_PRECONFIGURATION', 'FIELD_INSTALLATION'];
const CONDITION_KEYS = ['visibleWhen', 'requiredWhen', 'blockCompletionWhen'] as const;
const OPERATORS = ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'in', 'notIn', 'isEmpty', 'isNotEmpty'];
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
    }
  }
  return '';
};

const emptySection = (index: number): DefinitionSection => ({
  key: `section_${index + 1}`,
  title: `Sekcja ${index + 1}`,
  description: '',
  sortOrder: index,
  conditions: {},
  fields: [],
});

const emptyField = (index: number): FormField => ({
  key: `field_${index + 1}`,
  label: `Pole ${index + 1}`,
  fieldType: 'TEXT',
  required: false,
  sortOrder: index,
  validation: {},
  options: {},
  conditions: {},
});

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readError = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return 'Nie udało się wykonać operacji. Sprawdź połączenie i spróbuj ponownie.';
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
});

const reindex = <T extends { sortOrder: number }>(items: T[]): T[] =>
  items.map((item, sortOrder) => ({ ...item, sortOrder }));

const moveItem = <T,>(items: T[], from: number, to: number): T[] => {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
};

const decodeConditionValue = (text: string): FormCondition['value'] => {
  try {
    return JSON.parse(text) as FormCondition['value'];
  } catch {
    return text;
  }
};

const DragHandle: React.FC<{ id: string; label: string; children: React.ReactNode }> = ({ id, label, children }) => {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id });
  const { setNodeRef: setDropRef } = useDroppable({ id });
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
  fieldKeys: string[];
  section?: boolean;
  disabled: boolean;
  onChange: (conditions: Record<string, FormCondition>) => void;
}> = ({ value, fieldKeys, section = false, disabled, onChange }) => {
  const allowed = section ? ['visibleWhen'] : CONDITION_KEYS;
  const addCondition = (key: string) => onChange({
    ...value,
    [key]: { field: fieldKeys[0] || '', operator: 'equals', value: '' },
  });

  return (
    <fieldset className="form-builder__conditions" disabled={disabled}>
      <legend>Warunki</legend>
      {allowed.map(key => {
        const condition = value[key];
        if (!condition) {
          return (
            <button key={key} type="button" className="btn btn-secondary form-builder__small-button" onClick={() => addCondition(key)}>
              + {key}
            </button>
          );
        }
        return (
          <div className="form-builder__condition" key={key}>
            <label>
              {key}
              <select
                aria-label={`${key} pole`}
                value={condition.field}
                onChange={event => onChange({ ...value, [key]: { ...condition, field: event.target.value } })}
              >
                <option value="">Wybierz pole</option>
                {fieldKeys.map(fieldKey => <option key={fieldKey} value={fieldKey}>{fieldKey}</option>)}
              </select>
            </label>
            <label>
              Operator
              <select
                aria-label={`${key} operator`}
                value={condition.operator}
                onChange={event => onChange({ ...value, [key]: { ...condition, operator: event.target.value } })}
              >
                {OPERATORS.map(operator => <option key={operator} value={operator}>{operator}</option>)}
              </select>
            </label>
            {!['isEmpty', 'isNotEmpty'].includes(condition.operator) && (
              <label>
                Wartość (tekst lub JSON)
                <input
                  aria-label={`${key} wartość`}
                  value={condition.value === undefined ? '' : typeof condition.value === 'string' ? condition.value : JSON.stringify(condition.value)}
                  onChange={event => onChange({ ...value, [key]: { ...condition, value: decodeConditionValue(event.target.value) } })}
                />
              </label>
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
  const [rules, setRules] = useState<FormAssignmentRule[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    key: '', name: '', description: '', kind: 'FORM' as FormKind,
    procedureType: 'CABINET_PREFABRICATION' as FormProcedureType,
  });
  const [ruleForm, setRuleForm] = useState({
    assignedUserId: '', assignedTeamId: '', triggerId: '', priority: '0', conditions: '{}',
  });

  const readOnly = !canUpdate || version?.status !== 'DRAFT';
  const fieldKeys = useMemo(() => sections.flatMap(section => section.fields.map(field => field.key)), [sections]);
  const draftDefinitionError = useMemo(() => definitionError(sections), [sections]);

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
      setTab('builder');
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setLoadingDetail(false);
    }
  }, []);

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
      setMessage(readError(error));
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
      if (!cancelled) setMessage(readError(error));
    });
    return () => { cancelled = true; };
  }, [version]);

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
      setMessage(readError(error));
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
      setMessage(readError(error));
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
      setMessage(readError(error));
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
      setMessage(readError(error));
    } finally {
      setSaving(false);
    }
  };

  const changeSection = (index: number, update: Partial<DefinitionSection>) =>
    setSections(current => current.map((section, sectionIndex) => sectionIndex === index ? { ...section, ...update } : section));

  const changeField = (sectionIndex: number, fieldIndex: number, update: Partial<FormField>) =>
    setSections(current => current.map((section, currentSectionIndex) => currentSectionIndex === sectionIndex
      ? { ...section, fields: section.fields.map((field, currentFieldIndex) => currentFieldIndex === fieldIndex ? { ...field, ...update } : field) }
      : section));

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
      setMessage(readError(error));
    } finally {
      setSaving(false);
    }
  };

  const addRule = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const conditions = JSON.parse(ruleForm.conditions);
      if (!isObject(conditions)) throw new Error();
      setRules(current => [...current, {
        assignedUserId: ruleForm.assignedUserId ? Number(ruleForm.assignedUserId) : null,
        assignedTeamId: ruleForm.assignedTeamId ? Number(ruleForm.assignedTeamId) : null,
        triggerId: ruleForm.triggerId ? Number(ruleForm.triggerId) : null,
        priority: Number(ruleForm.priority) || 0,
        active: true,
        conditions,
      }]);
      setRuleForm({ assignedUserId: '', assignedTeamId: '', triggerId: '', priority: '0', conditions: '{}' });
    } catch {
      setMessage('Warunki reguły muszą być poprawnym obiektem JSON.');
    }
  };

  const addField = (sectionIndex: number) => {
    setSections(current => current.map((section, index) => index === sectionIndex
      ? {
        ...section,
        fields: [...section.fields, {
          ...emptyField(section.fields.length),
          key: uniqueKey(`field_${section.fields.length + 1}`, current.flatMap(item => item.fields.map(field => field.key))),
        }],
      }
      : section));
  };

  const duplicateField = (sectionIndex: number, fieldIndex: number) => {
    setSections(current => current.map((section, index) => {
      if (index !== sectionIndex) return section;
      const original = section.fields[fieldIndex];
      const baseKey = original.key.replace(/(?:_copy(?:_\d+)?)+$/, '');
      const key = uniqueKey(`${baseKey}_copy`, current.flatMap(item => item.fields.map(field => field.key)));
      return { ...section, fields: [...section.fields, { ...original, key, label: `${original.label} (kopia)`, sortOrder: section.fields.length }] };
    }));
  };

  const tabs: Array<{ id: BuilderTab; label: string }> = [
    { id: 'builder', label: 'Form Builder' },
    { id: 'versions', label: 'Versions' },
    { id: 'preview', label: 'Preview' },
    { id: 'rules', label: 'Assignments / Rules' },
  ];

  return (
    <main className="form-builder">
      <header className="form-builder__header">
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin')}>← Panel administratora</button>
        <div className="form-builder__heading">
          <div>
            <h1>Form Builder</h1>
            <p>Definicje formularzy i checklist — wersjonowane przez istniejące API.</p>
          </div>
          {canCreate && !selectedTemplate && (
            <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(open => !open)}>
              {createOpen ? 'Anuluj' : '+ Nowy formularz'}
            </button>
          )}
        </div>
      </header>

      {message && <div className="form-builder__notice" role="status">{message}</div>}
      {listError && <div className="form-builder__notice form-builder__notice--error" role="alert">{listError}</div>}

      {createOpen && (
        <form className="form-builder__card form-builder__create" onSubmit={createTemplate}>
          <h2>Nowy formularz</h2>
          <label>Klucz <input required pattern="[A-Za-z0-9_-]+" maxLength={100} value={templateForm.key} onChange={event => setTemplateForm({ ...templateForm, key: event.target.value })} /></label>
          <label>Nazwa <input required maxLength={255} value={templateForm.name} onChange={event => setTemplateForm({ ...templateForm, name: event.target.value })} /></label>
          <label>Opis <textarea value={templateForm.description} onChange={event => setTemplateForm({ ...templateForm, description: event.target.value })} /></label>
          <label>Typ <select value={templateForm.kind} onChange={event => setTemplateForm({ ...templateForm, kind: event.target.value as FormKind })}>
            <option value="FORM">Formularz</option><option value="CHECKLIST">Checklista</option>
          </select></label>
          <label>Procedura <select value={templateForm.procedureType} onChange={event => setTemplateForm({ ...templateForm, procedureType: event.target.value as FormProcedureType })}>
            {PROCEDURES.map(procedure => <option value={procedure} key={procedure}>{procedure}</option>)}
          </select></label>
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
                  <span><strong>{template.name}</strong><small>{template.key} · {template.kind} · {template.procedureType}</small></span>
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
              <p>{selectedTemplate.key} · {selectedTemplate.kind} · {selectedTemplate.procedureType}</p>
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
                catch (error) { setMessage(readError(error)); }
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
              <div className="form-builder__section-actions">
                <h3>Sekcje</h3>
                {!readOnly && <button type="button" className="btn btn-secondary" onClick={() => setSections(current => [...current, {
                  ...emptySection(current.length),
                  key: uniqueKey(`section_${current.length + 1}`, current.map(section => section.key)),
                }])}>+ Dodaj sekcję</button>}
              </div>
              {sections.length === 0 && <p className="form-builder__hint">Dodaj sekcję, aby rozpocząć budowanie formularza.</p>}
              <DndContext sensors={sensors} onDragEnd={event => setSections(current => reorder(current, event))}>
                <div className="form-builder__sections">
                  {sections.map((section, sectionIndex) => (
                    <DragHandle key={section.key} id={section.key} label={section.title}>
                      <article className="form-builder__section">
                        <div className="form-builder__section-head">
                          <label>Nazwa sekcji
                            <input value={section.title} disabled={readOnly} onChange={event => changeSection(sectionIndex, { title: event.target.value })} />
                          </label>
                          <label>Klucz
                            <input value={section.key} disabled={readOnly} onChange={event => changeSection(sectionIndex, { key: event.target.value })} />
                          </label>
                          {!readOnly && <button type="button" className="btn btn-secondary" aria-label={`Usuń sekcję ${section.title}`} onClick={() => setSections(current => current.filter((_, index) => index !== sectionIndex))}>Usuń sekcję</button>}
                        </div>
                        <label>Opis
                          <input value={section.description || ''} disabled={readOnly} onChange={event => changeSection(sectionIndex, { description: event.target.value })} />
                        </label>
                        <ConditionEditor value={section.conditions} fieldKeys={fieldKeys} section disabled={readOnly} onChange={conditions => changeSection(sectionIndex, { conditions })} />
                        <div className="form-builder__section-actions">
                          <h4>Pola ({section.fields.length})</h4>
                          {!readOnly && <button type="button" className="btn btn-secondary" onClick={() => addField(sectionIndex)}>+ Dodaj pole</button>}
                        </div>
                        <DndContext sensors={sensors} onDragEnd={event => reorderFields(sectionIndex, event)}>
                          <div className="form-builder__fields">
                            {section.fields.map((field, fieldIndex) => (
                              <DragHandle key={field.key} id={field.key} label={field.label}>
                                <FieldEditor
                                  field={field}
                                  index={fieldIndex}
                                  fieldKeys={fieldKeys}
                                  disabled={readOnly}
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
              <h3>{version.title}</h3>
              {version.description && <p>{version.description}</p>}
              {sections.map(section => (
                <section className="form-builder__preview-section" key={section.key}>
                  <h4>{section.title}</h4>
                  {section.description && <p>{section.description}</p>}
                  {section.fields.map(field => <PreviewField field={field} key={field.key} />)}
                </section>
              ))}
              {sections.length === 0 && <p>Brak sekcji do podglądu.</p>}
              <p className="form-builder__hint">Podgląd wizualny — warunki i walidacja nie są tu wykonywane.</p>
            </div>
          ) : (
            <div className="form-builder__card">
              <div className="form-builder__section-actions">
                <div><h3>Assignments / Rules</h3><p>Konfiguracja deklaratywnych reguł wersji. Automatyczne wykonywanie należy do etapu 8.</p></div>
                {canAssign && version.status === 'DRAFT' && <button className="btn btn-primary" disabled={saving} onClick={() => void saveRules()}>{saving ? 'Zapisywanie…' : 'Zapisz reguły'}</button>}
              </div>
              {rules.length === 0 && <p>Brak reguł przypisań.</p>}
              <div className="form-builder__rules">
                {rules.map((rule, index) => (
                  <div className="form-builder__rule" key={rule.id ?? `${rule.priority}-${index}`}>
                    <span>Priorytet {rule.priority} · {rule.active ? 'aktywna' : 'nieaktywna'} · użytkownik: {rule.assignedUserId ?? '—'} · zespół: {rule.assignedTeamId ?? '—'} · trigger: {rule.triggerId ?? '—'}</span>
                    {canAssign && version.status === 'DRAFT' && <button className="btn btn-secondary" aria-label={`Usuń regułę ${index + 1}`} onClick={() => setRules(current => current.filter((_, ruleIndex) => ruleIndex !== index))}>Usuń</button>}
                  </div>
                ))}
              </div>
              {canAssign && version.status === 'DRAFT' && (
                <form className="form-builder__rule-form" onSubmit={addRule}>
                  <h4>Dodaj regułę</h4>
                  <label>ID użytkownika <input inputMode="numeric" pattern="[1-9][0-9]*" value={ruleForm.assignedUserId} onChange={event => setRuleForm({ ...ruleForm, assignedUserId: event.target.value })} /></label>
                  <label>ID zespołu <input inputMode="numeric" pattern="[1-9][0-9]*" value={ruleForm.assignedTeamId} onChange={event => setRuleForm({ ...ruleForm, assignedTeamId: event.target.value })} /></label>
                  <label>ID triggera (opcjonalnie) <input inputMode="numeric" pattern="[1-9][0-9]*" value={ruleForm.triggerId} onChange={event => setRuleForm({ ...ruleForm, triggerId: event.target.value })} /></label>
                  <label>Priorytet <input type="number" value={ruleForm.priority} onChange={event => setRuleForm({ ...ruleForm, priority: event.target.value })} /></label>
                  <label>Warunki (JSON) <textarea value={ruleForm.conditions} onChange={event => setRuleForm({ ...ruleForm, conditions: event.target.value })} /></label>
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
  fieldKeys: string[];
  disabled: boolean;
  onChange: (update: Partial<FormField>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}> = ({ field, index, fieldKeys, disabled, onChange, onDuplicate, onDelete }) => {
  const optionValues = Array.isArray(field.options.values) ? field.options.values : [];
  const validationMin = typeof field.validation.min === 'number' ? field.validation.min : '';
  const validationMax = typeof field.validation.max === 'number' ? field.validation.max : '';
  return (
    <fieldset className="form-builder__field">
      <legend>Pole {index + 1}</legend>
      <div className="form-builder__field-grid">
        <label>Etykieta <input value={field.label} disabled={disabled} onChange={event => onChange({ label: event.target.value })} /></label>
        <label>Klucz <input value={field.key} disabled={disabled} onChange={event => onChange({ key: event.target.value })} /></label>
        <label>Typ <select value={field.fieldType} disabled={disabled} onChange={event => onChange({ fieldType: event.target.value })}>
          {FIELD_TYPES.map(type => <option value={type} key={type}>{type}</option>)}
        </select></label>
        <label className="form-builder__checkbox"><input type="checkbox" checked={field.required} disabled={disabled} onChange={event => onChange({ required: event.target.checked })} /> Wymagane</label>
        {field.fieldType === 'NUMBER' && (
          <>
            <label>Minimum <input type="number" value={validationMin} disabled={disabled} onChange={event => onChange({ validation: { ...field.validation, min: event.target.value === '' ? undefined : Number(event.target.value) } })} /></label>
            <label>Maksimum <input type="number" value={validationMax} disabled={disabled} onChange={event => onChange({ validation: { ...field.validation, max: event.target.value === '' ? undefined : Number(event.target.value) } })} /></label>
          </>
        )}
        <label>Jednostka <input value={typeof field.options.unit === 'string' ? field.options.unit : ''} disabled={disabled} onChange={event => onChange({ options: { ...field.options, unit: event.target.value } })} /></label>
        {['SELECT', 'RADIO', 'MULTI_SELECT'].includes(field.fieldType) && (
          <label className="form-builder__wide">Opcje (jedna na linię)
            <textarea value={optionValues.join('\n')} disabled={disabled} onChange={event => onChange({ options: { ...field.options, values: event.target.value.split('\n').map(value => value.trim()).filter(Boolean) } })} />
          </label>
        )}
      </div>
      <ConditionEditor value={field.conditions} fieldKeys={fieldKeys} disabled={disabled} onChange={conditions => onChange({ conditions })} />
      {!disabled && <div className="form-builder__field-actions">
        <button type="button" className="btn btn-secondary" onClick={onDuplicate}>Kopiuj pole</button>
        <button type="button" className="btn btn-secondary" onClick={onDelete}>Usuń pole</button>
      </div>}
    </fieldset>
  );
};

const PreviewField: React.FC<{ field: FormField }> = ({ field }) => {
  const id = `preview-${field.key}`;
  const values = Array.isArray(field.options.values) ? field.options.values : [];
  return (
    <div className="form-builder__preview-field">
      <label htmlFor={id}>{field.label}{field.required && <span aria-label="wymagane"> *</span>}</label>
      {field.fieldType === 'TEXTAREA' ? <textarea id={id} disabled /> :
        field.fieldType === 'SELECT' ? <select id={id} disabled><option>Wybierz…</option>{values.map(value => <option key={String(value)}>{String(value)}</option>)}</select> :
          field.fieldType === 'CHECKBOX' ? <input id={id} type="checkbox" disabled /> :
            <input id={id} type={field.fieldType === 'NUMBER' ? 'number' : field.fieldType === 'DATE' ? 'date' : 'text'} disabled />}
      {typeof field.options.unit === 'string' && field.options.unit && <small>{field.options.unit}</small>}
    </div>
  );
};
