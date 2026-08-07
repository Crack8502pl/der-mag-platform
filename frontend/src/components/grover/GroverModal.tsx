// src/components/grover/GroverModal.tsx
// Easter egg modal showing Grover photo

import React, { useEffect } from 'react';
import './grover-modals.css';

interface GroverModalProps {
  onClose: () => void;
}

export const GroverModal: React.FC<GroverModalProps> = ({ onClose }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="grover-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Grover">
      <div className="grover-modal" onClick={e => e.stopPropagation()}>
        <button className="grover-modal__close" onClick={onClose} aria-label="Zamknij">✕</button>
        <img
          src="/assets/images/grover.webp"
          alt="Grover"
          className="grover-modal__img"
          onError={(e) => { (e.currentTarget as HTMLImageElement).alt = '🐕'; }}
        />
        <p className="grover-modal__caption">🐕 Grover!</p>
      </div>
    </div>
  );
};
