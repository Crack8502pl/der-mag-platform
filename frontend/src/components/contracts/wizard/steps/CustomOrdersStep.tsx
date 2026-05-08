import React, { useMemo, useState } from 'react';
import type { CustomOrderItem, StepProps } from '../types/wizard.types';
import './CustomOrdersStep.css';

const EMPTY_ORDER = {
  description: '',
  quantity: 1,
  unit: 'szt.',
  notes: '',
};

export const CustomOrdersStep: React.FC<StepProps> = ({ wizardData, onUpdate }) => {
  const [draft, setDraft] = useState(EMPTY_ORDER);
  const [editingId, setEditingId] = useState<string | null>(null);

  const customOrders = useMemo(() => wizardData.customOrders || [], [wizardData.customOrders]);

  const saveOrders = (orders: CustomOrderItem[]) => {
    onUpdate({ customOrders: orders });
  };

  const resetDraft = () => {
    setDraft(EMPTY_ORDER);
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!draft.description.trim() || draft.quantity <= 0 || !draft.unit.trim()) {
      return;
    }

    const nextItem: CustomOrderItem = {
      id: editingId || crypto.randomUUID(),
      description: draft.description.trim(),
      quantity: draft.quantity,
      unit: draft.unit.trim(),
      notes: draft.notes?.trim() || undefined,
    };

    if (editingId) {
      saveOrders(customOrders.map((order) => (order.id === editingId ? nextItem : order)));
    } else {
      saveOrders([...customOrders, nextItem]);
    }

    resetDraft();
  };

  return (
    <div className="wizard-step-content custom-orders-step">
      <div className="custom-orders-layout">
        <section className="custom-orders-form card-like">
          <h3>Zamówienia dodatkowe</h3>
          <p>
            Dodaj niestandardowe pozycje, które nie wynikają bezpośrednio z konfiguracji BOM dla zadań.
          </p>

          <div className="form-group">
            <label>Opis</label>
            <input
              type="text"
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="Np. dodatkowy patchcord światłowodowy"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Ilość</label>
              <input
                type="number"
                min="1"
                value={draft.quantity}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, quantity: Number(event.target.value) || 1 }))
                }
              />
            </div>

            <div className="form-group">
              <label>Jednostka</label>
              <input
                type="text"
                value={draft.unit}
                onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))}
                placeholder="szt."
              />
            </div>
          </div>

          <div className="form-group">
            <label>Uwagi</label>
            <textarea
              rows={4}
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Dodatkowe informacje dla działu zamówień"
            />
          </div>

          <div className="custom-orders-actions">
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={resetDraft}>
                Anuluj edycję
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>
              {editingId ? '💾 Zapisz zmiany' : '➕ Dodaj pozycję'}
            </button>
          </div>
        </section>

        <section className="custom-orders-list card-like">
          <div className="custom-orders-list-header">
            <h3>Lista pozycji</h3>
            <span>{customOrders.length} dodanych</span>
          </div>

          {customOrders.length === 0 ? (
            <div className="custom-orders-empty">
              <div className="custom-orders-empty-icon">🧾</div>
              <p>Brak dodatkowych pozycji. W razie potrzeby dodaj zamówienia niestandardowe po lewej stronie.</p>
            </div>
          ) : (
            <div className="custom-orders-items">
              {customOrders.map((order) => (
                <div key={order.id} className="custom-order-item">
                  <div>
                    <strong>{order.description}</strong>
                    <span>{order.quantity} {order.unit}</span>
                    {order.notes && <p>{order.notes}</p>}
                  </div>

                  <div className="custom-order-item-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setEditingId(order.id);
                        setDraft({
                          description: order.description,
                          quantity: order.quantity,
                          unit: order.unit,
                          notes: order.notes || '',
                        });
                      }}
                    >
                      ✏️ Edytuj
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => saveOrders(customOrders.filter((item) => item.id !== order.id))}
                    >
                      🗑️ Usuń
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
