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
        console.log('[useWizardDraft] Saving draft:', {
          wizardType,
          currentStep: step,
          hasTaskRelationships: 'taskRelationships' in draftData,
          relationshipsKeys: 'taskRelationships' in draftData
            ? Object.keys((draftData as any).taskRelationships || {})
            : [],
        });

        await api.post(`/wizard-drafts/${wizardType}`, {
          draftData,
          currentStep: step,
          metadata: { version: '1.0' },
        });
        setLastSaveTime(new Date());

        console.log('[useWizardDraft] Draft saved successfully');
      } catch (error) {
        console.error('[useWizardDraft] Failed to save draft:', error);
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

  /**
   * Sanitize draft data to ensure critical structures are preserved.
   * Specifically handles taskRelationships which must never be undefined.
   */
  const sanitizeDraftData = useCallback((draftData: T): T => {
    if ('taskRelationships' in draftData) {
      // Ensure taskRelationships is always an object, never undefined/null
      const taskRelationships: Record<string, unknown> = (draftData.taskRelationships as Record<string, unknown>) || {};
      const sanitized: T = { ...draftData, taskRelationships };

      const keys = Object.keys(taskRelationships);
      console.log('[useWizardDraft] Sanitized draft data:', {
        hasRelationships: !!draftData.taskRelationships,
        relationshipsKeys: keys,
        relationshipsCount: keys.length,
      });

      return sanitized;
    }

    return draftData;
  }, []);

  const restoreDraft = () => {
    if (savedDraft) {
      console.log('[useWizardDraft] Restoring draft:', {
        wizardType,
        draftId: savedDraft.id,
        currentStep: savedDraft.currentStep,
        updatedAt: savedDraft.updatedAt,
        hasTaskRelationships: 'taskRelationships' in savedDraft.draftData,
      });

      const sanitizedData = sanitizeDraftData(savedDraft.draftData);

      setData(sanitizedData);
      setCurrentStep(savedDraft.currentStep || 1);
      setLastSaveTime(new Date(savedDraft.updatedAt));
      onRestore?.(sanitizedData);

      console.log('[useWizardDraft] Draft restored successfully');
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
