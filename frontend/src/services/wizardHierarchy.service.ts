// src/services/wizardHierarchy.service.ts
// Resolves hierarchy context (depth, parent, children, path) for wizard tasks.
// Used by TaskConfigurationStep to inject hierarchy.* variables into configParams
// before BOM template rules are evaluated.

import api from './api';
import type { WizardTaskRelationship } from '../components/contracts/wizard/types/wizard.types';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface WizardHierarchyContext {
  /** Depth in the hierarchy tree: 0 = root (LCS / standalone task). */
  depth: number;
  /** Wizard key or task number of the direct parent, or null for root tasks. */
  parentKey: string | null;
  /** Number of direct children of this task. */
  childrenCount: number;
  /** Ancestor path as slash-separated keys, e.g. "parentKey/taskKey". */
  path: string;
  /** True when the direct parent is an LCS task. */
  isChildOfLcs: boolean;
}

// ─── Module-level cache (per-session, per taskKey) ────────────────────────────

const cache = new Map<string, WizardHierarchyContext>();

// ─── Service ──────────────────────────────────────────────────────────────────

export const wizardHierarchyService = {
  /**
   * Resolve hierarchy context for the given task.
   *
   * - If `taskNumber` is supplied (non-empty) → backend DB mode (extend contract).
   * - Otherwise → backend in-memory mode using the supplied `wizardRelationships`.
   *
   * Results are cached per `taskKey` for the lifetime of the module (wizard
   * session) to avoid redundant API calls.
   */
  async resolveHierarchy(params: {
    taskKey: string;
    taskNumber?: string;
    wizardRelationships?: WizardTaskRelationship[];
  }): Promise<WizardHierarchyContext | null> {
    const cacheKey = params.taskKey;

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!;
    }

    try {
      const response = await api.post(
        '/bom-subsystem-templates/resolve-wizard-hierarchy',
        {
          taskKey: params.taskKey,
          taskNumber: params.taskNumber,
          wizardRelationships: params.wizardRelationships,
        }
      );

      const ctx = response.data.data as WizardHierarchyContext;
      cache.set(cacheKey, ctx);
      return ctx;
    } catch (err) {
      console.error('[wizardHierarchyService] resolveHierarchy failed for', params.taskKey, err);
      return null;
    }
  },

  /** Clear the in-memory hierarchy cache (e.g. when relationships change). */
  clearCache(): void {
    cache.clear();
  },
};
