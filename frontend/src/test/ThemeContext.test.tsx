import { act, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

const ThemeProbe = () => {
  const { theme, effectiveTheme, setTheme } = useTheme();

  return (
    <>
      <div data-testid="theme">{theme}</div>
      <div data-testid="effectiveTheme">{effectiveTheme}</div>
      <button type="button" onClick={() => setTheme('husky')}>set-husky</button>
      <button type="button" onClick={() => setTheme('grover')}>set-grover</button>
      <button type="button" onClick={() => setTheme('auto')}>set-auto</button>
    </>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('domyślny motyw to grover', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('grover');
    expect(screen.getByTestId('effectiveTheme')).toHaveTextContent('grover');
  });

  it('setTheme("husky") zmienia theme i effectiveTheme na husky', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'set-husky' }).click();
    });

    expect(screen.getByTestId('theme')).toHaveTextContent('husky');
    expect(screen.getByTestId('effectiveTheme')).toHaveTextContent('husky');
  });

  it('setTheme("grover") ustawia data-theme="grover" na document.documentElement', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'set-grover' }).click();
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe('grover');
  });

  it('localStorage.setItem jest wywołany przy zmianie motywu', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'set-husky' }).click();
    });

    expect(setItemSpy).toHaveBeenCalledWith('der-mag-theme', 'husky');
  });

  it('setTheme("auto") ustawia effectiveTheme=husky w godzinach dziennych', () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(10);

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'set-auto' }).click();
    });

    expect(screen.getByTestId('effectiveTheme')).toHaveTextContent('husky');
  });

  it('setTheme("auto") ustawia effectiveTheme=grover w godzinach nocnych', () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(22);

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'set-auto' }).click();
    });

    expect(screen.getByTestId('effectiveTheme')).toHaveTextContent('grover');
  });
});
