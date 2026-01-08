// src/components/users/UserCreateModal.tsx
// Modal for creating new users

import React, { useState } from 'react';
import axios from 'axios';
import { getApiBaseURL } from '../../utils/api-url';

const API_BASE_URL = getApiBaseURL();

interface Role {
  id: number;
  name: string;
  description: string;
}

interface UserCreateModalProps {
  roles: Role[];
  onClose: () => void;
  onSuccess: () => void;
}

export const UserCreateModal: React.FC<UserCreateModalProps> = ({
  roles,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    roleId: roles.length > 0 ? roles[0].id : 0,
    password: '',
    employeeCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Convert employeeCode to uppercase
    const finalValue = name === 'employeeCode' ? value.toUpperCase() : value;
    
    setFormData({
      ...formData,
      [name]: finalValue,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Walidacja
    if (formData.username.length < 3) {
      setError('Login musi mieć minimum 3 znaki');
      setLoading(false);
      return;
    }

    if (formData.firstName.length < 2 || formData.lastName.length < 2) {
      setError('Imię i nazwisko muszą mieć minimum 2 znaki');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Hasło musi mieć minimum 8 znaków');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      
      // Prepare data - only include employeeCode if it's not empty
      const submitData: any = {
        username: formData.username,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        roleId: formData.roleId,
        phone: formData.phone,
        password: formData.password,
      };
      
      if (formData.employeeCode) {
        submitData.employeeCode = formData.employeeCode;
      }
      
      await axios.post(
        `${API_BASE_URL}/users`,
        submitData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd tworzenia użytkownika');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>➕ Dodaj użytkownika</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
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
            <label htmlFor="username">
              Login <span className="required">*</span>
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="input"
              required
              minLength={3}
            />
            <small className="form-help">Minimum 3 znaki</small>
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
            <label htmlFor="employeeCode">Kod pracownika (opcjonalnie)</label>
            <input
              type="text"
              id="employeeCode"
              name="employeeCode"
              value={formData.employeeCode}
              onChange={handleChange}
              className="input"
              maxLength={5}
              placeholder="Auto-generowany"
            />
            <small className="form-help">
              3-5 znaków (wielkie litery). Pozostaw puste dla automatycznego generowania.
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

          <div className="form-group">
            <label htmlFor="password">
              Hasło pierwszego logowania <span className="required">*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input"
              required
              minLength={8}
            />
            <small className="form-help">
              Minimum 8 znaków. Użytkownik zostanie poproszony o zmianę hasła przy pierwszym logowaniu.
            </small>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Anuluj
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Tworzenie...' : 'Utwórz użytkownika'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
