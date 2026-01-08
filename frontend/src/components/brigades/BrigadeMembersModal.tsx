// src/components/brigades/BrigadeMembersModal.tsx
// Modal for managing brigade members

import React, { useState, useEffect } from 'react';
import brigadeService from '../../services/brigade.service';
import { AdminService } from '../../services/admin.service';
import type { Brigade, BrigadeMember, AddMemberDto } from '../../types/brigade.types';
import type { User } from '../../types/admin.types';

interface BrigadeMembersModalProps {
  brigade: Brigade;
  onClose: () => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Pon' },
  { value: 2, label: 'Wt' },
  { value: 3, label: 'Śr' },
  { value: 4, label: 'Czw' },
  { value: 5, label: 'Pt' },
  { value: 6, label: 'Sob' },
  { value: 7, label: 'Niedz' },
];

export const BrigadeMembersModal: React.FC<BrigadeMembersModalProps> = ({ brigade, onClose }) => {
  const [members, setMembers] = useState<BrigadeMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Add member form state
  const [newMember, setNewMember] = useState<AddMemberDto>({
    userId: 0,
    workDays: [1, 2, 3, 4, 5], // Mon-Fri default
    validFrom: new Date().toISOString().split('T')[0],
    validTo: undefined,
    active: true,
  });

  const adminService = new AdminService();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [membersData, usersData] = await Promise.all([
        brigadeService.getMembers(brigade.id),
        adminService.getAllUsers(),
      ]);
      setMembers(membersData);
      setUsers(usersData.filter(u => u.active));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania danych');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newMember.userId === 0) {
      setError('Wybierz użytkownika');
      return;
    }

    if (newMember.workDays.length === 0) {
      setError('Wybierz przynajmniej jeden dzień pracy');
      return;
    }

    try {
      setError('');
      await brigadeService.addMember(brigade.id, newMember);
      setSuccess('Członek został dodany do brygady');
      setShowAddForm(false);
      setNewMember({
        userId: 0,
        workDays: [1, 2, 3, 4, 5],
        validFrom: new Date().toISOString().split('T')[0],
        validTo: undefined,
        active: true,
      });
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd dodawania członka');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm('Czy na pewno chcesz usunąć tego członka z brygady?')) return;

    try {
      await brigadeService.removeMember(brigade.id, memberId);
      setSuccess('Członek został usunięty z brygady');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd usuwania członka');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleToggleMemberActive = async (member: BrigadeMember) => {
    try {
      await brigadeService.updateMember(brigade.id, member.id, {
        active: !member.active,
      });
      setSuccess('Status członka został zaktualizowany');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd aktualizacji członka');
      setTimeout(() => setError(''), 3000);
    }
  };

  const toggleWorkDay = (day: number) => {
    setNewMember(prev => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter(d => d !== day)
        : [...prev.workDays, day].sort(),
    }));
  };

  const formatWorkDays = (workDays: number[]) => {
    return workDays
      .map(day => DAYS_OF_WEEK.find(d => d.value === day)?.label)
      .join(', ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL');
  };

  // Get users that are not already members
  const availableUsers = users.filter(
    user => !members.some(m => m.userId === user.id && m.active)
  );

  return (
    <div className="brigade-modal" onClick={onClose}>
      <div className="brigade-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="brigade-modal-header">
          <h2>👥 Członkowie Brygady: {brigade.name}</h2>
          <button className="brigade-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {success && (
          <div className="alert alert-success" role="alert">
            {success}
          </div>
        )}

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        <div className="brigade-modal-body">
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Ładowanie członków...</p>
            </div>
          ) : (
            <>
              {/* Members List */}
              <div className="members-list">
                <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>
                  Lista członków ({members.length})
                </h3>
                {members.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                    Brak członków w tej brygadzie
                  </p>
                ) : (
                  members.map((member) => (
                    <div key={member.id} className="member-item">
                      <div className="member-info">
                        <div className="member-name">
                          {member.user?.firstName} {member.user?.lastName}
                          {!member.active && (
                            <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--error-color)' }}>
                              (Nieaktywny)
                            </span>
                          )}
                        </div>
                        <div className="member-details">
                          📧 {member.user?.email} • 
                          📅 {formatWorkDays(member.workDays)} • 
                          🗓️ {formatDate(member.validFrom)} - {member.validTo ? formatDate(member.validTo) : 'Bezterminowo'}
                        </div>
                      </div>
                      <div className="member-actions">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleToggleMemberActive(member)}
                          title={member.active ? 'Dezaktywuj' : 'Aktywuj'}
                        >
                          {member.active ? '🔴' : '🟢'}
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemoveMember(member.id)}
                          title="Usuń"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Member Section */}
              {!showAddForm ? (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAddForm(true)}
                  disabled={availableUsers.length === 0}
                  style={{ width: '100%', marginTop: '16px' }}
                >
                  ➕ Dodaj Członka
                </button>
              ) : (
                <form onSubmit={handleAddMember} style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Dodaj nowego członka</h3>

                  <div className="form-group">
                    <label htmlFor="userId">
                      Użytkownik <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      id="userId"
                      value={newMember.userId}
                      onChange={(e) => setNewMember({ ...newMember, userId: Number(e.target.value) })}
                      required
                    >
                      <option value={0}>-- Wybierz użytkownika --</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      Dni pracy <span style={{ color: 'red' }}>*</span>
                    </label>
                    <div className="work-days-select">
                      {DAYS_OF_WEEK.map(day => (
                        <div key={day.value} className="work-day-checkbox">
                          <input
                            type="checkbox"
                            id={`day-${day.value}`}
                            checked={newMember.workDays.includes(day.value)}
                            onChange={() => toggleWorkDay(day.value)}
                          />
                          <label htmlFor={`day-${day.value}`}>{day.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Okres ważności</label>
                    <div className="date-range">
                      <div>
                        <label htmlFor="validFrom" style={{ fontSize: '12px', marginBottom: '4px' }}>
                          Od <span style={{ color: 'red' }}>*</span>
                        </label>
                        <input
                          type="date"
                          id="validFrom"
                          value={newMember.validFrom}
                          onChange={(e) => setNewMember({ ...newMember, validFrom: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="validTo" style={{ fontSize: '12px', marginBottom: '4px' }}>
                          Do (opcjonalne)
                        </label>
                        <input
                          type="date"
                          id="validTo"
                          value={newMember.validTo || ''}
                          onChange={(e) => setNewMember({ ...newMember, validTo: e.target.value || undefined })}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowAddForm(false)}
                    >
                      Anuluj
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Dodaj
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        <div className="brigade-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
