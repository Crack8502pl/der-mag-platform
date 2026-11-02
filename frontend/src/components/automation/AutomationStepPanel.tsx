// src/components/automation/AutomationStepPanel.tsx
// Panel ustawień jednego kroku: kontrolka zależy od typu ustawienia. Na telefonie zajmuje cały ekran.

import { useEffect, useId, useRef, useState } from 'react';
import type {
  AutomationActionDefinition,
  AutomationLookupOption,
  AutomationParamDefinition,
  AutomationParams,
  AutomationParamValue,
} from '../../types/automation.types';
import {
  groupDataSources,
  isLookupType,
  isParamRequired,
  MAX_LONG_TEXT_LENGTH,
  MAX_TEXT_LENGTH,
  visibleParams,
  type DataSourceOption,
} from './automationHelpers';
import { LookupSelect } from './LookupSelect';

export type ParamChangeHandler = (key: string, value: AutomationParamValue | undefined, lookupLabel?: string) => void;

interface ParamFieldProps {
  param: AutomationParamDefinition;
  value: AutomationParamValue | undefined;
  readOnly: boolean;
  onChange: ParamChangeHandler;
}

interface TextParamProps extends ParamFieldProps {
  sources: DataSourceOption[];
  sourcesFailed: boolean;
}

const labelClass = (param: AutomationParamDefinition) =>
  `automation-param__label${isParamRequired(param) ? ' is-required' : ''}`;

