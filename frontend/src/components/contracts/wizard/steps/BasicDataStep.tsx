// src/components/contracts/wizard/steps/BasicDataStep.tsx
// Step 1: Basic contract data

import React, { useState, useEffect } from 'react';
import { SUBSYSTEM_WIZARD_CONFIG } from '../../../../config/subsystemWizardConfig';
import { validateContractNumber } from '../utils/validation';
import type { WizardData } from '../types/wizard.types';
import type { User as AdminUser, Role } from '../../../../types/admin.types';
import { api } from '../../../../services/api';
import { useAuth } from '../../../../hooks/useAuth';

interface Props {
  wizardData: WizardData;
  detectedSubsystems: string[];
  onUpdate: (data: Partial<WizardData>) => void;
  onDetectSubsystems: (name: string) => void;
}

// Helper to get role name
const getRoleName = (role: string | Role | null | undefined): string => {
  if (typeof role === 'string') return role;
  if (role && typeof role === 'object' && role.name) return role.name;
  return '';
};

export const BasicDataStep: React.FC<Props> = ({
  wizardData,
  detectedSubsystems,
  onUpdate,
  onDetectSubsystems
}) => {
  const { user } = useAuth();
  const [contractNumberError, setContractNumberError] = useState('');
  const [availableManagers, setAvailableManagers] = useState<AdminUser[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);

  // Check if current user can select managers (Admin or Board)
  const roleName = getRoleName(user?.role);
  const canSelectManager = roleName === 'admin' || roleName === 'board';

  // Load managers on mount if user can select
  useEffect(() => {
    if (canSelectManager) {
      loadManagers();
    }
  }, [canSelectManager]);

  const loadManagers = async () => {
    setLoadingManagers(true);
    try {
      // Use new dedicated endpoint for project managers
      const response = await api.get('/users/project-managers');
      
      if (response.data.success && Array.isArray(response.data.data)) {
        const managers = response.data.data;
        setAvailableManagers(managers);
      } else {
        console.warn('Project managers endpoint returned invalid data');
        // Fallback to current user if endpoint returns no data
        if (user) {
          setAvailableManagers([{
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: undefined,
            roleId: 0,
            role: { id: 0, name: user.role || '', permissions: user.permissions || {} },
            active: true,
            forcePasswordChange: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }]);
        } else {
          setAvailableManagers([]);
        }
      }
    } catch (err) {
      console.error('Failed to load project managers:', err);
      // If loading fails, at least include current user
      if (user) {
        setAvailableManagers([{
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: undefined,
          roleId: 0,
          role: { id: 0, name: user.role || '', permissions: user.permissions || {} },
          active: true,
          forcePasswordChange: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]);
      } else {
        setAvailableManagers([]);
      }
    } finally {
      setLoadingManagers(false);
    }
  };

  const handleContractNumberChange = (value: string) => {
    const upperValue = value.toUpperCase();
    onUpdate({ contractNumber: upperValue });
    
    if (upperValue && !validateContractNumber(upperValue)) {
      setContractNumberError('Format: R0000001_A (R + 7 cyfr + _ + wielka litera)');
    } else {
      setContractNumberError('');
    }
  };

  const handleManagerChange = (selectedManagerId: string) => {
    const selectedManager = availableManagers.find(m => m.id.toString() === selectedManagerId);
    onUpdate({
      projectManagerId: selectedManagerId,
      managerCode: selectedManager?.employeeCode || wizardData.managerCode
    });
  };

  return (
    <div className="wizard-step-content">
      <h3>Krok 1: Dane podstawowe</h3>
      
      <div className="form-group">
        <label>
          Numer kontraktu <span className="text-muted">(opcjonalny - auto-generowany)</span>
        </label>
        <input
          type="text"
          value={wizardData.contractNumber}
          onChange={(e) => handleContractNumberChange(e.target.value)}
          placeholder="R0000001_A"
          className={contractNumberError ? 'error' : ''}
        />
        {contractNumberError && <span className="error-text">{contractNumberError}</span>}
      </div>
      
      <div className="form-group">
        <label>Nazwa kontraktu *</label>
        <input
          type="text"
          value={wizardData.customName}
          onChange={(e) => onDetectSubsystems(e.target.value)}
          placeholder="np. Modernizacja SMOK-A Warszawa"
        />
        {detectedSubsystems.length > 0 && (
          <div className="detected-subsystem">
            ✅ Wykryto podsystemy: {detectedSubsystems.map((type: string) => {
              const config = SUBSYSTEM_WIZARD_CONFIG[type as keyof typeof SUBSYSTEM_WIZARD_CONFIG];
              return config.label;
            }).join(', ')}
          </div>
        )}
      </div>
      
      <div className="form-group">
        <label>Data zamówienia *</label>
        <input
          type="date"
          value={wizardData.orderDate}
          onChange={(e) => onUpdate({ orderDate: e.target.value })}
        />
      </div>
      
      <div className="form-group">
        <label>Kierownik projektu *</label>
        {canSelectManager ? (
          <>
            <select
              value={wizardData.projectManagerId}
              onChange={(e) => handleManagerChange(e.target.value)}
              disabled={loadingManagers}
            >
              <option value="">Wybierz kierownika projektu</option>
              {availableManagers.map(manager => (
                <option key={manager.id} value={manager.id}>
                  {manager.firstName} {manager.lastName} ({manager.username}) - {manager.role?.name || 'Brak roli'}
                </option>
              ))}
            </select>
            {loadingManagers && <span className="text-muted">Ładowanie listy kierowników...</span>}
            {!loadingManagers && <span className="text-muted">Admin i Zarząd mogą wybrać dowolnego kierownika</span>}
          </>
        ) : (
          <>
            <input
              type="text"
              className="form-control-readonly"
              value={user ? `${user.firstName} ${user.lastName} (${user.username})` : ''}
              disabled
              readOnly
            />
            <span className="text-muted">Automatycznie ustawiony na aktualnego użytkownika</span>
          </>
        )}
      </div>
      
      <div className="form-group">
        <label>Kod kierownika (do 5 znaków) *</label>
        <input
          type="text"
          value={wizardData.managerCode}
          onChange={(e) => onUpdate({ managerCode: e.target.value.toUpperCase().slice(0, 5) })}
          maxLength={5}
          placeholder="np. ABC12"
        />
      </div>
    </div>
  );
};
