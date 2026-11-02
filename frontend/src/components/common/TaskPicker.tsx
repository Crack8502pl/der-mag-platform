// src/components/common/TaskPicker.tsx
// Wybór zadania: wyszukiwanie po numerze i lista wyników. Używany w podglądzie formularza i w teście automatyzacji.

import React, { useEffect, useState } from 'react';
import taskService from '../../services/task.service';
import type { Task } from '../../types/task.types';

interface TaskPickerProps {
  value: Task | null;
  onChange: (task: Task | null) => void;
  /** Nazwa listy wyboru czytana przez czytniki ekranu. */
  selectLabel?: string;
  /** Opis pozycji „bez wyboru”. */
  emptyOptionLabel?: string;
  className?: string;
  /** Klasa komunikatu o błędzie wyszukiwania. */
  errorClassName?: string;
  disabled?: boolean;
}

interface SearchResult {
  search: string;
  tasks: Task[];
  failed: boolean;
}

const SEARCH_DELAY_MS = 250;

export const TaskPicker: React.FC<TaskPickerProps> = ({
  value,
  onChange,
  selectLabel = 'Zadanie',
  emptyOptionLabel = 'Wybierz zadanie',
  className,
  errorClassName,
  disabled = false,
}) => {
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const trimmed = search.trim();

  useEffect(() => {
    if (!trimmed) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      taskService.getAll({ search: trimmed, page: 1, limit: 20 }).then(response => {
        if (!cancelled) setResult({ search: trimmed, tasks: response.data, failed: false });
      }).catch(() => {
        if (!cancelled) setResult({ search: trimmed, tasks: [], failed: true });
      });
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  const current = trimmed && result?.search === trimmed ? result : null;
  const found = current?.tasks ?? [];
  const options = value && !found.some(task => task.id === value.id) ? [value, ...found] : found;

  return (
    <>
      <div className={className}>
        <label>Wyszukaj zadanie po numerze
          <input
            type="search"
            value={search}
            disabled={disabled}
            onChange={event => {
              setSearch(event.target.value);
              onChange(null);
            }}
            placeholder="np. Z00011026"
          />
        </label>
        <label>Zadanie
          <select
            aria-label={selectLabel}
            value={value ? String(value.id) : ''}
            disabled={disabled}
            onChange={event => onChange(options.find(task => String(task.id) === event.target.value) ?? null)}
          >
            <option value="">{emptyOptionLabel}</option>
            {options.map(task => (
              <option key={task.id} value={task.id}>{task.taskNumber} — {task.title}</option>
            ))}
          </select>
        </label>
      </div>
      {current?.failed && <p className={errorClassName} role="alert">Nie udało się wyszukać zadań.</p>}
    </>
  );
};