function TextParam({ param, value, readOnly, sources, sourcesFailed, onChange }: TextParamProps) {
  const id = useId();
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const caretRef = useRef<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const text = typeof value === 'string' ? value : '';
  const longText = param.type === 'longText';
  const required = isParamRequired(param);
  const hintId = param.description ? `${id}-hint` : undefined;

  useEffect(() => {
    const caret = caretRef.current;
    const field = fieldRef.current;
    if (caret === null || !field) return;
    caretRef.current = null;
    field.focus();
    field.setSelectionRange(caret, caret);
  }, [text]);

  const insert = (expression: string) => {
    const token = `{${expression}}`;
    const field = fieldRef.current;
    const start = field?.selectionStart ?? text.length;
    const end = field?.selectionEnd ?? start;
    caretRef.current = start + token.length;
    onChange(param.key, `${text.slice(0, start)}${token}${text.slice(end)}`);
    setMenuOpen(false);
  };

  return (
    <div className="automation-param">
      <label className={labelClass(param)} htmlFor={id}>{param.label}</label>
      {param.description && <p className="automation-hint" id={hintId}>{param.description}</p>}
      {longText ? (
        <textarea
          id={id}
          ref={element => { fieldRef.current = element; }}
          className="automation-input"
          rows={6}
          maxLength={MAX_LONG_TEXT_LENGTH}
          value={text}
          disabled={readOnly}
          aria-required={required}
          aria-describedby={hintId}
          onChange={event => onChange(param.key, event.target.value)}
        />
      ) : (
        <input
          id={id}
          ref={element => { fieldRef.current = element; }}
          type="text"
          className="automation-input"
          maxLength={MAX_TEXT_LENGTH}
          value={text}
          disabled={readOnly}
          aria-required={required}
          aria-describedby={hintId}
          onChange={event => onChange(param.key, event.target.value)}
        />
      )}
      {!readOnly && (
        <div className="automation-insert">
          <button
            type="button"
            className="btn btn-secondary automation-insert__toggle"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(open => !open)}
          >
            Wstaw dane z systemu
          </button>
          {menuOpen && (
            <div className="automation-insert__menu" role="group" aria-label={`Dane z systemu: ${param.label}`}>
              {sourcesFailed && <p className="automation-hint automation-hint--error">Nie udało się wczytać listy danych z systemu.</p>}
              {!sourcesFailed && sources.length === 0 && <p className="automation-hint">Brak danych do wstawienia.</p>}
              {groupDataSources(sources).map(group => (
                <div key={group.group} className="automation-insert__group">
                  <strong>{group.group}</strong>
                  <div className="automation-insert__items">
                    {group.items.map(source => (
                      <button
                        key={source.expression}
                        type="button"
                        className="automation-insert__item"
                        aria-label={`${source.label} (${group.group})`}
                        onClick={() => insert(source.expression)}
                      >
                        {source.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NumberParam({ param, value, readOnly, onChange }: ParamFieldProps) {
  const id = useId();
  return (
    <div className="automation-param">
      <label className={labelClass(param)} htmlFor={id}>{param.label}</label>
      {param.description && <p className="automation-hint">{param.description}</p>}
      <input
        id={id}
        type="number"
        step="any"
        className="automation-input"
        value={typeof value === 'number' ? value : ''}
        disabled={readOnly}
        aria-required={isParamRequired(param)}
        onChange={event => onChange(param.key, event.target.value === '' ? undefined : Number(event.target.value))}
      />
    </div>
  );
}

function BooleanParam({ param, value, readOnly, onChange }: ParamFieldProps) {
  return (
    <div className="automation-param automation-param--check">
      <label>
        <input
          type="checkbox"
          checked={value === true}
          disabled={readOnly}
          onChange={event => onChange(param.key, event.target.checked)}
        />
        {' '}{param.label}
      </label>
      {param.description && <p className="automation-hint">{param.description}</p>}
    </div>
  );
}

function SelectParam({ param, value, readOnly, onChange }: ParamFieldProps) {
  const id = useId();
  const options = param.options ?? [];
  const current = value === undefined ? '' : String(value);
  const unavailable = current !== '' && !options.some(option => option.value === current);
  return (
    <div className="automation-param">
      <label className={labelClass(param)} htmlFor={id}>{param.label}</label>
      {param.description && <p className="automation-hint">{param.description}</p>}
      <select
        id={id}
        className="automation-input"
        value={current}
        disabled={readOnly || options.length === 0}
        aria-required={isParamRequired(param)}
        onChange={event => onChange(param.key, event.target.value === '' ? undefined : event.target.value)}
      >
        <option value="">— wybierz —</option>
        {unavailable && <option value={current}>Wartość niedostępna</option>}
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {options.length === 0 && (
        <p className="automation-hint">
          {param.type === 'emailTemplate' ? 'Brak dostępnych szablonów e-mail.' : 'Brak dostępnych opcji do wyboru.'}
        </p>
      )}
    </div>
  );
}

function LookupParam({ param, value, readOnly, onChange }: ParamFieldProps) {
  if (!isLookupType(param.type)) return null;
  const type = param.type;
  return (
    <div className="automation-param">
      <span className={labelClass(param)}>{param.label}</span>
      {param.description && <p className="automation-hint">{param.description}</p>}
      <LookupSelect
        label={param.label}
        type={type}
        value={value}
        disabled={readOnly}
        onChange={(next, option: AutomationLookupOption | undefined) =>
          onChange(param.key, next, next !== undefined && option ? option.label : undefined)}
      />
    </div>
  );
}

export interface AutomationStepPanelProps {
  action: AutomationActionDefinition;
  stepNumber: number;
  params: AutomationParams;
  sources: DataSourceOption[];
  sourcesFailed: boolean;
  readOnly: boolean;
  onChange: ParamChangeHandler;
  onClose: () => void;
}

export function AutomationStepPanel({
  action,
  stepNumber,
  params,
  sources,
  sourcesFailed,
  readOnly,
  onChange,
  onClose,
}: AutomationStepPanelProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const fields = visibleParams(action, params);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <section
      ref={panelRef}
      className="automation-panel"
      aria-label={`Ustawienia kroku: ${action.label}`}
      tabIndex={-1}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="automation-panel__header">
        <div>
          <h4>{`Krok ${stepNumber}: ${action.label}`}</h4>
          <p className="automation-hint">{action.description}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Gotowe</button>
      </header>
      <div className="automation-panel__body">
        {fields.length === 0 && <p className="automation-hint">Ten krok nie wymaga żadnych ustawień.</p>}
        {fields.map(param => {
          const value = params[param.key];
          const common = { param, value, readOnly, onChange };
          if (param.type === 'text' || param.type === 'longText') {
            return <TextParam key={param.key} {...common} sources={sources} sourcesFailed={sourcesFailed} />;
          }
          if (param.type === 'number') return <NumberParam key={param.key} {...common} />;
          if (param.type === 'boolean') return <BooleanParam key={param.key} {...common} />;
          if (isLookupType(param.type)) return <LookupParam key={`${param.key}:${param.type}`} {...common} />;
          return <SelectParam key={param.key} {...common} />;
        })}
      </div>
    </section>
  );
}
