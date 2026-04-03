// src/components/common/PendingDraftsButton.tsx
// Przycisk z dropdown listą zaległych draftów wizardów

import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePendingDrafts, getWizardLabel, getWizardPath } from '../../hooks/usePendingDrafts';
import './PendingDraftsButton.css';

const pluralizeDrafts = (count: number): string => {
  if (count === 1) return 'Szkic';
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'Szkice';
  return 'Szkiców';
};

const formatTimeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'przed chwilą';
  if (minutes < 60) return `${minutes} min temu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} godz. temu`;
  const days = Math.floor(hours / 24);
  return `${days} dni temu`;
};

export const PendingDraftsButton: React.FC = () => {
  const navigate = useNavigate();
  const { drafts, loading } = usePendingDrafts();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside — only active when dropdown is open
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (loading || drafts.length === 0) return null;

  const handleItemClick = (wizardType: string) => {
    setOpen(false);
    navigate(getWizardPath(wizardType));
  };

  return (
    <div className="pending-drafts-btn-wrapper" ref={wrapperRef}>
      <button
        className="btn btn-secondary pending-drafts-btn"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Niedokończone kreatory"
      >
        📝 {drafts.length} {pluralizeDrafts(drafts.length)} ⚠️
      </button>

      {open && (
        <div className="pending-drafts-dropdown" role="menu">
          <div className="pending-drafts-dropdown-header">Niedokończone kreatory</div>
          <ul className="pending-drafts-dropdown-list" role="presentation">
            {drafts.map((draft) => (
              <li key={draft.id} role="none">
                <button
                  className="pending-drafts-item"
                  role="menuitem"
                  onClick={() => handleItemClick(draft.wizardType)}
                >
                  <div className="pending-drafts-item-label">
                    {getWizardLabel(draft.wizardType)}
                  </div>
                  <div className="pending-drafts-item-meta">
                    {draft.currentStep != null && (
                      <span>Krok {draft.currentStep}</span>
                    )}
                    <span>{formatTimeAgo(draft.updatedAt)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
