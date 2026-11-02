// src/components/automation/AutomationStepResults.tsx
// Lista kroków uruchomienia z wynikiem (OK / pominięto / błąd) i komunikatem po polsku.

import type { AutomationActionDefinition, AutomationRunStep } from '../../types/automation.types';
import { STEP_STATUS_LABELS } from './automationHelpers';

export interface AutomationStepResultsProps {
  steps: AutomationRunStep[];
  actions?: Map<string, AutomationActionDefinition>;
}

export function AutomationStepResults({ steps, actions }: AutomationStepResultsProps) {
  if (steps.length === 0) return <p className="automation-hint">Brak wykonanych kroków.</p>;
  return (
    <ol className="automation-results">
      {[...steps].sort((a, b) => a.stepIndex - b.stepIndex).map(step => (
        <li key={`${step.stepIndex}:${step.id ?? ''}`} className={`automation-results__item is-${step.status.toLowerCase()}`}>
          <span className="automation-results__title">
            {`${step.stepIndex + 1}. ${actions?.get(step.action)?.label ?? 'Krok automatyzacji'}`}
          </span>
          <span className={`automation-badge automation-badge--${step.status.toLowerCase()}`}>
            {STEP_STATUS_LABELS[step.status] ?? step.status}
          </span>
          {step.message && <p className="automation-results__message">{step.message}</p>}
        </li>
      ))}
    </ol>
  );
}
