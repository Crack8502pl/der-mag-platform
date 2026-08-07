// src/hooks/__tests__/useGroverUniverse.test.ts
// Tests for useGroverUniverse hook — covers #597 #598 #599 #600

import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGroverUniverse } from '../useGroverUniverse';

// Mock window.matchMedia
function mockMatchMedia(dark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes('prefers-color-scheme: dark') ? dark : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function fireKeys(chars: string) {
  for (const ch of chars) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true }));
  }
}

describe('useGroverUniverse — keyboard commands', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMatchMedia(false);
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1280 });
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 720 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // #597 — typing 'grover' sets activeModal = 'grover'
  it('wpisanie "grover" ustawia activeModal = "grover"', () => {
    const { result } = renderHook(() => useGroverUniverse());

    act(() => { fireKeys('grover'); });

    expect(result.current.activeModal).toBe('grover');
  });

  // #597 — typing 'admin' sets activeModal = 'admin'
  it('wpisanie "admin" ustawia activeModal = "admin"', () => {
    const { result } = renderHook(() => useGroverUniverse());

    act(() => { fireKeys('admin'); });

    expect(result.current.activeModal).toBe('admin');
  });

  // #597 — closeModal() resets activeModal to null
  it('closeModal() ustawia activeModal = null', () => {
    const { result } = renderHook(() => useGroverUniverse());

    act(() => { fireKeys('grover'); });
    expect(result.current.activeModal).toBe('grover');

    act(() => { result.current.closeModal(); });
    expect(result.current.activeModal).toBeNull();
  });

  // #597 — focus on INPUT resets buffer, command does not fire
  it('focus na INPUT blokuje komendę', () => {
    const { result } = renderHook(() => useGroverUniverse());

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    act(() => { fireKeys('grover'); });

    expect(result.current.activeModal).toBeNull();
    document.body.removeChild(input);
  });

  // #597 — Shift modifier resets buffer
  it('Shift modifier resetuje bufor', () => {
    const { result } = renderHook(() => useGroverUniverse());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', shiftKey: true }));
      fireKeys('rover');
    });

    expect(result.current.activeModal).toBeNull();
  });

  // #598 — 'auto' dark mode → grover theme
  it('komenda "auto" — system dark → data-theme = "grover"', () => {
    mockMatchMedia(true);
    renderHook(() => useGroverUniverse());

    act(() => { fireKeys('auto'); });

    expect(document.documentElement.getAttribute('data-theme')).toBe('grover');
  });

  // #598 — 'auto' light mode → husky theme
  it('komenda "auto" — system light → data-theme = "husky"', () => {
    mockMatchMedia(false);
    renderHook(() => useGroverUniverse());

    act(() => { fireKeys('auto'); });

    expect(document.documentElement.getAttribute('data-theme')).toBe('husky');
  });

  // #599 — 'piesek' activates paw overlay
  it('komenda "piesek" → pawsActive = true i interwał uruchamia paws', () => {
    const { result } = renderHook(() => useGroverUniverse());

    act(() => { fireKeys('piesek'); });

    expect(result.current.pawsActive).toBe(true);

    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current.paws.length).toBeGreaterThan(0);
  });

  // #599 — 'siad' clears paws
  it('komenda "siad" → pawsActive = false i paws = []', () => {
    const { result } = renderHook(() => useGroverUniverse());

    act(() => { fireKeys('piesek'); });
    act(() => { vi.advanceTimersByTime(800); });

    act(() => { fireKeys('siad'); });

    expect(result.current.pawsActive).toBe(false);
    expect(result.current.paws).toHaveLength(0);
  });

  // #600 — 'aport' sets showBall = true (reduced-motion = false)
  it('komenda "aport" → showBall = true', () => {
    // ensure reduced motion is false
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn(() => ({
        matches: false,
        media: '',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useGroverUniverse());

    act(() => { fireKeys('aport'); });

    expect(result.current.showBall).toBe(true);
  });

  // #600 — handleBallClick hides ball
  it('handleBallClick() ustawia showBall = false', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn(() => ({
        matches: false,
        media: '',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useGroverUniverse());

    act(() => { fireKeys('aport'); });
    expect(result.current.showBall).toBe(true);

    act(() => { result.current.handleBallClick(); });
    expect(result.current.showBall).toBe(false);
  });
});
