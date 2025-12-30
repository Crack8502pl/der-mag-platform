// src/components/common/PasswordInput.tsx
// Password input with show/hide toggle

import React, { useState } from 'react';
import './PasswordInput.css';

interface PasswordInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  name,
  value,
  onChange,
  placeholder = 'Hasło',
  autoComplete = 'current-password',
  error = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="password-input-wrapper">
      <input
        type={showPassword ? 'text' : 'password'}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        className={`input ${error ? 'input-error' : ''}`}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setShowPassword(!showPassword)}
        aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
      >
        {showPassword ? '🙈' : '👁️'}
      </button>
    </div>
  );
};
