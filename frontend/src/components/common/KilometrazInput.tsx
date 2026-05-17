// frontend/src/components/common/KilometrazInput.tsx
// Wrapper for the kilometraz field with optional range validation.
// When lineCode is provided, validates km against known line range on blur.

import React, { useState } from 'react';
import { cleanKilometrazInput } from '../contracts/wizard/utils/validation';
import { railwayService } from '../../services/railway.service';

interface KilometrazInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  lineCode?: string;
  required?: boolean;
  placeholder?: string;
}

interface RangeWarning {
  km: number;
  lineCode: string;
  min: number;
  max: number;
}

export const KilometrazInput: React.FC<KilometrazInputProps> = ({
  value,
  onChange,
  onBlur,
  lineCode,
  required,
  placeholder = '123456',
}) => {
  const [warning, setWarning] = useState<RangeWarning | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = cleanKilometrazInput(e.target.value);
    onChange(cleaned);
    // Clear warning on change
    setWarning(null);
  };

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    onBlur?.(raw);

    if (!lineCode || !raw.trim()) {
      return;
    }

    // Parse km value — support formats like "123,456" or "123.456" or "123+456"
    const normalised = raw.replace(',', '.').replace('+', '.');
    const km = parseFloat(normalised);
    if (isNaN(km)) return;

    try {
      const result = await railwayService.validateKilometraz(km, lineCode);
      if (!result.valid) {
        setWarning({ km, lineCode, min: result.min, max: result.max });
      } else {
        setWarning(null);
      }
    } catch {
      // Network error — silently ignore
    }
  };

  return (
    <div className="kilometraz-input-wrapper">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {warning && (
        <small className="form-help text-warning" style={{ color: 'var(--warning-color, #f59e0b)' }}>
          ⚠️ Kilometraż {warning.km} poza zakresem linii {warning.lineCode} ({warning.min}–{warning.max} km)
        </small>
      )}
    </div>
  );
};
