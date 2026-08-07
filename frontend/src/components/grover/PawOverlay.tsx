// src/components/grover/PawOverlay.tsx
// Paw print overlay for the 'piesek' Easter egg command

import React from 'react';
import type { Paw } from '../../hooks/useGroverUniverse';
import './PawOverlay.css';

interface PawOverlayProps {
  paws: Paw[];
  active: boolean;
}

const PAW_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="40" height="40" aria-hidden="true">
    {/* main pad */}
    <ellipse cx="32" cy="44" rx="14" ry="12" fill="currentColor" />
    {/* toes */}
    <ellipse cx="16" cy="30" rx="6" ry="7" fill="currentColor" />
    <ellipse cx="26" cy="22" rx="6" ry="7" fill="currentColor" />
    <ellipse cx="38" cy="22" rx="6" ry="7" fill="currentColor" />
    <ellipse cx="48" cy="30" rx="6" ry="7" fill="currentColor" />
  </svg>
);

export const PawOverlay: React.FC<PawOverlayProps> = ({ paws, active }) => {
  if (!active && paws.length === 0) return null;

  return (
    <div className="paw-overlay" aria-hidden="true">
      {paws.map(paw => (
        <span
          key={paw.id}
          className="paw-overlay__paw"
          style={{
            left: paw.x,
            top: paw.y,
            transform: `rotate(${paw.rotation}deg)`,
            willChange: 'transform',
            animationDelay: `${(paw.id % 5) * 0.08}s`,
          }}
        >
          {PAW_SVG}
        </span>
      ))}
    </div>
  );
};
