import { EntityManager } from 'typeorm';
import { FallbackMode } from '../modules/variable-engine/contracts';
import { VariableEngineFactory } from '../modules/variable-engine/factory';
import { ContractVariableProvider } from '../modules/variable-engine/providers/contract/ContractVariableProvider';
import { TaskVariableProvider } from '../modules/variable-engine/providers/task/TaskVariableProvider';
import { UserVariableProvider } from '../modules/variable-engine/providers/user/UserVariableProvider';
import { getFormDataSource } from '../modules/variable-engine/formDataSources';
import { FormVariableDataServices } from './FormVariableDataServices';

export interface FormDataSourceContext {
  taskId?: number | null;
  contractId?: number | null;
  userId?: number | null;
}

export class FormDataSourceResolver {
  private readonly evaluator: ReturnType<VariableEngineFactory['create']>['engine'];

  constructor(manager: EntityManager) {
    const dataServices = new FormVariableDataServices(manager);
    this.evaluator = new VariableEngineFactory([
      new TaskVariableProvider(dataServices),
      new ContractVariableProvider(dataServices),
      new UserVariableProvider(dataServices),
    ], { resolver: { bypassCache: true } }).create().engine;
  }

  async resolve(source: string, context: FormDataSourceContext): Promise<string | number | boolean | null> {
    const definition = getFormDataSource(source);
    if (!definition) return null;
    const namespace = source.split('.')[0];
    const entity = namespace === 'task'
      ? context.taskId != null ? { entityId: context.taskId, entityType: 'task' } : undefined
      : namespace === 'contract'
        ? context.taskId != null
          ? { entityId: context.taskId, entityType: 'task' }
          : context.contractId != null ? { entityId: context.contractId, entityType: 'contract' } : undefined
        : namespace === 'user'
          ? context.taskId != null
            ? { entityId: context.taskId, entityType: 'task' }
            : context.userId != null ? { entityId: context.userId, entityType: 'user' } : undefined
          : undefined;
    if (!entity) return null;

    const token = `\${${source}}`;
    const result = await this.evaluator.evaluate(token, entity, {
      fallbackMode: FallbackMode.PRESERVE,
    });
    if (result === token || result.trim() === '') return null;

    switch (definition.type) {
      case 'string':
        return result;
      case 'number': {
        const value = Number(result);
        return Number.isFinite(value) ? value : null;
      }
      case 'boolean':
        if (result === 'true') return true;
        if (result === 'false') return false;
        return null;
    }
  }
}
