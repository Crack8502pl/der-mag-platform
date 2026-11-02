// src/modules/automation/services/AutomationChainService.ts
// Odczyt i zapis łańcuchów: walidacja parametrów i zmiennych, uprawnienia zapisującego do KAŻDEGO klocka,
// niezmienność łańcucha wersji opublikowanej (formularza i procesu).

import type { DataSource, EntityManager } from 'typeorm';
import { AppDataSource } from '../../../config/database';
import type { RolePermissions } from '../../../entities/Role';
import { FormTemplateVersion } from '../../../entities/FormTemplateVersion';
import { FormVersionStatus } from '../../../entities/FormTypes';
import { WorkflowStep } from '../../workflow/entities/WorkflowStep';
import { WorkflowVersion } from '../../workflow/entities/WorkflowVersion';
import { recordWorkflowAudit } from '../../workflow/services/workflowAudit';
import {
  AUTOMATION_OWNER_EVENTS,
  AUTOMATION_OWNER_TYPES,
  type AutomationOnError,
  type AutomationOwnerType,
  type AutomationStepDefinition,
} from '../contracts';
import { AutomationChain } from '../entities/AutomationChain';
import { AutomationError } from '../errors';
import { validateActionParams } from '../paramValidation';
import type { AutomationRegistry } from '../registry/AutomationRegistry';

export const MAX_CHAIN_STEPS = 20;

export interface SaveChainInput {
  ownerType: unknown;
  ownerId: unknown;
  eventType: unknown;
  steps: unknown;
  onError?: unknown;
}

export interface ChainSaver {
  id: number;
  permissions: RolePermissions;
}

export function hasActionPermission(permissions: RolePermissions, module: string, action: string): boolean {
  if (permissions.all === true) return true;
  const modulePermissions = permissions[module];
  return typeof modulePermissions === 'object' && modulePermissions !== null && modulePermissions[action] === true;
}

export class AutomationChainService {
  constructor(
    private readonly registry: AutomationRegistry,
    private readonly dataSource: Pick<DataSource, 'getRepository'> & Partial<Pick<DataSource, 'transaction'>> = AppDataSource,
  ) {}

  private repository(manager?: EntityManager) {
    return (manager ?? this.dataSource).getRepository(AutomationChain);
  }

  getById(id: number): Promise<AutomationChain | null> {
    return this.repository().findOne({ where: { id } });
  }

  find(ownerType: string, ownerId: number, eventType?: string): Promise<AutomationChain[]> {
    return this.repository().find({
      where: eventType ? { ownerType, ownerId, eventType } : { ownerType, ownerId },
      order: { eventType: 'ASC' },
    });
  }

  parseOwner(ownerType: unknown, ownerId: unknown, eventType?: unknown): { ownerType: string; ownerId: number; eventType?: string } {
    const id = typeof ownerId === 'number' ? ownerId : Number(ownerId);
    if (!AUTOMATION_OWNER_TYPES.includes(ownerType as never)) {
      throw new AutomationError('VALIDATION_FAILED', 'Nieobsługiwany typ właściciela łańcucha.');
    }
    if (!Number.isInteger(id) || id <= 0) {
      throw new AutomationError('VALIDATION_FAILED', 'Nieprawidłowy identyfikator właściciela łańcucha.');
    }
    if (eventType !== undefined && !AUTOMATION_OWNER_EVENTS[ownerType as AutomationOwnerType].includes(eventType as never)) {
      throw new AutomationError('VALIDATION_FAILED', 'Nieobsługiwany typ zdarzenia.');
    }
    return { ownerType: ownerType as string, ownerId: id, eventType: eventType as string | undefined };
  }

  /** Zapis (utworzenie lub zastąpienie) łańcucha dla (właściciel, zdarzenie). */
  async save(input: SaveChainInput, saver: ChainSaver): Promise<AutomationChain> {
    const owner = this.parseOwner(input.ownerType, input.ownerId, input.eventType);
    if (!owner.eventType) throw new AutomationError('VALIDATION_FAILED', 'Wybierz zdarzenie, po którym łańcuch ma się uruchamiać.');
    const eventType = owner.eventType;
    if (owner.ownerType === 'WORKFLOW_STEP') return this.saveWorkflowStepChain(owner.ownerId, eventType, input, saver);
    await this.assertOwnerEditable(owner.ownerType, owner.ownerId);

    const { steps, onError } = this.prepare(input, saver);

    const repository = this.repository();
    const existing = await repository.findOne({ where: { ownerType: owner.ownerType, ownerId: owner.ownerId, eventType } });
    const chain = existing ?? repository.create({ ownerType: owner.ownerType, ownerId: owner.ownerId, eventType });
    chain.steps = steps;
    chain.onError = onError;
    chain.createdById = saver.id;
    return repository.save(chain);
  }

