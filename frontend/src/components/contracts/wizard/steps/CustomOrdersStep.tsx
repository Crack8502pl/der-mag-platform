// src/components/contracts/wizard/steps/CustomOrdersStep.tsx
// Step 9 (conditional): Custom / non-standard order items

import React, { useState } from 'react';
import type { WizardData, CustomOrderItem } from '../types/wizard.types';
import './CustomOrdersStep.css';

interface Props {
  wizardData: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
}

const EMPTY_ITEM: Omit<CustomOrderItem, 'id'> = {
  description: '',
  quantity: 1,
  unit: 'szt',
  notes: '',
};

export const CustomOrdersStep: React.FC<Props> = ({ wizardData, onUpdate }) => {
  const customOrders: CustomOrderItem[] = wizardData.customOrders || [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<CustomOrderItem, 'id'>>(EMPTY_ITEM);
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState<Omit<CustomOrderItem, 'id'>>(EMPTY_ITEM);

  const saveOrders = (updated: CustomOrderItem[]) => {
    onUpdate({ customOrders: updated });
  };

  const handleAdd = () => {
    if (!newForm.description.trim()) return;
    const item: CustomOrderItem = {
      id: crypto.randomUUID(),
      ...newForm,
    };
    saveOrders([...customOrders, item]);
    setNewForm(EMPTY_ITEM);
    setAdding(false);
  };

  const handleEditStart = (item: CustomOrderItem) => {
    setEditingId(item.id);
    setEditForm({ description: item.description, quantity: item.quantity, unit: item.unit, notes: item.notes });
  };

  const handleEditSave = () => {
    if (!editingId) return;
    const updated = customOrders.map((o) =>
      o.id === editingId ? { ...o, ...editForm } : o
    );
    saveOrders(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    saveOrders(customOrders.filter((o) => o.id !== id));
  };

  return (
    <div className="wizard-step-content custom-orders-step">
      <h3>📝 Zamówienia Niestandardowe</h3>
      <p className="step-description">
        Dodaj niestandardowe pozycje zamówienia poza standardową konfiguracją BOM.
      </p>

      <div className="custom-orders-list">
        {customOrders.length === 0 && !adding && (
          <p className="custom-orders-empty">Brak pozycji. Kliknij "Dodaj pozycję", aby dodać.</p>
        )}

        {customOrders.map((item, idx) => (
          <div key={item.id} className="custom-order-card">
            {editingId === item.id ? (
              /* Edit form inline */
              <div className="custom-order-edit-form">
                <div className="form-row">
                  <div className="form-group" style={{ flex: 3 }}>
                    <label>Opis pozycji *</label>
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="np. Kabel specjalny 50m"
                      autoFocus
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Ilość *</label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.quantity}
                      onChange={(e) => setEditForm({ ...editForm, quantity: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Jednostka</label>
                    <input
                      type="text"
                      value={editForm.unit}
                      onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                      placeholder="szt / mb / kpl"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Uwagi</label>
                  <textarea
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Dodatkowe informacje..."
                    rows={2}
                  />
                </div>
                <div className="custom-order-edit-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>
                    ✕ Anuluj
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleEditSave}
                    disabled={!editForm.description.trim()}
                  >
                    💾 Zapisz
                  </button>
                </div>
              </div>
            ) : (
              /* Display mode */
              <div className="custom-order-display">
                <div className="custom-order-index">{idx + 1}.</div>
                <div className="custom-order-content">
                  <div className="custom-order-description">{item.description}</div>
                  <div className="custom-order-meta">
                    Ilość: <strong>{item.quantity} {item.unit}</strong>
                    {item.notes && <> · Uwagi: {item.notes}</>}
                  </div>
                </div>
                <div className="custom-order-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleEditStart(item)}
                    title="Edytuj"
                  >
                    ✏️ Edytuj
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(item.id)}
                    title="Usuń"
                  >
                    🗑️ Usuń
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add new item form */}
        {adding ? (
          <div className="custom-order-card custom-order-add-card">
            <div className="form-row">
              <div className="form-group" style={{ flex: 3 }}>
                <label>Opis pozycji *</label>
                <input
                  type="text"
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  placeholder="np. Kabel specjalny 50m"
                  autoFocus
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Ilość *</label>
                <input
                  type="number"
                  min={0}
                  value={newForm.quantity}
                  onChange={(e) => setNewForm({ ...newForm, quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Jednostka</label>
                <input
                  type="text"
                  value={newForm.unit}
                  onChange={(e) => setNewForm({ ...newForm, unit: e.target.value })}
                  placeholder="szt / mb / kpl"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Uwagi</label>
              <textarea
                value={newForm.notes || ''}
                onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                placeholder="Dodatkowe informacje..."
                rows={2}
              />
            </div>
            <div className="custom-order-edit-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { setAdding(false); setNewForm(EMPTY_ITEM); }}
              >
                ✕ Anuluj
              </button>
              <button
                className="btn btn-success btn-sm"
                onClick={handleAdd}
                disabled={!newForm.description.trim()}
              >
                ➕ Dodaj
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn btn-secondary"
            onClick={() => { setAdding(true); setEditingId(null); }}
          >
            ➕ Dodaj pozycję
          </button>
        )}
      </div>
    </div>
  );
};
