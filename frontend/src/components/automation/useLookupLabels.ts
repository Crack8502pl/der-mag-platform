// src/components/automation/useLookupLabels.ts
// Czytelne nazwy wybranych osób, ról i funkcji do podsumowań na kafelkach (zamiast identyfikatorów).

import { useCallback, useEffect, useRef, useState } from 'react';
import { automationService } from '../../services/automation.service';
import type { AutomationActionDefinition } from '../../types/automation.types';
import { isEmptyParamValue, isLookupType, lookupKey, visibleParams, type EditableStep } from './automationHelpers';

export function useLookupLabels(steps: EditableStep[], actions: Map<string, AutomationActionDefinition>) {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const requested = useRef(new Set<string>());

  useEffect(() => {
    for (const step of steps) {
      const action = actions.get(step.action);
      if (!action) continue;
      for (const param of visibleParams(action, step.params)) {
        const value = step.params[param.key];
        if (!isLookupType(param.type) || typeof value === 'boolean' || isEmptyParamValue(value)) continue;
        const key = lookupKey(param.type, value);
        if (requested.current.has(key)) continue;
        requested.current.add(key);
        automationService.listLookups(param.type, { value })
          .then(options => {
            const option = options.find(item => String(item.value) === String(value));
            if (option) setLabels(current => ({ ...current, [key]: option.label }));
          })
          .catch(() => undefined);
      }
    }
  }, [steps, actions]);

  const remember = useCallback((key: string, label: string) => {
    requested.current.add(key);
    setLabels(current => ({ ...current, [key]: label }));
  }, []);

  return { labels, remember };
}
