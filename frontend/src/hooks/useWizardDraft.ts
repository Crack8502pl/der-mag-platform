// src/hooks/useWizardDraft.ts
// Hook do zarządzania draftami wizardów z auto-save i przywracaniem

import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

interface UseWizardDraftOptions<T> {
  wizardType: string;
  initialData: T;
  autoSaveInterval?: number;
  onRestore?: (data: T) => void;
  enabled?: boolean;
}

export function useWizardDraft<T extends Record<string, any>>({
  wizardType,
  initialData,
  autoSaveInterval = 30000,
  onRestore,
  enabled = true,
}: UseWizardDraftOptions<T>) {
  const [data, setData] = useState<T>(initialData);
  const [currentStep, setCurrentStep] = useState(1);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [savedDraft, setSavedDraft] = useState<any>(null);
  const loadedRef = useRef(false);

  // Załaduj draft przy montowaniu
  useEffect(() => {
    if (!enabled || loadedRef.current) return;
    loadedRef.current = true;

    const loadDraft = async () => {
      try {
        const response = await api.get(`/wizard-drafts/${wizardType}`);
        if (response.data.success && response.data.data) {
          setSavedDraft(response.data.data);
          setShowRestoreModal(true);
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    };

    loadDraft();
  }, [wizardType, enabled]);

  // Auto-save
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      saveDraft(data, currentStep);
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [data, currentStep, autoSaveInterval, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveDraft = async (draftData: T, step: number) => {
    if (!enabled) return;

    setIsSaving(true);
    try {
      await api.post(`/wizard-drafts/${wizardType}`, {
        draftData,
        currentStep: step,
        metadata: { version: '1.0' },
      });
      setLastSaveTime(new Date());
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const restoreDraft = () => {
    if (savedDraft) {
      setData(savedDraft.draftData);
      setCurrentStep(savedDraft.currentStep || 1);
      setLastSaveTime(new Date(savedDraft.updatedAt));
      onRestore?.(savedDraft.draftData);
    }
    setShowRestoreModal(false);
  };

  const discardDraft = async () => {
    try {
      await api.delete(`/wizard-drafts/${wizardType}`);
    } catch (error) {
      console.error('Failed to discard draft:', error);
    }
    setShowRestoreModal(false);
    setSavedDraft(null);
  };

  const saveAndExit = async (onClose: () => void) => {
    await saveDraft(data, currentStep);
    onClose();
  };

  const clearDraft = async () => {
    try {
      await api.delete(`/wizard-drafts/${wizardType}`);
      setLastSaveTime(null);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  };

  return {
    data,
    setData,
    currentStep,
    setCurrentStep,
    lastSaveTime,
    isSaving,
    saveDraft: () => saveDraft(data, currentStep),
    saveAndExit,
    clearDraft,
    showRestoreModal,
    savedDraft,
    restoreDraft,
    discardDraft,
  };
}
