// src/hooks/useWizardDraft.ts
// Hook do zarządzania draftami wizardów z auto-save i przywracaniem

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

interface UseWizardDraftOptions<T> {
  wizardType: string;
  initialData: T;
  autoSaveInterval?: number;
  onRestore?: (data: T) => void;
  /** Gates draft loading and the restore modal. Set to false to disable the whole hook. */
  enabled?: boolean;
  /** Gates auto-save only; defaults to `enabled`. Set to false to suppress auto-save while still loading the draft. */
  autoSaveEnabled?: boolean;
}

interface SavedDraft<T> {
  id: number;
  wizardType: string;
  userId: number;
  draftData: T;
  currentStep: number | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export function useWizardDraft<T extends Record<string, any>>({
  wizardType,
  initialData,
  autoSaveInterval = 30000,
  onRestore,
  enabled = true,
  autoSaveEnabled,
}: UseWizardDraftOptions<T>) {
  const [data, setData] = useState<T>(initialData);
  const [currentStep, setCurrentStep] = useState(1);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [savedDraft, setSavedDraft] = useState<SavedDraft<T> | null>(null);
  const loadedRef = useRef(false);

  // Refs holding the latest data/step values so the autosave interval never
  // needs to be re-created (and therefore never causes extra re-renders) when
  // those values change.
  const dataRef = useRef(data);
  const stepRef = useRef(currentStep);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { stepRef.current = currentStep; }, [currentStep]);

  const saveDraft = useCallback(
    async (draftData: T, step: number) => {
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
    },
    [wizardType, enabled]
  );

  // Załaduj draft przy montowaniu
  useEffect(() => {
    if (!enabled || loadedRef.current) return;
    loadedRef.current = true;

    const loadDraft = async () => {
      try {
        const response = await api.get(`/wizard-drafts/${wizardType}`);
        if (response.data.success && response.data.data) {
          setSavedDraft(response.data.data as SavedDraft<T>);
          setShowRestoreModal(true);
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    };

    loadDraft();
  }, [wizardType, enabled]);

  // Auto-save — paused while the restore modal is open so that the initial
  // (empty) state cannot overwrite an existing server-side draft before the
  // user has had a chance to choose "restore" or "discard".
  // autoSaveEnabled allows callers to suppress auto-save (e.g. before step 3)
  // while still loading the draft on open.
  // Uses refs for data/currentStep so the interval is not re-created on every
  // state change, preventing excessive re-renders.
  useEffect(() => {
    const shouldAutoSave = autoSaveEnabled !== undefined ? autoSaveEnabled : enabled;
    if (!shouldAutoSave || showRestoreModal) return;

    const interval = setInterval(() => {
      saveDraft(dataRef.current, stepRef.current);
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [autoSaveInterval, autoSaveEnabled, enabled, showRestoreModal, saveDraft]);

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
