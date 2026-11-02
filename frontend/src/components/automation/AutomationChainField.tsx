// src/components/automation/AutomationChainField.tsx
// Pole „Automatyzacje”: łańcuch kafelków (kroków) wykonywanych po zdarzeniu.
// Komponent jest ogólny – działa dla każdego właściciela łańcucha (wersja formularza, w przyszłości etap procesu).

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
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
import { usePermissions } from '../../hooks/usePermissions';
import { automationService } from '../../services/automation.service';
import variableEngineService from '../../services/variableEngine.service';
import type {
  AutomationActionDefinition,
  AutomationChain,
  AutomationChainTarget,
  AutomationEventType,
  AutomationOnError,
  AutomationOwnerType,
  AutomationParamValue,
  AutomationRun,
} from '../../types/automation.types';
import type { Task } from '../../types/task.types';
import { TaskPicker } from '../common/TaskPicker';
import {
  chainSignature,
  createStepId,
  groupActionsByCategory,
  lookupKey,
  matchActions,
  MAX_STEPS,
  missingParamLabels,
  moveStep,
  readAutomationError,
  RUN_STATUS_LABELS,
  summarizeParams,
  toChainSteps,
  toDataSources,
  toEditableSteps,
  type DataSourceOption,
  type EditableStep,
} from './automationHelpers';
import { AutomationStepPanel } from './AutomationStepPanel';
import { AutomationStepResults } from './AutomationStepResults';
import { useLookupLabels } from './useLookupLabels';
import './automation.css';

export interface AutomationChainFieldProps {
  ownerType: AutomationOwnerType;
  ownerId: number;
  eventType: AutomationEventType;
  readOnly?: boolean;
  title?: string;
  description?: string;
  /** Informuje, czy w polu są niezapisane zmiany (np. żeby ostrzec przed publikacją). */
  onDirtyChange?: (dirty: boolean) => void;
}

interface LoadedChain {
  key: string;
  failed?: boolean;
  actions?: AutomationActionDefinition[];
  chain?: AutomationChain | null;
  sources?: DataSourceOption[];
  sourcesFailed?: boolean;
}

const INCOMPLETE_MESSAGE = 'Uzupełnij ustawienia zaznaczonych kroków, aby zapisać.';

const withoutKey = <T,>(record: Record<string, T>, key: string): Record<string, T> => {
  const copy = { ...record };
  delete copy[key];
  return copy;
};

export function AutomationChainField(props: AutomationChainFieldProps) {
  const { ownerType, ownerId, eventType, readOnly = false, title, description, onDirtyChange } = props;
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<LoadedChain | null>(null);
  const loadKey = `${ownerType}:${ownerId}:${eventType}:${attempt}`;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      automationService.listActions(),
      automationService.getChain({ ownerType, ownerId, eventType }),
      variableEngineService.listVariables().then(toDataSources).catch(() => null),
    ]).then(([actions, chain, sources]) => {
      if (!cancelled) {
        setLoaded({ key: loadKey, actions, chain, sources: sources ?? [], sourcesFailed: sources === null });
      }
    }).catch(() => {
      if (!cancelled) setLoaded({ key: loadKey, failed: true });
    });
    return () => { cancelled = true; };
  }, [ownerType, ownerId, eventType, loadKey]);

  if (!loaded || loaded.key !== loadKey) {
    return <p className="automation-hint" role="status">Wczytywanie automatyzacji…</p>;
  }
  if (loaded.failed || !loaded.actions) {
    return (
      <div className="automation-notice automation-notice--error" role="alert">
        <p>Nie udało się wczytać automatyzacji.</p>
        <button type="button" className="btn btn-secondary" onClick={() => setAttempt(current => current + 1)}>
          Spróbuj ponownie
        </button>
      </div>
    );
  }
  return (
    <AutomationChainEditor
      key={loadKey}
      target={{ ownerType, ownerId, eventType }}
      chain={loaded.chain ?? null}
      actions={loaded.actions}
      sources={loaded.sources ?? []}
      sourcesFailed={loaded.sourcesFailed ?? false}
      readOnly={readOnly}
      title={title}
      description={description}
      onDirtyChange={onDirtyChange}
    />
  );
}

