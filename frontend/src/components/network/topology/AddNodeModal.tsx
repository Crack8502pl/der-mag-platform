// src/components/network/topology/AddNodeModal.tsx
// Modal for adding a new node to the network topology canvas

import React, { useState } from 'react';
import type { TopologyNode, NodeType } from '../../../types/network-topology.types';
import '../../../styles/grover-theme.css';

interface AddNodeModalProps {
  onAdd: (node: Omit<TopologyNode, 'id' | 'position'>) => void;
  onClose: () => void;
}

const NODE_TYPES: NodeType[] = ['task', 'auxiliary', 'external'];

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  task: 'Zadanie',
  auxiliary: 'Obiekt pomocniczy',
  external: 'Zewnętrzny',
};

export const AddNodeModal: React.FC<AddNodeModalProps> = ({ onAdd, onClose }) => {
  const [type, setType] = useState<NodeType>('task');
  const [label, setLabel] = useState('');
  const [kilometre, setKilometre] = useState('');
  const [labelError, setLabelError] = useState('');

  const handleSubmit = () => {
    if (!label.trim()) {
      setLabelError('Nazwa węzła jest wymagana');
      return;
    }

    const nodeData: Omit<TopologyNode, 'id' | 'position'> = {
      type,
      label: label.trim(),
      data: {},
    };

    if (kilometre !== '') {
      const parsed = parseFloat(kilometre);
      if (!isNaN(parsed)) {
        nodeData.data.km = parsed;
      }
    }

    onAdd(nodeData);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '480px' }}
      >
        <div className="modal-header">
          <h2>➕ Dodaj węzeł</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-form" onKeyDown={handleKeyDown}>
          <div className="form-group">
            <label>Typ węzła</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as NodeType)}
            >
              {NODE_TYPES.map(t => (
                <option key={t} value={t}>{NODE_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              Nazwa / etykieta <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="np. LCS Katowice"
              value={label}
              autoFocus
              onChange={e => {
                setLabel(e.target.value);
                if (labelError) setLabelError('');
              }}
            />
            {labelError && <span className="error-text">{labelError}</span>}
          </div>

          <div className="form-group">
            <label>Kilometraż (opcjonalne)</label>
            <input
              type="number"
              placeholder="np. 123.4"
              value={kilometre}
              onChange={e => setKilometre(e.target.value)}
              step="0.1"
              min="0"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Anuluj
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            Dodaj węzeł
          </button>
        </div>
      </div>
    </div>
  );
};
