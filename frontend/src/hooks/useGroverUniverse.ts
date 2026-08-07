// src/hooks/useGroverUniverse.ts
// Central hook for Grover Universe Easter Eggs
// Closes #597 #598 #599 #600

import { useEffect, useRef, useState } from 'react';

const KEYWORDS = ['grover', 'admin', 'auto', 'piesek', 'siad', 'aport', 'aportu'];

export interface Paw {
  x: number;
  y: number;
  rotation: number;
  id: number;
}

export function useGroverUniverse() {
  const [activeModal, setActiveModal] = useState<'grover' | 'admin' | null>(null);
  const [paws, setPaws] = useState<Paw[]>([]);
  const [pawsActive, setPawsActive] = useState(false);
  const [showBall, setShowBall] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appContainerRef = useRef<HTMLElement | null>(null);

  // --- piesek / siad ---
  function startPiesek() {
    setPawsActive(true);
    let id = 0;
    intervalRef.current = setInterval(() => {
      setPaws(prev => [
        ...prev.slice(-19), // keep last 19 + 1 new = max 20
        {
          x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : 0,
          y: typeof window !== 'undefined' ? Math.random() * window.innerHeight : 0,
          rotation: Math.random() * 360,
          id: id++,
        },
      ]);
    }, 400);
  }

  function stopPiesek() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPawsActive(false);
    setPaws([]);
  }

  // --- auto theme (#598) ---
  function applyAutoTheme() {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const isDark = mq.media === 'not all' ? false : mq.matches;
    const theme = isDark ? 'grover' : 'husky';
    document.documentElement.setAttribute('data-theme', theme);
  }

  // --- aport (#600) ---
  function triggerAport() {
    if (typeof window !== 'undefined') {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) return;
    }
    const el = appContainerRef.current;
    if (el) {
      el.style.setProperty('--crash-angle', `${(Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 20)}deg`);
      el.classList.remove('bounce-back');
      el.classList.add('crash-down');
    }
    setShowBall(true);
  }

  function handleBallClick() {
    const el = appContainerRef.current;
    if (el) {
      el.classList.remove('crash-down');
      el.classList.add('bounce-back');
    }
    setShowBall(false);
    setTimeout(() => {
      appContainerRef.current?.classList.remove('bounce-back');
    }, 1000);
  }

  // --- command dispatcher ---
  function handleCommand(match: string) {
    switch (match) {
      case 'grover':
        setActiveModal('grover');
        break;
      case 'admin':
        setActiveModal('admin');
        break;
      case 'auto':
        applyAutoTheme();
        break;
      case 'piesek':
        if (!pawsActive) startPiesek();
        break;
      case 'siad':
        stopPiesek();
        break;
      case 'aport':
      case 'aportu':
        triggerAport();
        break;
    }
  }

  // --- keyboard listener ---
  useEffect(() => {
    let buffer = '';

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        buffer = '';
        return;
      }
      if (e.shiftKey || e.getModifierState('CapsLock')) {
        buffer = '';
        return;
      }

      buffer += e.key.toLowerCase();

      const match = KEYWORDS.find(kw => buffer.endsWith(kw));
      if (match) {
        handleCommand(match);
        buffer = '';
      }

      if (buffer.length > 20) buffer = buffer.slice(-20);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pawsActive]);

  // --- cleanup interval on unmount ---
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    activeModal,
    closeModal: () => setActiveModal(null),
    paws,
    pawsActive,
    showBall,
    handleBallClick,
    appContainerRef,
  };
}