interface AutomationChainEditorProps {
  target: AutomationChainTarget;
  chain: AutomationChain | null;
  actions: AutomationActionDefinition[];
  sources: DataSourceOption[];
  sourcesFailed: boolean;
  readOnly: boolean;
  title?: string;
  description?: string;
  onDirtyChange?: (dirty: boolean) => void;
}

function AutomationChainEditor({
  target,
  chain,
  actions,
  sources,
  sourcesFailed,
  readOnly,
  title,
  description,
  onDirtyChange,
}: AutomationChainEditorProps) {
  const { hasPermission } = usePermissions();
  const editable = !readOnly && hasPermission('automation', 'build');
  const canRun = hasPermission('automation', 'run');
  const uid = useId();
  const headingId = `${uid}-heading`;
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));
  const actionsByKey = useMemo(() => new Map(actions.map(action => [action.key, action])), [actions]);

  const [steps, setSteps] = useState<EditableStep[]>(() => toEditableSteps(chain?.steps ?? []));
  const [onError, setOnError] = useState<AutomationOnError>(chain?.onError ?? 'STOP');
  const [chainId, setChainId] = useState<number | null>(chain?.id ?? null);
  const [savedSignature, setSavedSignature] = useState(
    () => chainSignature(chain?.steps ?? [], chain?.onError ?? 'STOP', actionsByKey),
  );
  const [openStepId, setOpenStepId] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [testTask, setTestTask] = useState<Task | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<AutomationRun | null>(null);
  const [testError, setTestError] = useState('');
  const returnFocusTo = useRef<string | null>(null);

  const { labels: lookupLabels, remember } = useLookupLabels(steps, actionsByKey);
  const signature = chainSignature(steps, onError, actionsByKey);
  const dirty = signature !== savedSignature;

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (openStepId !== null || !returnFocusTo.current) return;
    document.getElementById(returnFocusTo.current)?.focus();
    returnFocusTo.current = null;
  }, [openStepId]);

  const problems = steps.map(step => {
    const action = actionsByKey.get(step.action);
    return { action, missing: action ? missingParamLabels(action, step.params) : [] };
  });
  const openIndex = steps.findIndex(step => step.id === openStepId);
  const openAction = openIndex >= 0 ? problems[openIndex].action : undefined;
  const stepBodyId = (stepId: string) => `${uid}-step-${stepId}`;

  const markChanged = () => {
    setNotice('');
    setSaveError('');
    setTestError('');
    setTestResult(null);
  };

  const closePanel = () => {
    if (openStepId) returnFocusTo.current = stepBodyId(openStepId);
    setOpenStepId(null);
  };

  const addStep = (actionKey: string) => {
    if (steps.length >= MAX_STEPS) return;
    setSteps(current => [...current, { id: createStepId(), action: actionKey, params: {} }]);
    markChanged();
  };

  const removeStep = (stepId: string) => {
    setSteps(current => current.filter(step => step.id !== stepId));
    setStepErrors(current => withoutKey(current, stepId));
    setOpenStepId(current => (current === stepId ? null : current));
    markChanged();
  };

  const changeParam = (stepId: string, key: string, value: AutomationParamValue | undefined, lookupLabel?: string) => {
    const step = steps.find(item => item.id === stepId);
    if (!step) return;
    setSteps(current => current.map(item => {
      if (item.id !== stepId) return item;
      const params = { ...item.params };
      if (value === undefined) delete params[key];
      else params[key] = value;
      return { ...item, params };
    }));
    if (lookupLabel !== undefined && value !== undefined) {
      const definition = actionsByKey.get(step.action)?.params.find(param => param.key === key);
      if (definition) remember(lookupKey(definition.type, String(value)), lookupLabel);
    }
    setStepErrors(current => withoutKey(current, stepId));
    markChanged();
  };

  const changeOnError = (next: AutomationOnError) => {
    setOnError(next);
    markChanged();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    const from = steps.findIndex(step => step.id === event.active.id);
    const to = steps.findIndex(step => step.id === event.over?.id);
    if (from < 0 || to < 0) return;
    setSteps(moveStep(steps, from, to));
    markChanged();
  };

  const persist = async (): Promise<AutomationChain | null> => {
    const incomplete = problems.findIndex(problem => !problem.action || problem.missing.length > 0);
    if (incomplete >= 0) {
      setSaveError(INCOMPLETE_MESSAGE);
      const firstWithMissing = problems.findIndex(problem => problem.missing.length > 0);
      if (firstWithMissing >= 0) setOpenStepId(steps[firstWithMissing].id);
      return null;
    }
    const stepIds = steps.map(step => step.id);
    setSaving(true);
    setSaveError('');
    setNotice('');
    setStepErrors({});
    try {
      const saved = await automationService.saveChain(target, { steps: toChainSteps(steps, actionsByKey), onError });
      setChainId(saved.id);
      setSavedSignature(signature);
      setNotice('Zapisano automatyzacje.');
      return saved;
    } catch (error) {
      const parsed = readAutomationError(error, 'Nie udało się zapisać automatyzacji.');
      const byStep: Record<string, string> = {};
      for (const item of parsed.steps) {
        const stepId = stepIds[item.stepIndex];
        if (stepId) byStep[stepId] = byStep[stepId] ? `${byStep[stepId]} ${item.message}` : item.message;
      }
      setStepErrors(byStep);
      setSaveError(Object.keys(byStep).length ? 'Nie udało się zapisać – sprawdź zaznaczone kroki.' : parsed.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    if (!testTask) {
      setTestError('Wybierz zadanie, na którym chcesz przetestować łańcuch.');
      return;
    }
    setTestError('');
    setTestResult(null);
    setTesting(true);
    try {
      let id = chainId;
      if (editable && (dirty || id === null)) {
        const saved = await persist();
        if (!saved) return;
        id = saved.id;
      }
      if (id === null) return;
      setTestResult(await automationService.testChain(id, testTask.id));
    } catch (error) {
      const parsed = readAutomationError(error, 'Nie udało się wykonać testu.');
      setTestError(parsed.message || parsed.steps.map(item => item.message).join(' '));
    } finally {
      setTesting(false);
    }
  };

  const showFooter = editable || steps.length > 0;

  return (
    <section
      className="automation-chain"
      aria-labelledby={title ? headingId : undefined}
      aria-label={title ? undefined : 'Automatyzacje'}
    >
      {(title || description) && (
        <header className="automation-chain__header">
          {title && <h3 id={headingId}>{title}</h3>}
          {description && <p className="automation-hint">{description}</p>}
        </header>
      )}

      {steps.length === 0 && (
        <p className="automation-hint">
          {editable
            ? 'Nie dodano jeszcze żadnych kroków. Wpisz nazwę kroku (np. „mail”) albo wybierz go z listy „+ Dodaj”.'
            : 'Brak automatyzacji dla tego zdarzenia.'}
        </p>
      )}

      {steps.length > 0 && (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <ol className="automation-chain__steps" aria-label="Kroki w kolejności wykonania">
            {steps.map((step, index) => (
              <StepTile
                key={step.id}
                step={step}
                index={index}
                isLast={index === steps.length - 1}
                action={problems[index].action}
                missing={problems[index].missing}
                summary={problems[index].action
                  ? summarizeParams(problems[index].action, step.params, { lookupLabels, sources })
                  : ''}
                error={stepErrors[step.id]}
                open={openStepId === step.id}
                editable={editable}
                bodyId={stepBodyId(step.id)}
                onToggle={() => setOpenStepId(current => (current === step.id ? null : step.id))}
                onRemove={() => removeStep(step.id)}
              />
            ))}
          </ol>
        </DndContext>
      )}

      {editable && <AddStepControl actions={actions} disabled={steps.length >= MAX_STEPS} onAdd={addStep} />}
      {editable && steps.length >= MAX_STEPS && (
        <p className="automation-hint">Osiągnięto największą liczbę kroków w jednym łańcuchu ({MAX_STEPS}).</p>
      )}

      {openStepId && openAction && (
        <AutomationStepPanel
          key={openStepId}
          action={openAction}
          stepNumber={openIndex + 1}
          params={steps[openIndex].params}
          sources={sources}
          sourcesFailed={sourcesFailed}
          readOnly={!editable}
          onChange={(key, value, lookupLabel) => changeParam(openStepId, key, value, lookupLabel)}
          onClose={closePanel}
        />
      )}

      {showFooter && (
        <div className="automation-chain__footer">
          <fieldset className="automation-chain__onerror" disabled={!editable}>
            <legend>Gdy krok się nie uda:</legend>
            <label>
              <input
                type="radio"
                name={`${uid}-onerror`}
                checked={onError === 'STOP'}
                onChange={() => changeOnError('STOP')}
              />
              {' '}zatrzymaj
            </label>
            <label>
              <input
                type="radio"
                name={`${uid}-onerror`}
                checked={onError === 'CONTINUE'}
                onChange={() => changeOnError('CONTINUE')}
              />
              {' '}kontynuuj
            </label>
          </fieldset>
          <div className="automation-chain__actions">
            {canRun && steps.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                aria-expanded={showTest}
                onClick={() => setShowTest(open => !open)}
              >
                Testuj na zadaniu
              </button>
            )}
            {editable && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={!dirty || saving || testing}
                onClick={() => void persist()}
              >
                {saving ? 'Zapisywanie…' : 'Zapisz'}
              </button>
            )}
          </div>
        </div>
      )}

      {saveError && <p className="automation-notice automation-notice--error" role="alert">{saveError}</p>}
      {notice && !dirty && <p className="automation-notice automation-notice--ok" role="status">{notice}</p>}

      {showTest && canRun && steps.length > 0 && (
        <section className="automation-test" aria-label="Test na zadaniu">
          <h4>Testuj na zadaniu</h4>
          <p className="automation-hint">
            Test nic nie wysyła i niczego nie zmienia – pokazuje, co zrobiłby każdy krok.
            {editable && dirty ? ' Niezapisane zmiany zostaną najpierw zapisane.' : ''}
          </p>
          <TaskPicker
            value={testTask}
            onChange={task => {
              setTestTask(task);
              setTestResult(null);
              setTestError('');
            }}
            selectLabel="Zadanie do testu"
            emptyOptionLabel="Wybierz zadanie"
            className="automation-test__picker"
            errorClassName="automation-notice automation-notice--error"
            disabled={testing}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={!testTask || testing || saving}
            onClick={() => void runTest()}
          >
            {testing ? 'Testowanie…' : 'Uruchom test'}
          </button>
          {testError && <p className="automation-notice automation-notice--error" role="alert">{testError}</p>}
          {testResult && (
            <div className="automation-test__result" role="region" aria-label="Wynik testu">
              <h5>Wynik testu: {RUN_STATUS_LABELS[testResult.status] ?? testResult.status}</h5>
              {testResult.message && <p className="automation-hint">{testResult.message}</p>}
              <AutomationStepResults steps={testResult.steps ?? []} actions={actionsByKey} />
            </div>
          )}
        </section>
      )}
    </section>
  );
}

