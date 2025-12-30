// src/components/auth/LoginPage.tsx
// Login page with Grover branding

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PasswordInput } from '../common/PasswordInput';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(formData.username, formData.password);
      
      if (response.data.requirePasswordChange) {
        navigate('/change-password');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Błąd logowania. Sprawdź swoje dane.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card card">
        <div className="logo">Grover</div>
        <h1 className="login-title">Zaloguj się</h1>
        <p className="login-subtitle">Witaj w platformie Grover</p>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username" className="label">
              Nazwa użytkownika
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="input"
              placeholder="Wpisz nazwę użytkownika"
              required
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="label">
              Hasło
            </label>
            <PasswordInput
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Wpisz hasło"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary login-button"
            disabled={loading || !formData.username || !formData.password}
          >
            {loading ? 'Logowanie...' : 'Zaloguj się'}
          </button>

          <div className="login-footer">
            <a href="#" className="reset-password-link">
              Zapomniałeś hasła?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};
