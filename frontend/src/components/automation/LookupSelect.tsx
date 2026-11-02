// src/components/automation/LookupSelect.tsx
// Lista wyboru z wyszukiwaniem: osoba, rola, funkcja albo typ zadania.

import { useEffect, useState } from 'react';
import { automationService } from '../../services/automation.service';
import type { AutomationLookupOption, AutomationLookupType, AutomationParamValue } from '../../types/automation.types';

const SEARCH_DELAY_MS = 250;

interface LoadedLookup {
  search: string;
  options: AutomationLookupOption[];
  failed: boolean;
}

export interface LookupSelectProps {
  label: string;
  type: AutomationLookupType;
  value: AutomationParamValue | undefined;
  disabled?: boolean;
  onChange: (value: string | number | undefined, option?: AutomationLookupOption) => void;
}

export function LookupSelect({ label, type, value, disabled = false, onChange }: LookupSelectProps) {
  const [search, setSearch] = useState('');
  const [initialValue] = useState(value);
  const [loaded, setLoaded] = useState<LoadedLookup | null>(null);
  const [known, setKnown] = useState<Record<string, AutomationLookupOption>>({});
  const trimmed = search.trim();

  useEffect(() => {
    let cancelled = false;
    const selected = typeof initialValue === 'boolean' ? undefined : initialValue;
    const timer = window.setTimeout(() => {
      automationService.listLookups(type, { search: trimmed, value: selected })
        .then(options => {
          if (cancelled) return;
          setLoaded({ search: trimmed, options, failed: false });
          setKnown(current => ({
            ...current,
            ...Object.fromEntries(options.map(option => [String(option.value), option])),
          }));
        })
        .catch(() => {
          if (!cancelled) setLoaded({ search: trimmed, options: [], failed: true });
        });
    }, trimmed ? SEARCH_DELAY_MS : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [type, trimmed, initialValue]);

  const selectedKey = value === undefined ? '' : String(value);
  const options = loaded?.options ?? [];
  const inResults = options.some(option => String(option.value) === selectedKey);
  const remembered = selectedKey && !inResults ? known[selectedKey] : undefined;
  const visibleOptions = remembered ? [remembered, ...options] : options;
  const loading = !loaded || loaded.search !== trimmed;

  const handleChange = (raw: string) => {
    if (!raw) {
      onChange(undefined);
      return;
    }
    const option = visibleOptions.find(item => String(item.value) === raw);
    onChange(type === 'functionGroup' ? raw : Number(raw), option);
  };

  return (
    <div className="automation-lookup">
      <input
        type="search"
        className="automation-input"
        placeholder="Wpisz, aby wyszukać…"
        aria-label={`Szukaj: ${label}`}
        value={search}
        disabled={disabled}
        onChange={event => setSearch(event.target.value)}
      />
      <select
        className="automation-input"
        aria-label={label}
        value={selectedKey}
        disabled={disabled}
        onChange={event => handleChange(event.target.value)}
      >
        <option value="">— wybierz —</option>
        {selectedKey && !remembered && !inResults && (
          <option value={selectedKey}>{loaded ? 'Pozycja niedostępna' : 'Wczytywanie…'}</option>
        )}
        {visibleOptions.map(option => (
          <option key={String(option.value)} value={String(option.value)}>{option.label}</option>
        ))}
      </select>
      {loaded?.failed && <p className="automation-hint automation-hint--error" role="alert">Nie udało się wczytać listy.</p>}
      {loading && !loaded?.failed && <p className="automation-hint" role="status">Wczytywanie…</p>}
      {!loading && !loaded?.failed && options.length === 0 && (
        <p className="automation-hint">{trimmed ? 'Brak wyników wyszukiwania.' : 'Brak pozycji do wyboru.'}</p>
      )}
    </div>
  );
}