  /**
   * Łańcuch etapu procesu można zmieniać tylko w wersji roboczej (DRAFT) i tylko z uprawnieniem workflow.build.
   * Wersja jest blokowana na czas zapisu (wyścig z publikacją), a zmiana trafia do dziennika audytowego.
   */
  private async saveWorkflowStepChain(stepId: number, eventType: string, input: SaveChainInput, saver: ChainSaver): Promise<AutomationChain> {
    if (!this.dataSource.transaction) throw new Error('Zapis łańcucha etapu procesu wymaga transakcji bazy danych.');
    return this.dataSource.transaction(async manager => {
      const notFound = () => new AutomationError('OWNER_NOT_FOUND', 'Nie znaleziono etapu procesu.');
      const found = await manager.getRepository(WorkflowStep).findOne({ where: { id: stepId } });
      if (!found) throw notFound();
      const version = await manager.getRepository(WorkflowVersion).findOne({
        where: { id: found.versionId },
        lock: { mode: 'pessimistic_write' },
      });
      const step = version ? await manager.getRepository(WorkflowStep).findOne({ where: { id: stepId, versionId: version.id } }) : null;
      if (!version || !step) throw notFound();
      if (!hasActionPermission(saver.permissions, 'workflow', 'build')) {
        throw new AutomationError(
          'ACTION_FORBIDDEN',
          'Łańcuchy etapów procesu może zmieniać tylko osoba z uprawnieniem do budowania procesów.',
          { required: 'workflow.build' },
        );
      }
      if (version.status !== 'DRAFT') {
        throw new AutomationError(
          'CHAIN_IMMUTABLE',
          'Łańcuch etapu opublikowanej wersji procesu jest niezmienny. Utwórz nową wersję procesu i zmień łańcuch w niej.',
        );
      }
      const { steps, onError } = this.prepare(input, saver);

      const repository = manager.getRepository(AutomationChain);
      const existing = await repository.findOne({ where: { ownerType: 'WORKFLOW_STEP', ownerId: stepId, eventType } });
      const before = existing ? { steps: existing.steps, onError: existing.onError } : null;
      const chain = existing ?? repository.create({ ownerType: 'WORKFLOW_STEP', ownerId: stepId, eventType });
      chain.steps = steps;
      chain.onError = onError;
      chain.createdById = saver.id;
      const saved = await repository.save(chain);
      await recordWorkflowAudit(manager, 'WORKFLOW_STEP_CHAIN_UPDATED', saver.id, 'workflow_version', {
        definitionId: version.definitionId,
        versionId: version.id,
        version: version.version,
        stepId,
        stepKey: step.key,
        eventType,
        before,
        after: { steps, onError },
      });
      return saved;
    });
  }

  private prepare(input: SaveChainInput, saver: ChainSaver): { steps: AutomationStepDefinition[]; onError: AutomationOnError } {
    const onError = input.onError === undefined ? 'STOP' : input.onError;
    if (onError !== 'STOP' && onError !== 'CONTINUE') {
      throw new AutomationError('VALIDATION_FAILED', 'Wybierz, co zrobić po błędzie kroku: zatrzymać łańcuch albo kontynuować.');
    }
    const steps = this.normalizeSteps(input.steps);
    this.assertPermissions(steps, saver.permissions);
    this.assertValid(steps);
    return { steps, onError };
  }

  private async assertOwnerEditable(ownerType: string, ownerId: number): Promise<void> {
    if (ownerType !== 'FORM_TEMPLATE_VERSION') return;
    const version = await this.dataSource.getRepository(FormTemplateVersion).findOne({ where: { id: ownerId } });
    if (!version) throw new AutomationError('OWNER_NOT_FOUND', 'Nie znaleziono wersji formularza.');
    if (version.status === FormVersionStatus.PUBLISHED) {
      throw new AutomationError('CHAIN_IMMUTABLE', 'Łańcuch opublikowanej wersji formularza jest niezmienny. Utwórz nową wersję i zmień łańcuch w niej.');
    }
  }

  private normalizeSteps(raw: unknown): AutomationStepDefinition[] {
    if (!Array.isArray(raw)) throw new AutomationError('VALIDATION_FAILED', 'Kroki łańcucha muszą być listą.');
    if (raw.length > MAX_CHAIN_STEPS) {
      throw new AutomationError('VALIDATION_FAILED', `Łańcuch może mieć maksymalnie ${MAX_CHAIN_STEPS} kroków.`);
    }
    return raw.map((step, index) => {
      if (typeof step !== 'object' || step === null || typeof (step as { action?: unknown }).action !== 'string') {
        throw new AutomationError('VALIDATION_FAILED', `Krok ${index + 1}: wybierz klocek.`);
      }
      const { action, params } = step as { action: string; params?: unknown };
      return { action, params: (params ?? {}) as AutomationStepDefinition['params'] };
    });
  }

  private assertPermissions(steps: AutomationStepDefinition[], permissions: RolePermissions): void {
    steps.forEach((step, index) => {
      const action = this.registry.get(step.action);
      if (!action) return;
      const { module, action: permission } = action.requiredPermission;
      if (!hasActionPermission(permissions, module, permission)) {
        throw new AutomationError(
          'ACTION_FORBIDDEN',
          `Krok ${index + 1}: nie masz uprawnień do klocka „${action.label}”.`,
          { stepIndex: index, required: `${module}.${permission}` },
        );
      }
    });
  }

  private assertValid(steps: AutomationStepDefinition[]): void {
    const errors: Array<{ stepIndex: number; message: string }> = [];
    steps.forEach((step, stepIndex) => {
      const action = this.registry.get(step.action);
      if (!action) {
        errors.push({ stepIndex, message: `Krok ${stepIndex + 1}: nieznany klocek „${step.action}”.` });
        return;
      }
      for (const message of validateActionParams(action, step.params)) {
        errors.push({ stepIndex, message: `Krok ${stepIndex + 1} (${action.label}): ${message}` });
      }
    });
    if (errors.length) {
      throw new AutomationError('VALIDATION_FAILED', errors.map(error => error.message).join(' '), errors);
    }
  }
}
