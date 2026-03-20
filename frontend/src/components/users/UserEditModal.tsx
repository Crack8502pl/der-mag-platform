// src/components/users/UserEditModal.tsx
// Modal for editing user information

import React, { useState } from 'react';
import api from '../../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  employeeCode?: string;
  roleId?: number;
  role?: {
    id: number;
    name: string;
    description: string;
  };
}

interface Role {
  id: number;
  name: string;
  description: string;
}

interface UserEditModalProps {
  user: User;
  roles: Role[];
  onClose: () => void;
  onSuccess: () => void;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({
  user,
  roles,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || '',
    employeeCode: user.employeeCode || '',
    roleId: user.roleId ?? user.role?.id ?? 0,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Convert employeeCode to uppercase
    let finalValue: string | number = name === 'employeeCode' ? value.toUpperCase() : value;
    
    // Convert roleId to number
    if (name === 'roleId') {
      finalValue = Number(value);
    }
    
    setFormData({
      ...formData,
      [name]: finalValue,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Update basic info
      await api.put(`/users/${user.id}`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        employeeCode: formData.employeeCode || null,
      });

      // Update role if changed
      const originalRoleId = user.roleId ?? user.role?.id;
      const newRoleId = Number(formData.roleId);

      console.log('🔍 Role change check:', {
        originalRoleId,
        newRoleId,
        willUpdate: newRoleId > 0 && newRoleId !== originalRoleId
      });

      if (newRoleId > 0 && newRoleId !== originalRoleId) {
        console.log('📤 Sending role update request for user', user.id);
        const roleResponse = await api.put(`/users/${user.id}/role`, { roleId: newRoleId });
        console.log('📥 Role update response:', roleResponse.data);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd aktualizacji użytkownika');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Edytuj użytkownika</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="username">Login (nie można zmienić)</label>
            <input
              type="text"
              id="username"
              value={user.username}
              className="input"
              disabled
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">
                Imię <span className="required">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="input"
                required
                minLength={2}
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">
                Nazwisko <span className="required">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="input"
                required
                minLength={2}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email <span className="required">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Telefon</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="employeeCode">Kod pracownika</label>
            <input
              type="text"
              id="employeeCode"
              name="employeeCode"
              value={formData.employeeCode}
              onChange={handleChange}
              className="input"
              maxLength={5}
              placeholder="Brak kodu"
            />
            <small className="form-help">
              3-5 znaków (wielkie litery)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="roleId">
              Rola <span className="required">*</span>
            </label>
            <select
              id="roleId"
              name="roleId"
              value={formData.roleId}
              onChange={handleChange}
              className="input"
              required
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} - {role.description}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Anuluj
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
