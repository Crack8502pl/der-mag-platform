import { useEffect, useId, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formsService } from '../../services/forms.service';
import type { FormVersion } from '../../types/forms.types';
import { fieldRegistry } from './fieldRegistry';
import {
  buildFormSchema,
  getDefinitionError,
  isFieldRequired,
  isFieldVisible,
  matchesCondition,
  type FormValues,
} from './formSchema';
import './DynamicFormRenderer.css';

const EMPTY_VALUES: FormValues = {};

export interface DynamicFormRendererProps {
  versionId: number;
  initialValues?: FormValues;
  onSubmit?: (responses: FormValues, version: FormVersion) => Promise<void> | void;
  submitLabel?: string;
  requireRequired?: boolean;
  disabled?: boolean;
}

export function DynamicFormRenderer(props: DynamicFormRendererProps) {
  const { versionId } = props;
  const [loaded, setLoaded] = useState<{ versionId: number; version?: FormVersion; error?: string }>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!Number.isInteger(versionId) || versionId <= 0 || versionId > 2147483647) return;
    formsService.getVersion(versionId).then(version => {
      if (cancelled) return;
      if (version.id !== versionId) {
        setLoaded({ versionId, error: 'API zwróciło inną wersję formularza.' });
        return;
      }
      const error = getDefinitionError(version);
      setLoaded(error ? { versionId, error } : { versionId, version });
    }).catch(() => {
      if (!cancelled) setLoaded({ versionId, error: 'Nie udało się pobrać wersji formularza.' });
    });
    return () => { cancelled = true; };
  }, [versionId, attempt]);

  if (!Number.isInteger(versionId) || versionId <= 0 || versionId > 2147483647) {
    return <div className="dynamic-form" role="alert">Nieprawidłowy identyfikator wersji formularza.</div>;
  }
  if (loaded?.versionId !== versionId) {
    return <div className="dynamic-form" role="status">Ładowanie formularza…</div>;
  }
  if (loaded.error) {
    return <div className="dynamic-form" role="alert">
      <p>{loaded.error}</p>
      <button type="button" className="btn btn-secondary" onClick={() => {
        setLoaded(undefined);
        setAttempt(current => current + 1);
      }}>Spróbuj ponownie</button>
    </div>;
  }
  if (!loaded.version) return null;
  return <FormRuntime key={`${versionId}-${attempt}`} {...props} version={loaded.version} />;
}

function FormRuntime({
  version,
  initialValues = EMPTY_VALUES,
  onSubmit,
  submitLabel = 'Zapisz odpowiedzi',
  requireRequired = true,
  disabled = false,
}: DynamicFormRendererProps & { version: FormVersion }) {
  const id = useId();
  const [submitError, setSubmitError] = useState('');
  const [saved, setSaved] = useState(false);
  const defaults = useMemo(() => Object.fromEntries(
    version.fields.filter(field => Object.hasOwn(initialValues, field.key))
      .map(field => [field.key, initialValues[field.key]]),
  ), [version, initialValues]);
  const schema = useMemo(() => buildFormSchema(version, requireRequired), [version, requireRequired]);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: defaults,
    shouldUnregister: false,
  });
  const values = useWatch({ control });
  const sections = useMemo(() => [...version.sections].sort((a, b) => a.sortOrder - b.sortOrder)
    .map(section => ({
      ...section,
      fields: version.fields.filter(field => field.sectionId === section.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    })), [version]);
  const visibleSections = sections.filter(section => matchesCondition(section.conditions?.visibleWhen, values));
  const visibleFields = visibleSections.flatMap(section => section.fields)
    .filter(field => isFieldVisible(version, field, values));

  return <form className="dynamic-form" noValidate onSubmit={handleSubmit(async responses => {
    if (!onSubmit || disabled) return;
    setSubmitError('');
    setSaved(false);
    try {
      await onSubmit(Object.fromEntries(Object.entries(responses).filter(([, value]) => value !== undefined)), version);
      setSaved(true);
    } catch {
      setSubmitError('Nie udało się zapisać odpowiedzi. Sprawdź uprawnienia i spróbuj ponownie.');
    }
  })}>
    <h2>{version.title}</h2>
    <p className="dynamic-form__hint">Wersja {version.version} · {version.status}</p>
    {version.description && <p>{version.description}</p>}
    {visibleFields.length === 0 && <p role="status">Brak widocznych pól formularza.</p>}
    <fieldset disabled={disabled || isSubmitting} className="dynamic-form__body">
      {visibleSections.filter(section => section.fields.some(field => isFieldVisible(version, field, values)))
        .map(section => <section className="dynamic-form__section" key={section.id}>
          <h3>{section.title}</h3>
          {section.description && <p>{section.description}</p>}
          {section.fields.filter(field => isFieldVisible(version, field, values)).map(field => {
            const Component = fieldRegistry[field.fieldType.toUpperCase()];
            const inputId = `${id}-${field.key}`;
            const errorId = `${inputId}-error`;
            const required = isFieldRequired(field, values);
            const error = errors[field.key];
            return <div className="dynamic-form__field" key={field.key}>
              <label htmlFor={inputId}>{field.label}{required && <span aria-label="wymagane"> *</span>}</label>
              <Controller name={field.key} control={control} render={({ field: input }) => <Component
                field={field}
                value={input.value}
                onChange={value => { input.onChange(value); setSaved(false); }}
                onBlur={input.onBlur}
                inputRef={input.ref}
                id={inputId}
                required={required}
                disabled={disabled || isSubmitting}
                errorId={error ? errorId : undefined}
              />} />
              {typeof field.options.unit === 'string' && <small className="dynamic-form__hint">{field.options.unit}</small>}
              {error && <p id={errorId} className="dynamic-form__error" role="alert">{String(error.message)}</p>}
            </div>;
          })}
        </section>)}
    </fieldset>
    {version.fields.filter(field => errors[field.key] && !isFieldVisible(version, field, values))
      .map(field => <p key={field.key} className="dynamic-form__error" role="alert">
        {field.label}: {String(errors[field.key]?.message)}
      </p>)}
    {submitError && <p className="dynamic-form__error" role="alert">{submitError}</p>}
    {saved && <p role="status">Odpowiedzi zostały zapisane.</p>}
    {onSubmit && <button className="btn btn-primary" type="submit" disabled={disabled || isSubmitting || version.fields.length === 0}>
      {isSubmitting ? 'Zapisywanie…' : submitLabel}
    </button>}
  </form>;
}
