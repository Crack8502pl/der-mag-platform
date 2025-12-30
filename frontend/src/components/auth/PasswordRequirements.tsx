// src/components/auth/PasswordRequirements.tsx
// Visual indicator for password requirements

import React from 'react';
import { usePasswordValidation } from '../../hooks/usePasswordValidation';
import './PasswordRequirements.css';

interface PasswordRequirementsProps {
  password: string;
  confirmPassword?: string;
}

// Move RequirementItem outside the component to avoid creating it during render
const RequirementItem: React.FC<{ met: boolean; text: string }> = ({ met, text }) => (
  <div className={`requirement-item ${met ? 'met' : 'unmet'}`}>
    <span className="requirement-icon">{met ? '✓' : '✗'}</span>
    <span className="requirement-text">{text}</span>
  </div>
);

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
  password,
  confirmPassword,
}) => {
  const validation = usePasswordValidation(password);
  const passwordsMatch = confirmPassword ? password === confirmPassword : true;

  return (
    <div className="password-requirements">
      <h4 className="requirements-title">Wymagania hasła:</h4>
      <RequirementItem met={validation.requirements.length} text="8-12 znaków" />
      <RequirementItem met={validation.requirements.uppercase} text="Minimum 1 duża litera (A-Z)" />
      <RequirementItem met={validation.requirements.number} text="Minimum 1 cyfra (0-9)" />
      <RequirementItem
        met={validation.requirements.specialChar}
        text="Minimum 1 znak specjalny (!@#$%^&*)"
      />
      {confirmPassword !== undefined && (
        <RequirementItem met={passwordsMatch} text="Hasła są identyczne" />
      )}
    </div>
  );
};
