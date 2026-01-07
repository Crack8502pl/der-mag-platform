// src/components/common/ConfirmDialog.tsx
// Reusable confirmation dialog component

import React from 'react';
import './ConfirmDialog.css';

interface Props {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<Props> = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Potwierdź',
  cancelText = 'Anuluj',
  type = 'warning'
}) => {
  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className={`confirm-dialog-header ${type}`}>
          <h3>{title}</h3>
        </div>
        <div className="confirm-dialog-body">
          <p>{message}</p>
        </div>
        <div className="confirm-dialog-footer">
          <button className="btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button className={`btn-confirm btn-${type}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
