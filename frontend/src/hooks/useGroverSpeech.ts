// src/hooks/useGroverSpeech.ts
// Web Speech API integration for Grover Easter Eggs
// Closes #601

import { useEffect, useRef } from 'react';

export function useGroverSpeech() {
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return; // silent fallback

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.lang = 'pl-PL';
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript
        .trim()
        .toLowerCase();

      if (transcript.includes('głos')) {
        const audio = new Audio('/assets/sounds/bark.mp3');
        audio.play().catch((err) => {
          console.warn('[Grover Audio] Autoplay blocked:', err);
        });
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== 'no-speech') {
        console.warn('[Grover Speech] Error:', e.error);
      }
    };

    recognition.onend = () => {
      try {
        recognition.start();
      } catch {
        // already stopped / page unloading
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.warn('[Grover Speech] Could not start recognition:', err);
    }

    return () => {
      recognition.onend = null;
      recognition.stop();
    };
  }, []);
}
