// src/modules/automation/runtime.ts
// Wspólne instancje modułu oraz podpięcie do magistrali zdarzeń.

import { domainEventBus } from '../events/DomainEventBus';
import { automationRegistry } from './actions';
import { AUTOMATION_EVENT_TYPES } from './contracts';
import { AutomationChainService } from './services/AutomationChainService';
import { AutomationExecutionService } from './services/AutomationExecutionService';
import { AutomationQueueService } from './services/AutomationQueueService';
import { TypeOrmAutomationStore } from './services/AutomationStore';

export const automationStore = new TypeOrmAutomationStore();
export const automationQueue = new AutomationQueueService();
export const automationChains = new AutomationChainService(automationRegistry);
export const automationExecution = new AutomationExecutionService({
  registry: automationRegistry,
  store: automationStore,
  getQueue: () => (automationQueue.isReady() ? automationQueue : null),
});

let subscribed = false;

/** Subskrybuje zdarzenia i uruchamia kolejkę; wołane raz przy starcie serwera. */
export async function initializeAutomation(): Promise<void> {
  if (!subscribed) {
    for (const type of AUTOMATION_EVENT_TYPES) {
      domainEventBus.subscribe(type, event => automationExecution.handleEvent(event));
    }
    subscribed = true;
  }
  await automationQueue.initialize(automationExecution);
}

export async function shutdownAutomation(): Promise<void> {
  await automationQueue.close();
}
