// src/components/admin/BomGroupsManageModal.tsx
// Modal for managing BOM material groups

import React, { useState, useEffect } from 'react';
import bomGroupService from '../../services/bomGroup.service';
import type { BomGroup, CreateBomGroupDto, UpdateBomGroupDto } from '../../services/bomGroup.service';
import '../../styles/grover-theme.css';

interface BomGroupsManageModalProps {
  onClose: () => void;
  onGroupsChanged?: () => void;
}

export const BomGroupsManageModal: React.FC<BomGroupsManageModalProps> = ({ onClose, onGroupsChanged }) => {
  const [groups, setGroups] = useState<BomGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newGroup, setNewGroup] = useState<CreateBomGroupDto>({
    name: '',
    icon: '',
    color: '#3b82f6',
    sortOrder: 0
  });

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await bomGroupService.getAll(true); // Include inactive
      setGroups(data);
    } catch (err) {
      console.error('Błąd ładowania grup:', err);
      alert('Błąd ładowania grup');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleCreate = async () => {
    if (!newGroup.name.trim()) {
      alert('Nazwa grupy jest wymagana');
      return;
    }

    try {
      await bomGroupService.create(newGroup);
      setNewGroup({ name: '', icon: '', color: '#3b82f6', sortOrder: 0 });
      await loadGroups();
      onGroupsChanged?.();
    } catch (err: any) {
      console.error('Błąd tworzenia grupy:', err);
      alert(err.response?.data?.message || 'Błąd tworzenia grupy');
    }
  };

  const handleUpdate = async (id: number, data: UpdateBomGroupDto) => {
    try {
      await bomGroupService.update(id, data);
      await loadGroups();
      setEditingId(null);
      onGroupsChanged?.();
    } catch (err: any) {
      console.error('Błąd aktualizacji grupy:', err);
      alert(err.response?.data?.message || 'Błąd aktualizacji grupy');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć grupę "${name}"?`)) {
      return;
    }

    try {
      await bomGroupService.delete(id);
      await loadGroups();
      onGroupsChanged?.();
    } catch (err: any) {
      console.error('Błąd usuwania grupy:', err);
      alert(err.response?.data?.message || 'Błąd usuwania grupy');
    }
  };

  const handleEditToggle = (id: number) => {
    setEditingId(editingId === id ? null : id);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '30px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>
            ⚙️ Zarządzanie grupami BOM
          </h2>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '6px 12px' }}
          >
            ✕
          </button>
        </div>

        {/* Add New Group Form */}
        <div
          style={{
            padding: '20px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px'
          }}
        >
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '15px', fontSize: '16px' }}>
            ➕ Dodaj nową grupę
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
            <div>
              <label className="label">Nazwa *</label>
              <input
                type="text"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                className="input"
                placeholder="np. Urządzenia sieciowe"
              />
            </div>
            <div>
              <label className="label">Ikona</label>
              <input
                type="text"
                value={newGroup.icon}
                onChange={(e) => setNewGroup({ ...newGroup, icon: e.target.value })}
                className="input"
                placeholder="np. 🔌"
                maxLength={10}
              />
            </div>
            <div>
              <label className="label">Kolor</label>
              <input
                type="color"
                value={newGroup.color}
                onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                className="input"
                style={{ height: '38px' }}
              />
            </div>
            <div>
              <label className="label">Kolejność</label>
              <input
                type="number"
                value={newGroup.sortOrder}
                onChange={(e) => setNewGroup({ ...newGroup, sortOrder: Number(e.target.value) })}
                className="input"
                min={0}
                step={10}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              style={{ height: '38px' }}
            >
              Dodaj
            </button>
          </div>
        </div>

        {/* Groups Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            Ładowanie...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '12px' }}>IKONA</th>
                  <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '12px' }}>NAZWA</th>
                  <th style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>KOLOR</th>
                  <th style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>KOLEJNOŚĆ</th>
                  <th style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>STATUS</th>
                  <th style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>AKCJE</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {editingId === group.id ? (
                      // Edit Mode
                      <>
                        <td style={{ padding: '10px' }}>
                          <input
                            type="text"
                            defaultValue={group.icon || ''}
                            className="input"
                            maxLength={10}
                            style={{ width: '60px', fontSize: '20px', textAlign: 'center' }}
                            onBlur={(e) => handleUpdate(group.id, { icon: e.target.value })}
                          />
                        </td>
                        <td style={{ padding: '10px' }}>
                          <input
                            type="text"
                            defaultValue={group.name}
                            className="input"
                            onBlur={(e) => handleUpdate(group.id, { name: e.target.value })}
                          />
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <input
                            type="color"
                            defaultValue={group.color || '#3b82f6'}
                            className="input"
                            style={{ width: '60px', height: '30px' }}
                            onBlur={(e) => handleUpdate(group.id, { color: e.target.value })}
                          />
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <input
                            type="number"
                            defaultValue={group.sortOrder}
                            className="input"
                            style={{ width: '80px', textAlign: 'center' }}
                            min={0}
                            step={10}
                            onBlur={(e) => handleUpdate(group.id, { sortOrder: Number(e.target.value) })}
                          />
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '12px',
                              background: group.isActive ? '#10b98120' : '#ef444420',
                              color: group.isActive ? '#10b981' : '#ef4444'
                            }}
                          >
                            {group.isActive ? 'Aktywna' : 'Nieaktywna'}
                          </span>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleEditToggle(group.id)}
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            Gotowe
                          </button>
                        </td>
                      </>
                    ) : (
                      // View Mode
                      <>
                        <td style={{ padding: '10px', fontSize: '24px', textAlign: 'center' }}>
                          {group.icon}
                        </td>
                        <td style={{ padding: '10px', color: 'var(--text-primary)' }}>
                          {group.name}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <div
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              background: group.color || '#3b82f6',
                              margin: '0 auto',
                              border: '2px solid var(--border-color)'
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          {group.sortOrder}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '12px',
                              background: group.isActive ? '#10b98120' : '#ef444420',
                              color: group.isActive ? '#10b981' : '#ef4444'
                            }}
                          >
                            {group.isActive ? 'Aktywna' : 'Nieaktywna'}
                          </span>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleEditToggle(group.id)}
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                            >
                              ✏️
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => handleDelete(group.id, group.name)}
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              disabled={!group.isActive}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {groups.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            Brak grup. Dodaj pierwszą grupę powyżej.
          </div>
        )}
      </div>
    </div>
  );
};
