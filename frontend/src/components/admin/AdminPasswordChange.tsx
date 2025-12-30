// src/components/admin/AdminPasswordChange.tsx
// Admin password change component with strength validation

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/admin.service';

export const AdminPasswordChange: React.FC = () => {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const strength = adminService.validatePasswordStrength(newPassword);

  const getStrengthColor = () => {
    if (strength.score <= 2) return '#e74c3c';
    if (strength.score === 3) return '#f39c12';
    if (strength.score === 4) return '#27ae60';
    return '#95a5a6';
  };

  const getStrengthLabel = () => {
    if (strength.score === 0) return 'Bardzo słabe';
    if (strength.score <= 2) return 'Słabe';
    if (strength.score === 3) return 'Średnie';
    if (strength.score === 4) return 'Silne';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Nowe hasła nie są identyczne');
      return;
    }

    // Validate password strength
    if (strength.score < 5) {
      setError('Hasło nie spełnia wszystkich wymagań');
      return;
    }

    try {
      setLoading(true);
      await adminService.changePassword({
        currentPassword,
        newPassword,
      });

      setSuccess('Hasło zostało pomyślnie zmienione');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Redirect to admin dashboard after 2 seconds
      setTimeout(() => {
        navigate('/admin');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się zmienić hasła');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-change-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/admin')}>
          ← Powrót
        </button>
        <h1>Zmiana hasła</h1>
        <p className="subtitle">Zmień swoje hasło administratora</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="password-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="currentPassword">Aktualne hasło</label>
            <input
              id="currentPassword"
              type={showPasswords ? 'text' : 'password'}
              className="form-control"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">Nowe hasło</label>
            <input
              id="newPassword"
              type={showPasswords ? 'text' : 'password'}
              className="form-control"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            
            {newPassword && (
              <>
                <div className="strength-bar">
                  <div 
                    className="strength-fill" 
                    style={{ 
                      width: `${(strength.score / 5) * 100}%`,
                      backgroundColor: getStrengthColor()
                    }}
                  />
                </div>
                <div className="strength-label" style={{ color: getStrengthColor() }}>
                  {getStrengthLabel()}
                </div>
              </>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Powtórz nowe hasło</label>
            <input
              id="confirmPassword"
              type={showPasswords ? 'text' : 'password'}
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
              />
              {' '}Pokaż hasła
            </label>
          </div>

          <div className="requirements">
            <h3>Wymagania hasła:</h3>
            <ul>
              <li className={strength.hasMinLength ? 'valid' : ''}>
                {strength.hasMinLength ? '✓' : '○'} Minimum 8 znaków
              </li>
              <li className={strength.hasUppercase ? 'valid' : ''}>
                {strength.hasUppercase ? '✓' : '○'} Co najmniej jedna wielka litera
              </li>
              <li className={strength.hasLowercase ? 'valid' : ''}>
                {strength.hasLowercase ? '✓' : '○'} Co najmniej jedna mała litera
              </li>
              <li className={strength.hasDigit ? 'valid' : ''}>
                {strength.hasDigit ? '✓' : '○'} Co najmniej jedna cyfra
              </li>
              <li className={strength.hasSpecial ? 'valid' : ''}>
                {strength.hasSpecial ? '✓' : '○'} Co najmniej jeden znak specjalny
              </li>
            </ul>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || strength.score < 5}
            >
              {loading ? 'Zapisywanie...' : 'Zmień hasło'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .password-change-page {
          padding: 20px;
          max-width: 600px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 30px;
        }

        .page-header h1 {
          color: #2c3e50;
          margin-bottom: 10px;
        }

        .subtitle {
          color: #7f8c8d;
        }

        .back-button {
          background: none;
          border: none;
          color: #3498db;
          cursor: pointer;
          font-size: 14px;
          margin-bottom: 10px;
          padding: 5px 10px;
        }

        .back-button:hover {
          background: #f0f0f0;
          border-radius: 4px;
        }

        .password-card {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #2c3e50;
        }

        .form-control {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .form-control:focus {
          outline: none;
          border-color: #3498db;
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }

        .strength-bar {
          height: 4px;
          background: #e0e0e0;
          border-radius: 2px;
          margin-top: 8px;
          overflow: hidden;
        }

        .strength-fill {
          height: 100%;
          transition: all 0.3s ease;
        }

        .strength-label {
          font-size: 12px;
          font-weight: 600;
          margin-top: 4px;
        }

        .requirements {
          margin: 20px 0;
          padding: 15px;
          background: #f9f9f9;
          border-radius: 4px;
        }

        .requirements h3 {
          margin-top: 0;
          margin-bottom: 10px;
          font-size: 14px;
          color: #2c3e50;
        }

        .requirements ul {
          margin: 0;
          padding-left: 0;
          list-style: none;
        }

        .requirements li {
          padding: 5px 0;
          color: #7f8c8d;
        }

        .requirements li.valid {
          color: #27ae60;
        }

        .form-actions {
          margin-top: 30px;
          text-align: right;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: #3498db;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2980b9;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .alert {
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 20px;
        }

        .alert-error {
          background: #fee;
          border: 1px solid #fcc;
          color: #c33;
        }

        .alert-success {
          background: #efe;
          border: 1px solid #cfc;
          color: #3c3;
        }
      `}</style>
    </div>
  );
};
