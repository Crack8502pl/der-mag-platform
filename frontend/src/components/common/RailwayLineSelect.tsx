// frontend/src/components/common/RailwayLineSelect.tsx
// Autocomplete select for PKP PLK railway lines.
// Returns the line code (e.g. "LK-221") via onChange.

import React, { useState, useRef, useEffect } from 'react';
import { useLineSearch } from '../../hooks/useRailwayAutocomplete';
import { formatLiniaKolejowa } from '../contracts/wizard/utils/validation';

interface RailwayLineSelectProps {
  value: string;
  onChange: (code: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
}

export const RailwayLineSelect: React.FC<RailwayLineSelectProps> = ({
  value,
  onChange,
  onBlur,
  placeholder = 'np. LK-221, E-20',
  required,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep input in sync when value changes externally
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const { lines, loading } = useLineSearch(open ? inputValue : '');

  const handleSelect = (code: string) => {
    setInputValue(code);
    onChange(code);
    setOpen(false);
  };

  const handleBlur = () => {
    // Short delay so click on dropdown item fires first
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        // Fallback: apply formatLiniaKolejowa normalization when input is unrecognized
        if (inputValue.trim()) {
          const formatted = formatLiniaKolejowa(inputValue.trim());
          setInputValue(formatted);
          onChange(formatted);
        }
        setOpen(false);
        onBlur?.();
      }
    }, 150);
  };

  return (
    <div className="railway-line-select" ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={inputValue}
        placeholder={placeholder}
        required={required}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        autoComplete="off"
      />

      {open && (inputValue.length > 0 || lines.length > 0) && (
        <div className="railway-dropdown">
          {loading && (
            <div className="railway-dropdown-item railway-dropdown-loading">
              Wyszukiwanie…
            </div>
          )}
          {!loading && lines.length === 0 && inputValue.trim().length > 0 && (
            <div className="railway-dropdown-item railway-dropdown-empty">
              Brak wyników — wpisz kod ręcznie
            </div>
          )}
          {lines.map((line) => (
            <button
              key={line.code}
              type="button"
              className="railway-dropdown-item"
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur before click
                handleSelect(line.code);
              }}
            >
              <span className="railway-line-code">{line.code}</span>
              <span className="railway-line-name"> — {line.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
