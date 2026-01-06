// src/components/contracts/ContractCreateModal.tsx
// Modal for creating new contracts

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import contractService from '../../services/contract.service';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const ContractCreateModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    contractNumber: '',
    customName: '',
    orderDate: '',
    managerCode: '',
    projectManagerId: user?.id?.toString() || '',
    jowiszRef: ''
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
    
    if (!user || !user.id) {
      newErrors.projectManagerId = 'Nie znaleziono aktualnego użytkownika';
    }
    
    // Validate contract number format if provided
    if (formData.contractNumber && !/^R\d{7}_[A-Z]$/.test(formData.contractNumber)) {
      newErrors.contractNumber = 'Nieprawidłowy format numeru kontraktu (RXXXXXXX_Y, gdzie Y to litera A-Z)';
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
        projectManagerId: user!.id
      };
      
      if (formData.contractNumber) {
        payload.contractNumber = formData.contractNumber;
      }
      
      if (formData.jowiszRef) {
        payload.jowiszRef = formData.jowiszRef;
      }
      
      await contractService.createContract(payload);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Błąd tworzenia kontraktu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📝 Nowy Kontrakt</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="alert alert-error">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="contractNumber">
              Numer kontraktu <span className="text-muted">(opcjonalny - auto-generowany)</span>
            </label>
            <input
              id="contractNumber"
              type="text"
              className={errors.contractNumber ? 'error' : ''}
              placeholder="R0000001_A"
              value={formData.contractNumber}
              onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value.toUpperCase() })}
            />
            {errors.contractNumber && <span className="error-text">{errors.contractNumber}</span>}
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
            <input
              id="projectManagerId"
              type="text"
              className="form-control-readonly"
              value={user ? `${user.firstName} ${user.lastName} (${user.username})` : ''}
              disabled
              readOnly
            />
            <span className="text-muted">Automatycznie ustawiony na aktualnego użytkownika</span>
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
              {loading ? 'Tworzenie...' : 'Utwórz kontrakt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
