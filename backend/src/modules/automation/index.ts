/**
 * Automatyzacje – public API
 *
 * Klocki piszemy w kodzie (actions/), użytkownik tylko je wybiera i ustawia parametry.
 * Nowy klocek = nowy plik w `actions/` + jedna linia rejestracji w `actions/index.ts`.
 */
export * from './contracts';
export { AutomationError } from './errors';
export { AutomationRegistry } from './registry/AutomationRegistry';
export { automationRegistry, createDefaultRegistry } from './actions';
export { AutomationChain } from './entities/AutomationChain';
export { AutomationRun } from './entities/AutomationRun';
export { AutomationRunStep } from './entities/AutomationRunStep';
export { AutomationChainService } from './services/AutomationChainService';
export { AutomationExecutionService } from './services/AutomationExecutionService';
export { initializeAutomation, shutdownAutomation, automationChains, automationExecution } from './runtime';
export { default as automationRoutes } from './routes/automation.routes';
