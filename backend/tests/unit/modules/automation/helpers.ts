// Pomocnicy testów automatyzacji: sklep w pamięci (bez bazy) i zestaw klocków-atrap.

import type { AutomationAction, AutomationStepResult } from '../../../../src/modules/automation/contracts';
import type { AutomationChain } from '../../../../src/modules/automation/entities/AutomationChain';
import type { AutomationRun } from '../../../../src/modules/automation/entities/AutomationRun';
import type { AutomationRunStep } from '../../../../src/modules/automation/entities/AutomationRunStep';
import type { AutomationStore, NewRun, NewStep, RunWithSteps } from '../../../../src/modules/automation/services/AutomationStore';

export class InMemoryAutomationStore implements AutomationStore {
  chains: AutomationChain[] = [];
  runs: AutomationRun[] = [];
  steps: AutomationRunStep[] = [];
  private runSeq = 1;
  private stepSeq = 1;

  addChain(partial: Partial<AutomationChain>): AutomationChain {
    const chain = {
      id: this.chains.length + 1,
      ownerType: 'FORM_TEMPLATE_VERSION',
      ownerId: 5,
      eventType: 'FORM_APPROVED',
      steps: [],
      onError: 'STOP',
      createdById: 11,
      ...partial,
    } as AutomationChain;
    this.chains.push(chain);
    return chain;
  }

  async findChains(ownerType: string, ownerId: number, eventType: string) {
    return this.chains.filter(c => c.ownerType === ownerType && c.ownerId === ownerId && c.eventType === eventType);
  }

  async getChain(id: number) {
    return this.chains.find(c => c.id === id) ?? null;
  }

  async createRun(newRun: NewRun, newSteps: NewStep[]): Promise<RunWithSteps | null> {
    if (!newRun.dryRun && newRun.eventId
      && this.runs.some(r => !r.dryRun && r.chainId === newRun.chainId && r.eventId === newRun.eventId)) return null;
    const run = { id: this.runSeq++, startedAt: new Date(), finishedAt: null, message: null, ...newRun } as AutomationRun;
    this.runs.push(run);
    const steps = newSteps.map(step => ({
      id: this.stepSeq++, runId: run.id, status: 'PENDING', attempt: 0, output: null, error: null, message: null,
      startedAt: null, finishedAt: null, idempotencyKey: `${run.id}:${step.stepIndex}`, ...step,
    }) as AutomationRunStep);
    this.steps.push(...steps);
    return { run, steps };
  }

  async getRun(runId: number) {
    const run = this.runs.find(r => r.id === runId);
    if (!run) return null;
    return { run: { ...run }, steps: this.steps.filter(s => s.runId === runId).sort((a, b) => a.stepIndex - b.stepIndex).map(s => ({ ...s })) };
  }

  async updateRun(runId: number, patch: Partial<AutomationRun>) {
    Object.assign(this.runs.find(r => r.id === runId)!, patch);
  }

  async updateStep(stepId: number, patch: Partial<AutomationRunStep>) {
    Object.assign(this.steps.find(s => s.id === stepId)!, patch);
  }

  async listRuns(_ownerType: string, _ownerId: number, _limit: number): Promise<RunWithSteps[]> {
    return [];
  }
}

export function fakeAction(key: string, run: AutomationAction['run'], overrides: Partial<AutomationAction> = {}): AutomationAction {
  return {
    key,
    label: `Klocek ${key}`,
    description: 'Opis',
    category: 'Test',
    params: [{ key: 'text', label: 'Tekst', type: 'text', required: false }],
    requiredPermission: { module: 'tasks', action: 'read' },
    supportsDryRun: true,
    run,
    ...overrides,
  };
}

export const ok = (message = 'OK'): AutomationStepResult => ({ status: 'OK', message, output: {} });
