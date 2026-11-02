// src/components/automation/AutomationRunsSection.tsx
// Sekcja „Automatyzacje” w widoku wypełnionego formularza: lista uruchomień łańcucha dla tego formularza.

import { useEffect, useMemo, useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { automationService } from '../../services/automation.service';
import type { AutomationActionDefinition, AutomationOwnerType, AutomationRun } from '../../types/automation.types';
import { AutomationStepResults } from './AutomationStepResults';
import { EVENT_LABELS, formatRunDate, RUN_STATUS_LABELS } from './automationHelpers';
import './automation.css';

export interface AutomationRunsSectionProps {
  ownerType: AutomationOwnerType;
  ownerId: number;
  instanceId: number;
}

interface LoadedRuns {
  key: string;
  runs?: AutomationRun[];
  actions?: AutomationActionDefinition[];
  failed?: boolean;
}

export function AutomationRunsSection(props: AutomationRunsSectionProps) {
  const { hasPermission } = usePermissions();
  if (!hasPermission('automation', 'read')) return null;
  return <AutomationRunsList {...props} />;
}

function AutomationRunsList({ ownerType, ownerId, instanceId }: AutomationRunsSectionProps) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<LoadedRuns | null>(null);
  const loadKey = `${ownerType}:${ownerId}:${instanceId}:${attempt}`;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      automationService.listRuns({ ownerType, ownerId }, { instanceId }),
      automationService.listActions().catch(() => [] as AutomationActionDefinition[]),
    ]).then(([runs, actions]) => {
      if (!cancelled) setLoaded({ key: loadKey, runs, actions });
    }).catch(() => {
      if (!cancelled) setLoaded({ key: loadKey, failed: true });
    });
    return () => { cancelled = true; };
  }, [ownerType, ownerId, instanceId, loadKey]);

  const actionsByKey = useMemo(
    () => new Map((loaded?.actions ?? []).map(action => [action.key, action])),
    [loaded?.actions],
  );
  const ready = loaded?.key === loadKey;
  const runs = ready ? (loaded.runs ?? []) : [];

  return (
    <section className="automation-runs" aria-label="Automatyzacje">
      <h3>Automatyzacje</h3>
      {!ready && <p className="automation-hint" role="status">Wczytywanie automatyzacji…</p>}
      {ready && loaded.failed && (
        <div className="automation-notice automation-notice--error" role="alert">
          <p>Nie udało się wczytać listy uruchomień.</p>
          <button type="button" className="btn btn-secondary" onClick={() => setAttempt(current => current + 1)}>
            Spróbuj ponownie
          </button>
        </div>
      )}
      {ready && !loaded.failed && runs.length === 0 && (
        <p className="automation-hint">Dla tego formularza nie uruchomiono jeszcze żadnych automatyzacji.</p>
      )}
      {runs.length > 0 && (
        <ul className="automation-runs__list">
          {runs.map(run => (
            <li key={run.id} className="automation-runs__item">
              <div className="automation-runs__head">
                <strong>{formatRunDate(run.startedAt)}</strong>
                <span className={`automation-badge automation-badge--${run.status.toLowerCase()}`}>
                  {RUN_STATUS_LABELS[run.status] ?? run.status}
                </span>
                {run.event?.type && EVENT_LABELS[run.event.type] && (
                  <span className="automation-hint">{EVENT_LABELS[run.event.type]}</span>
                )}
                {run.dryRun && <span className="automation-badge automation-badge--test">Test</span>}
              </div>
              {run.message && <p className="automation-hint">{run.message}</p>}
              <AutomationStepResults steps={run.steps ?? []} actions={actionsByKey} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
