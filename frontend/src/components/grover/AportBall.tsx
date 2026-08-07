// src/components/grover/AportBall.tsx
// Pulsing red ball for the 'aport' Easter egg command

import React from 'react';
import './AportBall.css';

interface AportBallProps {
  onClick: () => void;
}

export const AportBall: React.FC<AportBallProps> = ({ onClick }) => (
  <button
    className="aport-ball"
    onClick={onClick}
    aria-label="Złap piłkę!"
    title="Złap piłkę!"
    type="button"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="80" height="80" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#e53e3e" />
      <path
        d="M10 32 Q32 8 54 32"
        stroke="white"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M10 32 Q32 56 54 32"
        stroke="white"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  </button>
);
