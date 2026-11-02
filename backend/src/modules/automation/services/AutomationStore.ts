// src/modules/automation/services/AutomationStore.ts
// Warstwa zapisu dziennika uruchomień (interfejs + implementacja TypeORM).

import { DataSource, In } from 'typeorm';
import { AppDataSource } from '../../../config/database';
import { AutomationChain } from '../entities/AutomationChain';
import { AutomationRun } from '../entities/AutomationRun';
import { AutomationRunStep } from '../entities/AutomationRunStep';

export type NewRun = Pick<AutomationRun, 'chainId' | 'eventId' | 'event' | 'status' | 'dryRun' | 'causationDepth' | 'chainAuthorId' | 'actorId'>
  & Partial<Pick<AutomationRun, 'message' | 'finishedAt'>>;
export type NewStep = Pick<AutomationRunStep, 'stepIndex' | 'action' | 'input'>;

export interface RunWithSteps {
  run: AutomationRun;
  steps: AutomationRunStep[];
}

export interface AutomationStore {
  findChains(ownerType: string, ownerId: number, eventType: string): Promise<AutomationChain[]>;
  getChain(id: number): Promise<AutomationChain | null>;
  /** Zwraca null, gdy to samo zdarzenie uruchomiło już ten łańcuch (duplikat). */
  createRun(run: NewRun, steps: NewStep[]): Promise<RunWithSteps | null>;
  getRun(runId: number): Promise<RunWithSteps | null>;
  updateRun(runId: number, patch: Partial<AutomationRun>): Promise<void>;
  updateStep(stepId: number, patch: Partial<AutomationRunStep>): Promise<void>;
  listRuns(ownerType: string, ownerId: number, limit: number): Promise<RunWithSteps[]>;
}

const UNIQUE_VIOLATION = '23505';

export class TypeOrmAutomationStore implements AutomationStore {
  constructor(private readonly dataSource: DataSource = AppDataSource) {}

  findChains(ownerType: string, ownerId: number, eventType: string): Promise<AutomationChain[]> {
    return this.dataSource.getRepository(AutomationChain).find({ where: { ownerType, ownerId, eventType } });
  }

  getChain(id: number): Promise<AutomationChain | null> {
    return this.dataSource.getRepository(AutomationChain).findOne({ where: { id } });
  }

  async createRun(newRun: NewRun, newSteps: NewStep[]): Promise<RunWithSteps | null> {
    try {
      return await this.dataSource.transaction(async manager => {
        const runs = manager.getRepository(AutomationRun);
        const run = await runs.save(runs.create(newRun));
        const stepRepository = manager.getRepository(AutomationRunStep);
        const steps = newSteps.length
          ? await stepRepository.save(newSteps.map(step => stepRepository.create({
            ...step,
            runId: run.id,
            status: 'PENDING',
            attempt: 0,
            idempotencyKey: `${run.id}:${step.stepIndex}`,
          })))
          : [];
        return { run, steps };
      });
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) return null;
      throw error;
    }
  }

  async getRun(runId: number): Promise<RunWithSteps | null> {
    const run = await this.dataSource.getRepository(AutomationRun).findOne({ where: { id: runId } });
    if (!run) return null;
    const steps = await this.dataSource.getRepository(AutomationRunStep).find({ where: { runId }, order: { stepIndex: 'ASC' } });
    return { run, steps };
  }

  async updateRun(runId: number, patch: Partial<AutomationRun>): Promise<void> {
    await this.dataSource.getRepository(AutomationRun).update({ id: runId }, patch as never);
  }

  async updateStep(stepId: number, patch: Partial<AutomationRunStep>): Promise<void> {
    await this.dataSource.getRepository(AutomationRunStep).update({ id: stepId }, patch as never);
  }

  async listRuns(ownerType: string, ownerId: number, limit: number): Promise<RunWithSteps[]> {
    const runs = await this.dataSource.getRepository(AutomationRun)
      .createQueryBuilder('run')
      .innerJoin(AutomationChain, 'chain', 'chain.id = run.chainId')
      .where('chain.ownerType = :ownerType AND chain.ownerId = :ownerId', { ownerType, ownerId })
      .orderBy('run.startedAt', 'DESC')
      .addOrderBy('run.id', 'DESC')
      .limit(limit)
      .getMany();
    if (!runs.length) return [];
    const steps = await this.dataSource.getRepository(AutomationRunStep).find({
      where: { runId: In(runs.map(run => run.id)) },
      order: { stepIndex: 'ASC' },
    });
    return runs.map(run => ({ run, steps: steps.filter(step => step.runId === run.id) }));
  }
}
