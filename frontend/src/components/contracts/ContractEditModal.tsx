// src/components/contracts/ContractEditModal.tsx
// Modal for editing contracts

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { Contract } from '../../services/contract.service';
import contractService from '../../services/contract.service';
import axios from 'axios';
import { getApiBaseURL } from '../../utils/api-url';

const API_BASE_URL = getApiBaseURL();

interface Props {
  contract: Contract;
  onClose: () => void;
  onSuccess: () => void;
}

export const ContractEditModal: React.FC<Props> = ({ contract, onClose, onSuccess }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [managers, setManagers] = useState<Array<{
    id: number;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
  }>>([]);
  
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

  // Load managers only for admin users
  useEffect(() => {
    const loadManagers = async () => {
      if (!isAdmin) return;
      
      try {
        const token = localStorage.getItem('accessToken');
        const response = await axios.get(`${API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { role: 'manager' }
        });
        const data = response.data.data || response.data;
        setManagers(data.users || data || []);
      } catch (err) {
        console.error('Błąd pobierania kierowników:', err);
      }
    };
    
    loadManagers();
  }, [isAdmin]);

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
      const payload: any = {
        customName: formData.customName,
        orderDate: formData.orderDate,
        managerCode: formData.managerCode.toUpperCase(),
        projectManagerId: parseInt(formData.projectManagerId)
      };
      
      if (formData.jowiszRef) {
        payload.jowiszRef = formData.jowiszRef;
      }
      
      await contractService.updateContract(contract.id, payload);
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
            {isAdmin ? (
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
            ) : (
              <>
                <input
                  id="projectManagerId"
                  type="text"
                  className="form-control-readonly"
                  value={contract.projectManager 
                    ? `${contract.projectManager.firstName} ${contract.projectManager.lastName} (${contract.projectManager.username})`
                    : 'N/A'
                  }
                  disabled
                  readOnly
                />
                <span className="text-muted">Kierownik nie może być zmieniony przez użytkownika</span>
              </>
            )}
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
