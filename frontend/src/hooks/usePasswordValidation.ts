// src/hooks/usePasswordValidation.ts
// Hook for real-time password validation

import { useMemo } from 'react';

export interface PasswordValidationResult {
  isValid: boolean;
  requirements: {
    length: boolean;
    uppercase: boolean;
    number: boolean;
    specialChar: boolean;
  };
}

export const usePasswordValidation = (password: string): PasswordValidationResult => {
  const result = useMemo(() => {
    const requirements = {
      length: password.length >= 8 && password.length <= 12,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      specialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    const isValid = Object.values(requirements).every(req => req);

    return {
      isValid,
      requirements,
    };
  }, [password]);

  return result;
};

export const usePasswordMatch = (password: string, confirmPassword: string): boolean => {
  return useMemo(() => {
    if (!password || !confirmPassword) return false;
    return password === confirmPassword;
  }, [password, confirmPassword]);
};
