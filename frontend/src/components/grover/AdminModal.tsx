// src/components/grover/AdminModal.tsx
// Easter egg modal showing admin photo

import React, { useEffect } from 'react';
import './grover-modals.css';

interface AdminModalProps {
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ onClose }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="grover-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Admin">
      <div className="grover-modal" onClick={e => e.stopPropagation()}>
        <button className="grover-modal__close" onClick={onClose} aria-label="Zamknij">✕</button>
        <img
          src="/assets/images/my-admin-photo.webp"
          alt="Admin"
          className="grover-modal__img"
          onError={(e) => { (e.currentTarget as HTMLImageElement).alt = '👤'; }}
        />
        <p className="grover-modal__caption">👤 Admin</p>
      </div>
    </div>
  );
};