interface StepTileProps {
  step: EditableStep;
  index: number;
  isLast: boolean;
  action: AutomationActionDefinition | undefined;
  missing: string[];
  summary: string;
  error?: string;
  open: boolean;
  editable: boolean;
  bodyId: string;
  onToggle: () => void;
  onRemove: () => void;
}

function StepTile({ step, index, isLast, action, missing, summary, error, open, editable, bodyId, onToggle, onRemove }: StepTileProps) {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id: step.id, disabled: !editable });
  const { setNodeRef: setDropRef } = useDroppable({ id: step.id, disabled: !editable });
  const detailId = `${bodyId}-detail`;
  const title = action?.label ?? 'Krok niedostępny';
  const incomplete = !action || missing.length > 0;
  const detail = action ? (summary || action.description) : 'Ten klocek nie jest już dostępny – usuń go.';
  const className = [
    'automation-step',
    incomplete || error ? 'is-incomplete' : '',
    open ? 'is-open' : '',
    isDragging ? 'is-dragging' : '',
  ].filter(Boolean).join(' ');

  return (
    <li
      ref={node => {
        setDragRef(node);
        setDropRef(node);
      }}
      className={className}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
    >
      <div className="automation-step__card">
        <span className="automation-step__number" aria-hidden="true">{index + 1}</span>
        <button
          type="button"
          id={bodyId}
          className="automation-step__body"
          aria-expanded={action ? open : undefined}
          aria-label={`Ustawienia kroku ${index + 1}: ${title}`}
          aria-describedby={detailId}
          disabled={!action}
          onClick={onToggle}
        >
          <span className="automation-step__title">{title}</span>
          <span id={detailId} className="automation-step__summary">{detail}</span>
          {missing.length > 0 && <span className="automation-step__missing">{`Uzupełnij: ${missing.join(', ')}`}</span>}
        </button>
        {editable && (
          <button
            type="button"
            className="automation-step__handle"
            aria-label={`Przeciągnij krok: ${title}`}
            {...attributes}
            {...listeners}
          >
            ⠿
          </button>
        )}
        {editable && (
          <button
            type="button"
            className="automation-step__remove"
            aria-label={`Usuń krok: ${title}`}
            onClick={() => {
              if (window.confirm(`Usunąć krok „${title}”?`)) onRemove();
            }}
          >
            🗑
          </button>
        )}
        {error && <p className="automation-step__error" role="alert">{error}</p>}
      </div>
      {!isLast && <span className="automation-step__arrow" aria-hidden="true">→</span>}
    </li>
  );
}

