// src/components/admin/FunctionGroupsPage.tsx
// Panel admina: funkcje (grupy funkcyjne) nadawane osobowo obok ról

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/admin.service';
import type { FunctionGroup, FunctionGroupMembership, User } from '../../types/admin.types';
import { keyFromName } from '../../utils/functionGroupKey';

const formatDateTime = (value: string | null | undefined): string =>
  value ? new Date(value).toLocaleString('pl-PL') : '—';

const todayInputValue = (): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const getErrorMessage = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export const FunctionGroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<FunctionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [keyEdited, setKeyEdited] = useState(false);
  const [newDescription, setNewDescription] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [selectedGroup, setSelectedGroup] = useState<FunctionGroup | null>(null);
  const [members, setMembers] = useState<FunctionGroupMembership[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');

  const showSuccess = (message: string) => {
    setSuccess(message);
    setError(null);
    setTimeout(() => setSuccess(null), 3000);
  };

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      setGroups(await adminService.getFunctionGroups());
    } catch (err) {
      setError(getErrorMessage(err, 'Nie udało się pobrać listy funkcji'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMembers = useCallback(async (groupId: number) => {
    try {
      setMembers(await adminService.getFunctionGroupMembers(groupId));
    } catch (err) {
      setError(getErrorMessage(err, 'Nie udało się pobrać członków funkcji'));
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleNameChange = (value: string) => {
    setNewName(value);
    if (!keyEdited) setNewKey(keyFromName(value));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newKey.trim()) {
      setError('Podaj nazwę i klucz funkcji');
      return;
    }
    try {
      await adminService.createFunctionGroup({
        key: newKey.trim(),
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        permissions: {},
      });
      setNewName('');
      setNewKey('');
      setKeyEdited(false);
      setNewDescription('');
      showSuccess('Funkcja została utworzona');
      await loadGroups();
    } catch (err) {
      setError(getErrorMessage(err, 'Nie udało się utworzyć funkcji'));
    }
  };

  const startEdit = (group: FunctionGroup) => {
    setEditingId(group.id);
    setEditName(group.name);
    setEditDescription(group.description || '');
  };

  const handleSaveEdit = async (group: FunctionGroup) => {
    try {
      await adminService.updateFunctionGroup(group.id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      });
      setEditingId(null);
      showSuccess('Zapisano zmiany funkcji');
      await loadGroups();
    } catch (err) {
      setError(getErrorMessage(err, 'Nie udało się zapisać funkcji'));
    }
  };

  const handleToggleActive = async (group: FunctionGroup) => {
    if (group.active && !window.confirm(`Dezaktywować funkcję „${group.name}”? Osoby stracą jej uprawnienia.`)) {
      return;
    }
    try {
      if (group.active) {
        await adminService.deactivateFunctionGroup(group.id);
        showSuccess('Funkcja została dezaktywowana');
      } else {
        await adminService.updateFunctionGroup(group.id, { active: true });
        showSuccess('Funkcja została aktywowana');
      }
      await loadGroups();
    } catch (err) {
      setError(getErrorMessage(err, 'Nie udało się zmienić statusu funkcji'));
    }
  };

  const openMembers = async (group: FunctionGroup) => {
    setSelectedGroup(group);
    setSelectedUser(null);
    setUserSearch('');
    setUserResults([]);
    setValidFrom('');
    setValidTo('');
    await loadMembers(group.id);
  };

  const handleSearchUsers = async () => {
    if (!userSearch.trim()) return;
    try {
      setUserResults(await adminService.searchUsers(userSearch.trim()));
    } catch (err) {
      setError(getErrorMessage(err, 'Nie udało się wyszukać osób'));
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroup || !selectedUser) {
      setError('Wybierz osobę');
      return;
    }
    const payload: { userId: number; validFrom?: string; validTo?: string } = { userId: selectedUser.id };
    if (validFrom && validFrom !== todayInputValue()) {
      payload.validFrom = new Date(`${validFrom}T00:00:00`).toISOString();
    }
    if (validTo) {
      payload.validTo = new Date(`${validTo}T23:59:59`).toISOString();
    }
    try {
      await adminService.addFunctionGroupMember(selectedGroup.id, payload);
      setSelectedUser(null);
      setUserSearch('');
      setUserResults([]);
      setValidFrom('');
      setValidTo('');
      showSuccess('Nadano funkcję');
      await Promise.all([loadMembers(selectedGroup.id), loadGroups()]);
    } catch (err) {
      setError(getErrorMessage(err, 'Nie udało się nadać funkcji'));
    }
  };

  const handleRemoveMember = async (membership: FunctionGroupMembership) => {
    if (!selectedGroup) return;
    const who = membership.user ? `${membership.user.firstName} ${membership.user.lastName}` : 'tej osobie';
    if (!window.confirm(`Odebrać funkcję „${selectedGroup.name}” osobie ${who}? Historia zostanie zachowana.`)) {
      return;
    }
    try {
      await adminService.removeFunctionGroupMember(selectedGroup.id, membership.userId);
      showSuccess('Odebrano funkcję');
      await Promise.all([loadMembers(selectedGroup.id), loadGroups()]);
    } catch (err) {
      setError(getErrorMessage(err, 'Nie udało się odebrać funkcji'));
    }
  };

  const membershipStatus = (membership: FunctionGroupMembership): string => {
    if (membership.isActive) return 'Aktywna';
    if (new Date(membership.validFrom).getTime() > Date.now()) return 'Zaplanowana';
    return 'Zakończona';
  };

  const canRemove = (membership: FunctionGroupMembership): boolean =>
    !membership.validTo || new Date(membership.validTo).getTime() > Date.now();

  if (loading && groups.length === 0) {
    return <div className="loading">Ładowanie...</div>;
  }

  return (
    <div className="user-management-page function-groups-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/admin')}>
          ← Powrót
        </button>
        <h1>Funkcje</h1>
        <p className="subtitle">
          Funkcje nadawane osobom obok ich roli. Funkcja tylko dodaje uprawnienia – nie daje roli administratora.
        </p>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="toolbar">
        <button className="btn btn-secondary" onClick={() => navigate('/admin/function-groups/permissions')}>
          🔑 Uprawnienia funkcji
        </button>
      </div>

      <form className="toolbar" onSubmit={handleCreate} aria-label="Nowa funkcja">
        <input
          type="text"
          className="search-input"
          placeholder="Nazwa nowej funkcji, np. Audytorzy procesów"
          aria-label="Nazwa nowej funkcji"
          value={newName}
          onChange={(e) => handleNameChange(e.target.value)}
        />
        <input
          type="text"
          className="search-input"
          placeholder="Klucz (tworzony automatycznie)"
          aria-label="Klucz nowej funkcji"
          value={newKey}
          onChange={(e) => {
            setKeyEdited(true);
            setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 100));
          }}
        />
        <input
          type="text"
          className="search-input"
          placeholder="Opis (opcjonalnie)"
          aria-label="Opis nowej funkcji"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          + Dodaj funkcję
        </button>
      </form>

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Nazwa</th>
              <th>Klucz</th>
              <th>Opis</th>
              <th>Aktywni członkowie</th>
              <th>Status</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr>
                <td colSpan={6}>Brak funkcji</td>
              </tr>
            )}
            {groups.map((group) => (
              <tr key={group.id}>
                <td>
                  {editingId === group.id ? (
                    <input
                      type="text"
                      aria-label="Nazwa funkcji"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  ) : (
                    <strong>{group.name}</strong>
                  )}
                </td>
                <td>
                  <code>{group.key}</code>
                </td>
                <td>
                  {editingId === group.id ? (
                    <input
                      type="text"
                      aria-label="Opis funkcji"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  ) : (
                    group.description || '—'
                  )}
                </td>
                <td>{group.activeMemberCount ?? 0}</td>
                <td>
                  <span className={`status ${group.active ? 'active' : 'inactive'}`}>
                    {group.active ? 'Aktywna' : 'Nieaktywna'}
                  </span>
                </td>
                <td>
                  <div className="actions">
                    {editingId === group.id ? (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => handleSaveEdit(group)}>
                          Zapisz
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>
                          Anuluj
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-sm btn-secondary" onClick={() => startEdit(group)}>
                          Edytuj
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => openMembers(group)}>
                          Członkowie
                        </button>
                        <button
                          className={`btn btn-sm ${group.active ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => handleToggleActive(group)}
                        >
                          {group.active ? 'Dezaktywuj' : 'Aktywuj'}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedGroup && (
        <section className="function-group-members" aria-label="Członkowie funkcji" style={{ marginTop: '24px' }}>
          <h2>Członkowie funkcji: {selectedGroup.name}</h2>

          {selectedGroup.active ? (
            <div className="toolbar" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label>
                  Osoba
                  <br />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Szukaj osoby (imię, nazwisko, login, e-mail)"
                    aria-label="Szukaj osoby"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchUsers();
                      }
                    }}
                  />
                </label>
                <button type="button" className="btn btn-secondary" onClick={handleSearchUsers}>
                  Szukaj
                </button>
                {userResults.length > 0 && (
                  <ul className="user-search-results" style={{ listStyle: 'none', padding: 0 }}>
                    {userResults.map((user) => (
                      <li key={user.id}>
                        <button
                          type="button"
                          className={`btn btn-sm ${selectedUser?.id === user.id ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setSelectedUser(user)}
                        >
                          {user.firstName} {user.lastName} (@{user.username})
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedUser && (
                  <p>
                    Wybrano: <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>
                  </p>
                )}
              </div>
              <label>
                Od
                <br />
                <input
                  type="date"
                  aria-label="Od"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                />
              </label>
              <label>
                Do (opcjonalnie)
                <br />
                <input
                  type="date"
                  aria-label="Do"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                />
              </label>
              <button type="button" className="btn btn-primary" onClick={handleAddMember} disabled={!selectedUser}>
                Nadaj funkcję
              </button>
            </div>
          ) : (
            <p>Funkcja jest nieaktywna – nie można nadawać jej nowym osobom.</p>
          )}

          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Osoba</th>
                  <th>Od</th>
                  <th>Do</th>
                  <th>Nadał(a)</th>
                  <th>Status</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 && (
                  <tr>
                    <td colSpan={6}>Brak członków</td>
                  </tr>
                )}
                {members.map((membership) => (
                  <tr key={membership.id}>
                    <td>
                      {membership.user
                        ? `${membership.user.firstName} ${membership.user.lastName} (@${membership.user.username})`
                        : `#${membership.userId}`}
                    </td>
                    <td>{formatDateTime(membership.validFrom)}</td>
                    <td>{membership.validTo ? formatDateTime(membership.validTo) : 'bezterminowo'}</td>
                    <td>
                      {membership.grantedBy
                        ? `${membership.grantedBy.firstName} ${membership.grantedBy.lastName}`
                        : '—'}
                    </td>
                    <td>{membershipStatus(membership)}</td>
                    <td>
                      {canRemove(membership) && (
                        <button className="btn btn-sm btn-danger" onClick={() => handleRemoveMember(membership)}>
                          Odbierz
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default FunctionGroupsPage;
