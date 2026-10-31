import { useEffect, useId, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formsService } from '../../services/forms.service';
import type { FormBrandingElement, FormBrandingSnapshot, FormVersion } from '../../types/forms.types';
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
  instanceId?: number;
  initialValues?: FormValues;
  onSubmit?: (responses: FormValues, version: FormVersion) => Promise<void> | void;
  submitLabel?: string;
  requireRequired?: boolean;
  disabled?: boolean;
}

export function DynamicFormRenderer(props: DynamicFormRendererProps) {
  const { versionId, instanceId } = props;
  const [loaded, setLoaded] = useState<{
    versionId: number;
    version?: FormVersion;
    initialValues?: FormValues;
    error?: string;
  }>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!Number.isInteger(versionId) || versionId <= 0 || versionId > 2147483647) return;
    if (instanceId !== undefined && (!Number.isInteger(instanceId) || instanceId <= 0 || instanceId > 2147483647)) return;
    formsService.getVersion(versionId).then(async version => {
      if (cancelled) return;
      if (version.id !== versionId) {
        setLoaded({ versionId, error: 'API zwróciło inną wersję formularza.' });
        return;
      }
      const error = getDefinitionError(version);
      if (error) {
        setLoaded({ versionId, error });
        return;
      }
      const initialValues = instanceId === undefined
        ? props.initialValues
        : await formsService.getInstanceValues(instanceId, version);
      if (!cancelled) setLoaded({ versionId, version, initialValues });
    }).catch(() => {
      if (!cancelled) setLoaded({ versionId, error: 'Nie udało się pobrać wersji formularza.' });
    });
    return () => { cancelled = true; };
  }, [versionId, instanceId, attempt, props.initialValues]);

  if (!Number.isInteger(versionId) || versionId <= 0 || versionId > 2147483647) {
    return <div className="dynamic-form" role="alert">Nieprawidłowy identyfikator wersji formularza.</div>;
  }
  if (instanceId !== undefined && (!Number.isInteger(instanceId) || instanceId <= 0 || instanceId > 2147483647)) {
    return <div className="dynamic-form" role="alert">Nieprawidłowy identyfikator instancji formularza.</div>;
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
  return <FormRuntime
    key={`${versionId}-${instanceId ?? 'preview'}-${attempt}`}
    {...props}
    initialValues={loaded.initialValues ?? props.initialValues}
    version={loaded.version}
  />;
}