interface AddStepControlProps {
  actions: AutomationActionDefinition[];
  disabled: boolean;
  onAdd: (actionKey: string) => void;
}

function AddStepControl({ actions, disabled, onAdd }: AddStepControlProps) {
  const uid = useId();
  const listId = `${uid}-suggestions`;
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const matches = useMemo(() => matchActions(actions, query).slice(0, 8), [actions, query]);
  const searching = query.trim() !== '';
  const showList = searching && matches.length > 0;
  const active = Math.min(activeIndex, Math.max(matches.length - 1, 0));

  const add = (actionKey: string) => {
    onAdd(actionKey);
    setQuery('');
    setActiveIndex(0);
    setMenuOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && matches.length) {
      event.preventDefault();
      setActiveIndex(Math.min(active + 1, matches.length - 1));
    } else if (event.key === 'ArrowUp' && matches.length) {
      event.preventDefault();
      setActiveIndex(Math.max(active - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (matches[active]) add(matches[active].key);
    } else if (event.key === 'Escape') {
      setQuery('');
    }
  };

  return (
    <div
      className="automation-add"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setMenuOpen(false);
      }}
    >
      <div className="automation-add__row">
        <div className="automation-add__search">
          <input
            type="text"
            role="combobox"
            className="automation-input"
            aria-label="Dodaj krok"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={listId}
            aria-activedescendant={showList ? `${listId}-${active}` : undefined}
            placeholder="Wpisz nazwę kroku, np. „mail”, i naciśnij Enter"
            value={query}
            disabled={disabled}
            onChange={event => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          {showList && (
            <ul id={listId} role="listbox" className="automation-add__suggestions" aria-label="Podpowiedzi kroków">
              {matches.map((action, index) => (
                <li
                  key={action.key}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  className={index === active ? 'is-active' : undefined}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => add(action.key)}
                >
                  <strong>{action.label}</strong>{' '}
                  <span>{action.category}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="automation-add__menu-wrap">
          <button
            type="button"
            className="btn btn-secondary"
            aria-expanded={menuOpen}
            disabled={disabled}
            onClick={() => setMenuOpen(open => !open)}
          >
            + Dodaj
          </button>
          {menuOpen && (
            <div className="automation-add__menu" role="group" aria-label="Dostępne kroki">
              {groupActionsByCategory(actions).map(group => (
                <div key={group.category} className="automation-add__group">
                  <strong>{group.category}</strong>
                  {group.actions.map(action => (
                    <button
                      key={action.key}
                      type="button"
                      className="automation-add__item"
                      title={action.description}
                      onClick={() => add(action.key)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {searching && matches.length === 0 && (
        <p className="automation-hint" role="status">Nie znaleziono pasującego kroku. Wybierz go z listy „+ Dodaj”.</p>
      )}
    </div>
  );
}
