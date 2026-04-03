// src/components/common/PendingDraftsButton.tsx
// Przycisk z dropdown listą zaległych draftów wizardów

import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePendingDrafts, getWizardLabel, getWizardPath } from '../../hooks/usePendingDrafts';
import './PendingDraftsButton.css';

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading || drafts.length === 0) return null;

  const handleItemClick = (wizardType: string, meta: Record<string, unknown> | null) => {
    setOpen(false);
    navigate(getWizardPath(wizardType, meta));
  };

  return (
    <div className="pending-drafts-btn-wrapper" ref={wrapperRef}>
      <button
        className="btn btn-secondary pending-drafts-btn"
        onClick={() => setOpen((prev) => !prev)}
        title="Niedokończone kreatory"
      >
        📝 {drafts.length} {drafts.length === 1 ? 'Szkic' : 'Szkice'} ⚠️
      </button>

      {open && (
        <div className="pending-drafts-dropdown">
          <div className="pending-drafts-dropdown-header">Niedokończone kreatory</div>
          <ul className="pending-drafts-dropdown-list">
            {drafts.map((draft) => (
              <li
                key={draft.id}
                className="pending-drafts-item"
                onClick={() => handleItemClick(draft.wizardType, draft.metadata)}
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
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
