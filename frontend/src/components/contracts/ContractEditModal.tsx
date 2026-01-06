// src/components/contracts/ContractEditModal.tsx
// Modal for editing contracts

import React, { useState } from 'react';
import type { Contract } from '../../services/contract.service';

interface Props {
  contract: Contract;
  managers: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export const ContractEditModal: React.FC<Props> = ({ contract, managers, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    customName: contract.customName || '',
    orderDate: contract.orderDate?.split('T')[0] || '',
    managerCode: contract.managerCode || '',
    projectManagerId: contract.projectManagerId?.toString() || '',
    jowiszRef: contract.jowiszRef || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.customName.trim()) {
      newErrors.customName = 'Nazwa własna jest wymagana';
    }
    
    if (!formData.orderDate) {
      newErrors.orderDate = 'Data zamówienia jest wymagana';
    }
    
    if (!formData.managerCode.trim()) {
      newErrors.managerCode = 'Kod kierownika jest wymagany';
    } else if (formData.managerCode.length !== 3) {
      newErrors.managerCode = 'Kod kierownika musi mieć 3 znaki';
    }
    
    if (!formData.projectManagerId) {
      newErrors.projectManagerId = 'Kierownik projektu jest wymagany';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('accessToken');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      
      const payload: any = {
        customName: formData.customName,
        orderDate: formData.orderDate,
        managerCode: formData.managerCode.toUpperCase(),
        projectManagerId: parseInt(formData.projectManagerId)
      };
      
      if (formData.jowiszRef) {
        payload.jowiszRef = formData.jowiszRef;
      }
      
      const response = await fetch(`${API_BASE_URL}/contracts/${contract.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Błąd aktualizacji kontraktu');
      }
      
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Błąd aktualizacji kontraktu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Edytuj Kontrakt</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="alert alert-error">{error}</div>}
          
          <div className="form-group">
            <label>Numer kontraktu</label>
            <input
              type="text"
              value={contract.contractNumber}
              disabled
              className="disabled"
            />
            <span className="text-muted">Numer kontraktu nie może być zmieniony</span>
          </div>
          
          <div className="form-group">
            <label htmlFor="customName">
              Nazwa własna <span className="required">*</span>
            </label>
            <input
              id="customName"
              type="text"
              className={errors.customName ? 'error' : ''}
              placeholder="Nazwa projektu..."
              value={formData.customName}
              onChange={(e) => setFormData({ ...formData, customName: e.target.value })}
            />
            {errors.customName && <span className="error-text">{errors.customName}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="orderDate">
              Data zamówienia <span className="required">*</span>
            </label>
            <input
              id="orderDate"
              type="date"
              className={errors.orderDate ? 'error' : ''}
              value={formData.orderDate}
              onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
            />
            {errors.orderDate && <span className="error-text">{errors.orderDate}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="managerCode">
              Kod kierownika <span className="required">*</span>
            </label>
            <input
              id="managerCode"
              type="text"
              className={errors.managerCode ? 'error' : ''}
              placeholder="ABC"
              maxLength={3}
              value={formData.managerCode}
              onChange={(e) => setFormData({ ...formData, managerCode: e.target.value.toUpperCase() })}
            />
            {errors.managerCode && <span className="error-text">{errors.managerCode}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="projectManagerId">
              Kierownik projektu <span className="required">*</span>
            </label>
            <select
              id="projectManagerId"
              className={errors.projectManagerId ? 'error' : ''}
              value={formData.projectManagerId}
              onChange={(e) => setFormData({ ...formData, projectManagerId: e.target.value })}
            >
              <option value="">Wybierz kierownika...</option>
              {Array.isArray(managers) && managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName} ({m.username})
                </option>
              ))}
            </select>
            {errors.projectManagerId && <span className="error-text">{errors.projectManagerId}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="jowiszRef">
              Referencja Jowisz <span className="text-muted">(opcjonalny)</span>
            </label>
            <input
              id="jowiszRef"
              type="text"
              placeholder="REF-12345"
              value={formData.jowiszRef}
              onChange={(e) => setFormData({ ...formData, jowiszRef: e.target.value })}
            />
          </div>
          
          <div className="modal-footer">
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
