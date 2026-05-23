import { renderHook } from '@testing-library/react';

import { usePasswordMatch, usePasswordValidation } from './usePasswordValidation';

describe('usePasswordValidation', () => {
  it('puste hasło: isValid=false i wszystkie requirements=false', () => {
    const { result } = renderHook(() => usePasswordValidation(''));

    expect(result.current.isValid).toBe(false);
    expect(result.current.requirements).toEqual({
      length: false,
      uppercase: false,
      number: false,
      specialChar: false,
    });
  });

  it('hasło krótsze niż 8 znaków ma length=false', () => {
    const { result } = renderHook(() => usePasswordValidation('Aa1!aaa'));

    expect(result.current.requirements.length).toBe(false);
  });

  it('hasło dłuższe niż 12 znaków ma length=false', () => {
    const { result } = renderHook(() => usePasswordValidation('Aa1!aaaaaaaaa'));

    expect(result.current.requirements.length).toBe(false);
  });

  it('hasło 8–12 znaków z wielką literą, cyfrą i znakiem specjalnym jest poprawne', () => {
    const { result } = renderHook(() => usePasswordValidation('Abcd123!'));

    expect(result.current.isValid).toBe(true);
  });

  it('brak wielkiej litery ustawia uppercase=false', () => {
    const { result } = renderHook(() => usePasswordValidation('abcd123!'));

    expect(result.current.requirements.uppercase).toBe(false);
  });

  it('brak cyfry ustawia number=false', () => {
    const { result } = renderHook(() => usePasswordValidation('Abcdefg!'));

    expect(result.current.requirements.number).toBe(false);
  });

  it('brak znaku specjalnego ustawia specialChar=false', () => {
    const { result } = renderHook(() => usePasswordValidation('Abcd1234'));

    expect(result.current.requirements.specialChar).toBe(false);
  });
});

describe('usePasswordMatch', () => {
  it('puste pola zwracają false', () => {
    const { result } = renderHook(() => usePasswordMatch('', ''));

    expect(result.current).toBe(false);
  });

  it('różne hasła zwracają false', () => {
    const { result } = renderHook(() => usePasswordMatch('Abcd123!', 'Abcd1234!'));

    expect(result.current).toBe(false);
  });

  it('identyczne hasła zwracają true', () => {
    const { result } = renderHook(() => usePasswordMatch('Abcd123!', 'Abcd123!'));

    expect(result.current).toBe(true);
  });
});