function FormRuntime({
  version,
  instanceId,
  initialValues = EMPTY_VALUES,
  onSubmit,
  submitLabel = 'Zapisz odpowiedzi',
  requireRequired = true,
  disabled = false,
}: DynamicFormRendererProps & { version: FormVersion }) {
  const id = useId();
  const [submitError, setSubmitError] = useState('');
  const [refreshError, setRefreshError] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [runtimeValues, setRuntimeValues] = useState(initialValues);
  useEffect(() => setRuntimeValues(initialValues), [initialValues]);
  const [brandingAssets, setBrandingAssets] = useState<Record<string, string>>({});
  const [brandingError, setBrandingError] = useState('');
  useEffect(() => {
    let cancelled = false;
    const createdUrls: string[] = [];
    const assets: Array<{ key: string; load: () => Promise<Blob> }> = [];
    for (const snapshot of [version.headerSnapshot, version.footerSnapshot]) {
      if (!snapshot) continue;
      if (snapshot.mode === 'FILE' && snapshot.fileMime && snapshot.filePath) {
        assets.push({ key: `branding:${snapshot.id}`, load: () => formsService.getBrandingSnapshotFile(snapshot.filePath!) });
      }
      if (snapshot.mode === 'CUSTOM' && snapshot.layout) {
        for (const column of Object.values(snapshot.layout.columns)) {
          for (const item of column) {
            if (item.type === 'logo' && item.assetPath) {
              const fileName = item.assetPath.split('/').pop()!;
              assets.push({ key: item.assetPath, load: () => formsService.getBrandingLogo(fileName) });
            }
          }
        }
      }
    }
    if (!assets.length) {
      setBrandingAssets({});
      setBrandingError('');
      return () => { cancelled = true; };
    }
    Promise.all(assets.map(async asset => {
      const url = URL.createObjectURL(await asset.load());
      createdUrls.push(url);
      return [asset.key, url] as const;
    })).then(entries => {
      if (cancelled) {
        createdUrls.forEach(url => URL.revokeObjectURL(url));
        return;
      }
      setBrandingAssets(Object.fromEntries(entries));
      setBrandingError('');
    }).catch(() => {
      if (!cancelled) setBrandingError('Nie udało się załadować logo formularza.');
    });
    return () => {
      cancelled = true;
      createdUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [version.headerSnapshot, version.footerSnapshot]);
  const defaults = useMemo(() => Object.fromEntries(
    version.fields.filter(field => Object.hasOwn(runtimeValues, field.key))
      .map(field => [field.key, runtimeValues[field.key]]),
  ), [version, runtimeValues]);
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
  const refreshData = async () => {
    if (instanceId === undefined) return;
    setRefreshing(true);
    setRefreshError('');
    try {
      await formsService.refreshInstanceData(instanceId);
      setRuntimeValues(await formsService.getInstanceValues(instanceId, version));
      setSaved(false);
    } catch {
      setRefreshError('Nie udało się odświeżyć danych z zadania.');
    } finally {
      setRefreshing(false);
    }
  };
  const downloadPdf = async () => {
    if (instanceId === undefined) return;
    setDownloading(true);
    setDownloadError('');
    let url: string | undefined;
    try {
      const file = await formsService.getInstancePdf(instanceId);
      url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = `formularz-${instanceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setDownloadError('Nie udało się pobrać formularza PDF.');
    } finally {
      if (url) {
        const downloadUrl = url;
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
      }
      setDownloading(false);
    }
  };
  const renderBrandingElement = (item: FormBrandingElement, index: number) => {
    if (item.type === 'text') return <span key={`text-${index}`}>{item.text}</span>;
    if (item.type === 'logo') return item.assetPath && brandingAssets[item.assetPath]
      ? <img key={`logo-${index}`} src={brandingAssets[item.assetPath]} alt={item.alt || ''} />
      : null;
    if (item.type === 'variable') {
      const field = version.fields.find(candidate =>
        candidate.options.source === item.source ||
        candidate.options.variable === item.source ||
        candidate.options.expression === item.source);
      const value = field ? runtimeValues[field.key] : undefined;
      return <span key={`variable-${index}`}>{value === undefined || value === null ? item.source : String(value)}</span>;
    }
    if (item.type === 'pageNumber') return <span key={`page-number-${index}`}>1</span>;
    return <span key={`print-date-${index}`}>{new Date().toLocaleDateString()}</span>;
  };
  const renderBranding = (snapshot: FormBrandingSnapshot | null | undefined, position: 'header' | 'footer') => {
    if (!snapshot) return null;
    if (snapshot.mode === 'FILE') {
      const source = brandingAssets[`branding:${snapshot.id}`];
      if (snapshot.fileMime === 'application/pdf' && source) {
        return <div
          className={`dynamic-form__branding dynamic-form__branding--${position} dynamic-form__branding--pdf`}
          style={{ height: `${snapshot.heightMm}mm` }}
          key={snapshot.id}
        >
          <iframe src={`${source}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} title={snapshot.name} />
        </div>;
      }
      if (snapshot.fileMime?.startsWith('image/') && source) {
        return <div className={`dynamic-form__branding dynamic-form__branding--${position}`} key={snapshot.id}>
          <img
            src={source}
            alt={snapshot.name}
            style={{ maxHeight: `${snapshot.heightMm}mm` }}
          />
        </div>;
      }
      return null;
    }
    if (!snapshot.layout) return null;
    return <div
      className={`dynamic-form__branding dynamic-form__branding--${position}${snapshot.layout.separator ? ' has-separator' : ''}`}
      style={{ minHeight: `${snapshot.heightMm}mm` }}
      key={snapshot.id}
    >
      {(['left', 'center', 'right'] as const).map(column => <div key={column}>
        {snapshot.layout!.columns[column].map(renderBrandingElement)}
      </div>)}
    </div>;
  };

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
    {renderBranding(version.headerSnapshot, 'header')}
    <h2>{version.title}</h2>
    <p className="dynamic-form__hint">Wersja {version.version} · {version.status}</p>
    {version.description && <p>{version.description}</p>}
    {instanceId !== undefined && <button
      type="button"
      className="btn btn-secondary"
      disabled={disabled || isSubmitting || refreshing}
      onClick={() => void refreshData()}
    >{refreshing ? 'Odświeżanie…' : 'Odśwież dane z zadania'}</button>}
    {instanceId !== undefined && <button
      type="button"
      className="btn btn-secondary"
      disabled={isSubmitting || downloading}
      onClick={() => void downloadPdf()}
    >{downloading ? 'Generowanie PDF…' : 'Pobierz PDF'}</button>}
    {instanceId !== undefined && <small className="dynamic-form__hint">PDF zawiera ostatnio zapisane odpowiedzi.</small>}
    {refreshError && <p className="dynamic-form__error" role="alert">{refreshError}</p>}
    {downloadError && <p className="dynamic-form__error" role="alert">{downloadError}</p>}
    {brandingError && <p className="dynamic-form__error" role="alert">{brandingError}</p>}
    {visibleFields.length === 0 && <p role="status">Brak widocznych pól formularza.</p>}
    <fieldset disabled={disabled || isSubmitting} className="dynamic-form__body">
      {visibleSections.filter(section => section.fields.some(field => isFieldVisible(version, field, values)))
        .map(section => <section className="dynamic-form__section" key={section.id}>
          <h3>{section.title}</h3>
          {section.description && <p>{section.description}</p>}
          {section.fields.filter(field => isFieldVisible(version, field, values)).map(field => {
            const Component = fieldRegistry[field.fieldType.toUpperCase()];
            const inputId = `${id}:${field.key}:input`;
            const errorId = `${inputId}-error`;
            const required = isFieldRequired(field, values);
            const error = errors[field.key];
            return <div className="dynamic-form__field" key={field.key}>
              {field.fieldType.toUpperCase() === 'BOM_TABLE'
                ? <span id={`${inputId}-label`} className="dynamic-form__label">{field.label}{required && <span aria-label="wymagane"> *</span>}</span>
                : <label htmlFor={inputId}>{field.label}{required && <span aria-label="wymagane"> *</span>}</label>}
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
    {renderBranding(version.footerSnapshot, 'footer')}
  </form>;
}
