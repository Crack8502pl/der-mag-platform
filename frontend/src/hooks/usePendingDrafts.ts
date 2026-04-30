// src/hooks/usePendingDrafts.ts
// Hook do pobierania listy oczekujących draftów wizardów

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export interface PendingDraft {
  id: number;
  wizardType: string;
  currentStep: number | null;
  draftData: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  updatedAt: string;
  expiresAt: string;
}

/**
 * Extracts the contract number from a pending draft's data.
 * Returns null when no contract number is available (e.g. shipment wizards).
 */
export const getDraftContractNumber = (draft: PendingDraft): string | null => {
  if (!draft.draftData) return null;

  // Standard contract wizard: draftData.contractNumber
  const cn = draft.draftData.contractNumber;
  if (typeof cn === 'string' && cn.trim()) return cn.trim();

  // Extend wizard: draftData.contract.contractNumber
  const contract = draft.draftData.contract as Record<string, unknown> | undefined;
  if (contract && typeof contract.contractNumber === 'string' && contract.contractNumber.trim()) {
    return contract.contractNumber.trim();
  }

  return null;
};

interface WizardConfig {
  label: string;
  getPath: (wizardType: string) => string;
}

const WIZARD_CONFIG: Record<string, WizardConfig> = {
  shipment_wizard_smoka: {
    label: 'Wysyłka SMOKIP-A',
    getPath: () => '/contracts',
  },
  shipment_wizard_smokb: {
    label: 'Wysyłka SMOKIP-B',
    getPath: () => '/contracts',
  },
  contract_wizard: {
    label: 'Kreator kontraktu',
    getPath: () => '/contracts',
  },
  contract_wizard_edit: {
    label: 'Edycja kontraktu',
    getPath: () => '/contracts',
  },
};

const getWizardConfig = (wizardType: string): WizardConfig => {
  // Exact match
  if (WIZARD_CONFIG[wizardType]) return WIZARD_CONFIG[wizardType];

  // Prefix match for dynamic types like "shipment_wizard_smoka_42"
  for (const [key, config] of Object.entries(WIZARD_CONFIG)) {
    if (wizardType.startsWith(key + '_')) return config;
  }

  return {
    label: wizardType,
    getPath: () => '/contracts',
  };
};

export const getWizardLabel = (wizardType: string): string =>
  getWizardConfig(wizardType).label;

export const getWizardPath = (wizardType: string): string =>
  getWizardConfig(wizardType).getPath(wizardType);

export function usePendingDrafts() {
  const [drafts, setDrafts] = useState<PendingDraft[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/wizard-drafts');
      if (response.data.success) {
        setDrafts(response.data.data as PendingDraft[]);
      }
    } catch (error) {
      console.error('Failed to load pending drafts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  return { drafts, loading, refetch: fetchDrafts };
}
