import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formsService, type FormBrandingInput } from '../../services/forms.service';
import type {
  FormBranding, FormBrandingElement, FormBrandingKind, FormBrandingLayout, FormBrandingMode, FormBrandingSnapshot,
} from '../../types/forms.types';
import variableEngineService, { type VariableEngineVariable } from '../../services/variableEngine.service';
import { FormBrandingPreview } from '../forms/FormBrandingPreview';
import './FormBrandingLibraryPage.css';

type Column = keyof FormBrandingLayout['columns'];

const emptyLayout = (): FormBrandingLayout => ({
  columns: { left: [], center: [], right: [] },
  separator: true,
});

export function FormBrandingLibraryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FormBranding[]>([]);
  const [variables, setVariables] = useState<VariableEngineVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<FormBrandingKind>('HEADER');
  const [mode, setMode] = useState<FormBrandingMode>('CUSTOM');
  const [heightMm, setHeightMm] = useState(20);
  const [isDefault, setIsDefault] = useState(false);
  const [file, setFile] = useState<File>();
  const [layout, setLayout] = useState<FormBrandingLayout>(emptyLayout);
  const [column, setColumn] = useState<Column>('left');
  const [elementType, setElementType] = useState<FormBrandingElement['type']>('text');
  const [text, setText] = useState('');
  const [source, setSource] = useState('');
  const [logoAlt, setLogoAlt] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await formsService.listBranding();
      setItems(result);
    } catch {
      setError('Nie udało się pobrać biblioteki brandingu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    let active = true;
    variableEngineService.listVariables().then(result => {
      if (active) setVariables(result.filter(variable => variable.usableInForms));
    }).catch(() => {
      if (active) setError('Nie udało się pobrać dozwolonych źródeł zmiennych.');
    });
    return () => { active = false; };
  }, [reload]);

  const reset = () => {
    setEditingId(null);
    setCreating(false);
    setName('');
    setKind('HEADER');
    setMode('CUSTOM');
    setHeightMm(20);
    setIsDefault(false);
    setFile(undefined);
    setLayout(emptyLayout());
    setError('');
    setNotice('');
  };

  const edit = (item: FormBranding) => {
    setEditingId(item.id);
    setCreating(false);
    setName(item.name);
    setKind(item.kind);
    setMode(item.mode);
    setHeightMm(item.heightMm);
    setIsDefault(item.isDefault);
    setFile(undefined);
    setLayout(item.layout ?? emptyLayout());
    setError('');
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addElement = async (selectedFile?: File) => {
    let element: FormBrandingElement;
    if (elementType === 'text') {
      if (!text.trim()) { setError('Wpisz tekst elementu.'); return; }
      element = { type: 'text', text: text.trim() };
    } else if (elementType === 'variable') {
      if (!source) { setError('Wybierz dozwolone źródło danych.'); return; }
      element = { type: 'variable', source };
    } else if (elementType === 'logo') {
      if (!selectedFile) { setError('Wybierz obraz logo.'); return; }
      try {
        const uploaded = await formsService.uploadBrandingLogo(selectedFile);
        element = { type: 'logo', assetPath: uploaded.assetPath, alt: logoAlt.trim() || 'Logo' };
      } catch {
        setError('Nie udało się przesłać logo. Użyj prawidłowego pliku PNG lub JPG do 5 MB.');
        return;
      }
    } else {
      element = { type: elementType };
    }
    setLayout(current => ({
      ...current,
      columns: { ...current.columns, [column]: [...current.columns[column], element] },
    }));
    setText('');
    setLogoAlt('');
    setError('');
  };

  const removeElement = (targetColumn: Column, index: number) => {
    setLayout(current => ({
      ...current,
      columns: {
        ...current.columns,
        [targetColumn]: current.columns[targetColumn].filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const input: FormBrandingInput = {
      name: name.trim(), kind, mode, heightMm, isDefault,
      ...(mode === 'CUSTOM' ? { layout } : {}),
    };
    try {
      if (editingId === null) await formsService.createBranding(input, file);
      else await formsService.updateBranding(editingId, input, file);
      await reload();
      reset();
      setNotice('Element brandingu został zapisany.');
    } catch {
      setError('Nie udało się zapisać elementu. Sprawdź wymagane pola, format i limit pliku (5 MB).');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: FormBranding) => {
    if (!window.confirm(`Usunąć element „${item.name}”? Opublikowane formularze zachowają snapshot.`)) return;
    setError('');
    try {
      await formsService.deleteBranding(item.id);
      await reload();
      setNotice('Element został usunięty z biblioteki.');
      if (editingId === item.id) reset();
    } catch {
      setError('Nie udało się usunąć elementu brandingu.');
    }
  };

  const savedFile = editingId === null ? undefined : items.find(item => item.id === editingId);
  const startCreate = (selectedMode: FormBrandingMode) => {
    reset();
    setMode(selectedMode);
    setCreating(true);
  };
  const preview: FormBrandingSnapshot = {
    id: editingId ?? 0,
    name: name || (kind === 'HEADER' ? 'Nagłówek' : 'Stopka'),
    kind,
    mode,
    heightMm,
    filePath: file ? null : savedFile?.filePath ?? null,
    fileMime: file
      ? file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : null)
      : savedFile?.fileMime ?? null,
    layout: mode === 'CUSTOM' ? layout : null,
  };

  return <main className="form-branding">
    <header className="form-branding__header">
      <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/forms')}>← Edytor formularzy</button>
      <div><h1>Biblioteka nagłówków i stopek</h1><p>Elementy są kopiowane do niezmiennych snapshotów przy publikacji wersji.</p></div>
    </header>
    {error && <p className="form-branding__message form-branding__message--error" role="alert">{error}</p>}
    {notice && <p className="form-branding__message" role="status">{notice}</p>}

    {editingId === null && !creating && <div className="form-branding__create-actions">
      <button type="button" className="btn btn-primary" onClick={() => startCreate('FILE')}>Wgraj z pliku</button>
      <button type="button" className="btn btn-secondary" onClick={() => startCreate('CUSTOM')}>Utwórz własny</button>
    </div>}

    {(editingId !== null || creating) && <form className="form-branding__card" onSubmit={event => void save(event)}>
      <h2>{editingId === null ? 'Dodaj element' : `Edytuj element #${editingId}`}</h2>
      <div className="form-branding__fields">
        <label>Nazwa <input required maxLength={150} value={name} onChange={event => setName(event.target.value)} /></label>
        <label>Typ <select value={kind} disabled={editingId !== null} onChange={event => setKind(event.target.value as FormBrandingKind)}>
          <option value="HEADER">Nagłówek</option><option value="FOOTER">Stopka</option>
        </select></label>
        <label>Sposób utworzenia <select value={mode} disabled={editingId !== null} onChange={event => {
          setMode(event.target.value as FormBrandingMode);
          setFile(undefined);
        }}>
          <option value="CUSTOM">Własny układ</option><option value="FILE">Plik PNG, JPG lub PDF</option>
        </select></label>
        <label>Wysokość (mm) <input type="number" min={5} max={100} step={0.1} required value={heightMm} onChange={event => setHeightMm(Number(event.target.value))} /></label>
        <label className="form-branding__checkbox"><input type="checkbox" checked={isDefault} onChange={event => setIsDefault(event.target.checked)} /> Ustaw jako domyślny dla tego typu</label>
        {mode === 'FILE' && <label>Plik {editingId !== null && '(pozostaw puste, aby zachować obecny)'}
          <input type="file" accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf" required={editingId === null} onChange={event => setFile(event.target.files?.[0])} />
        </label>}
      </div>
      {mode === 'CUSTOM' && <section className="form-branding__layout">
        <h3>Układ trzech kolumn</h3>
        <label className="form-branding__checkbox"><input type="checkbox" checked={layout.separator} onChange={event => setLayout(current => ({ ...current, separator: event.target.checked }))} /> Linia oddzielająca</label>
        <div className="form-branding__fields">
          <label>Kolumna <select value={column} onChange={event => setColumn(event.target.value as Column)}>
            <option value="left">Lewa</option><option value="center">Środkowa</option><option value="right">Prawa</option>
          </select></label>
          <label>Element <select value={elementType} onChange={event => setElementType(event.target.value as FormBrandingElement['type'])}>
            <option value="text">Tekst</option><option value="variable">Zmienna systemowa</option><option value="logo">Logo</option>
            <option value="pageNumber">Numer strony</option><option value="printDate">Data wydruku</option>
          </select></label>
          {elementType === 'text' && <label>Tekst <input maxLength={250} value={text} onChange={event => setText(event.target.value)} /></label>}
          {elementType === 'variable' && <label>Źródło danych <select value={source} onChange={event => setSource(event.target.value)}>
            <option value="">Wybierz źródło</option>
            {variables.map(variable => <option value={variable.expression} key={variable.expression}>{variable.label || variable.description} · {variable.expression}</option>)}
          </select></label>}
          {elementType === 'logo' && <>
            <label>Opis logo <input maxLength={150} value={logoAlt} onChange={event => setLogoAlt(event.target.value)} /></label>
            <label>Logo PNG/JPG <input type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={event => {
              const selectedFile = event.target.files?.[0];
              if (selectedFile) void addElement(selectedFile);
              event.target.value = '';
            }} /></label>
          </>}
        </div>
        {elementType !== 'logo' && <button type="button" className="btn btn-secondary" onClick={() => void addElement()}>Dodaj element do kolumny</button>}
        <div className="form-branding__columns">
          {(['left', 'center', 'right'] as const).map(key => <div key={key}>
            <h4>{key === 'left' ? 'Lewa' : key === 'center' ? 'Środkowa' : 'Prawa'}</h4>
            {layout.columns[key].length === 0 && <p>Brak elementów</p>}
            {layout.columns[key].map((item, index) => <div className="form-branding__element" key={`${key}-${index}`}>
              <span>{item.type === 'text' ? item.text : item.type === 'variable' ? item.source : item.type}</span>
              <button type="button" className="btn btn-secondary" onClick={() => removeElement(key, index)} aria-label={`Usuń element ${index + 1} z kolumny ${key}`}>Usuń</button>
            </div>)}
          </div>)}
        </div>
      </section>}
      <section className="form-branding__live-preview" aria-labelledby="form-branding-preview-heading">
        <h3 id="form-branding-preview-heading">Podgląd A4</h3>
        <FormBrandingPreview snapshot={preview} file={file} />
      </section>
      <div className="form-branding__actions">
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Zapisywanie…' : 'Zapisz'}</button>
        <button type="button" className="btn btn-secondary" onClick={reset}>{editingId === null ? 'Anuluj' : 'Anuluj edycję'}</button>
      </div>
    </form>}

    <section className="form-branding__card">
      <h2>Zapisane elementy</h2>
      {loading ? <p role="status">Ładowanie biblioteki…</p> : items.length === 0 ? <p>Biblioteka jest pusta.</p> : (
        <div className="form-branding__list">{items.map(item => <article key={item.id}>
          <div><strong>{item.name}</strong><span>{item.kind === 'HEADER' ? 'Nagłówek' : 'Stopka'} · {item.mode === 'FILE' ? 'Plik' : 'Własny układ'} · {item.heightMm} mm{item.isDefault ? ' · domyślny' : ''}</span></div>
          <div className="form-branding__actions">
            <button type="button" className="btn btn-secondary" onClick={() => edit(item)}>Edytuj</button>
            <button type="button" className="btn btn-secondary" onClick={() => void remove(item)}>Usuń</button>
          </div>
        </article>)}</div>
      )}
    </section>
  </main>;
}
