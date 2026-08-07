// src/hooks/__tests__/useGroverSpeech.test.ts
// Tests for useGroverSpeech hook — covers #601

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGroverSpeech } from '../useGroverSpeech';

describe('useGroverSpeech', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });

  it('SpeechRecognition dostępne → inicjalizacja bez błędu', () => {
    const start = vi.fn();
    class MockSR {
      continuous = false; lang = ''; interimResults = true;
      onresult: any = null; onerror: any = null; onend: any = null;
      start = start; stop = vi.fn(); abort = vi.fn();
    }
    (window as any).SpeechRecognition = MockSR;

    expect(() => renderHook(() => useGroverSpeech())).not.toThrow();
    expect(start).toHaveBeenCalled();
  });

  it('SpeechRecognition niedostępne → cichy fallback, brak crash', () => {
    // no API on window
    expect(() => renderHook(() => useGroverSpeech())).not.toThrow();
  });

  it('cleanup → recognition.stop() wywołane', () => {
    const stop = vi.fn();
    class MockSR {
      continuous = false; lang = ''; interimResults = true;
      onresult: any = null; onerror: any = null; onend: any = null;
      start = vi.fn(); stop = stop; abort = vi.fn();
    }
    (window as any).webkitSpeechRecognition = MockSR;

    const { unmount } = renderHook(() => useGroverSpeech());
    unmount();

    expect(stop).toHaveBeenCalled();
  });

  it('transcript "głos" → audio.play() wywołane', () => {
    const playMock = vi.fn().mockResolvedValue(undefined);
    class MockAudio {
      src: string;
      constructor(src: string) { this.src = src; }
      play = playMock;
    }
    (window as any).Audio = MockAudio;

    let onresultCapture: ((e: any) => void) | null = null;

    class MockSR {
      continuous = false; lang = ''; interimResults = true;
      set onresult(fn: any) { onresultCapture = fn; }
      get onresult() { return onresultCapture; }
      onerror: any = null; onend: any = null;
      start = vi.fn(); stop = vi.fn(); abort = vi.fn();
    }
    (window as any).SpeechRecognition = MockSR;

    renderHook(() => useGroverSpeech());

    if (onresultCapture) {
      (onresultCapture as any)({
        resultIndex: 0,
        results: [[{ transcript: 'głos psa' }]],
      });
    }

    expect(playMock).toHaveBeenCalled();
  });
});
