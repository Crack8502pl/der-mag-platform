// src/modules/automation/registry/AutomationRegistry.ts
// Rejestr klocków – nowy klocek = nowy plik w actions/ + jedna linia rejestracji w actions/index.ts.

import type { AutomationAction, AutomationActionDescriptor, AutomationParamOption } from '../contracts';

export class AutomationRegistry {
  private readonly actions = new Map<string, AutomationAction>();

  register(action: AutomationAction): this {
    if (this.actions.has(action.key)) {
      throw new Error(`Klocek automatyzacji „${action.key}” jest już zarejestrowany`);
    }
    this.actions.set(action.key, action);
    return this;
  }

  get(key: string): AutomationAction | undefined {
    return this.actions.get(key);
  }

  list(): AutomationAction[] {
    return [...this.actions.values()];
  }

  /** Katalog dla interfejsu: opisy klocków z parametrami (bez funkcji wykonawczych). */
  async describe(): Promise<AutomationActionDescriptor[]> {
    return Promise.all(this.list().map(async action => {
      const dynamic: Record<string, AutomationParamOption[]> = action.loadOptions
        ? await action.loadOptions().catch(() => ({}))
        : {};
      return {
        key: action.key,
        label: action.label,
        description: action.description,
        category: action.category,
        params: action.params.map(param => (dynamic[param.key] ? { ...param, options: dynamic[param.key] } : param)),
        requiredPermission: action.requiredPermission,
        supportsDryRun: action.supportsDryRun,
      };
    }));
  }
}
