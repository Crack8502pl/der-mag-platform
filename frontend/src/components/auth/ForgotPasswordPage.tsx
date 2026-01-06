// src/components/auth/ForgotPasswordPage.tsx
// Forgot password page - user can request password reset

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './LoginPage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const ForgotPasswordPage: React.FC = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        emailOrUsername
      });
      
      setMessage(response.data.message || 'Jeśli konto istnieje, wysłaliśmy instrukcje na podany adres email');
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Wystąpił błąd. Spróbuj ponownie później.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="login-container">
        <div className="login-card card">
          <div className="logo">Grover</div>
          <h1 className="login-title">Email wysłany</h1>
          
          <div className="alert alert-success">
            {message}
          </div>
          
          <p style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
            Sprawdź swoją skrzynkę pocztową. Jeśli konto istnieje, otrzymasz email z nowym hasłem.
          </p>
          
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <Link to="/login" className="reset-password-link">
              ← Powrót do logowania
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card card">
        <div className="logo">Grover</div>
        <h1 className="login-title">Zapomniałeś hasła?</h1>
        <p className="login-subtitle">
          Wpisz swój email lub login, a wyślemy Ci nowe hasło
        </p>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="emailOrUsername" className="label">
              Email lub Login
            </label>
            <input
              type="text"
              id="emailOrUsername"
              name="emailOrUsername"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              className="input"
              placeholder="Wpisz email lub login"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary login-button"
            disabled={loading || !emailOrUsername}
          >
            {loading ? 'Wysyłanie...' : 'Wyślij nowe hasło'}
          </button>

          <div className="login-footer">
            <Link to="/login" className="reset-password-link">
              ← Powrót do logowania
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
