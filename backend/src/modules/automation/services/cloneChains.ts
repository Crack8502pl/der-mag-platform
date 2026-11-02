// src/modules/automation/services/cloneChains.ts
// Nowa wersja formularza dziedziczy łańcuchy wersji poprzedniej (zmiana = nowa wersja).

import type { EntityManager } from 'typeorm';
import { AutomationChain } from '../entities/AutomationChain';

export async function cloneChainsForVersion(manager: EntityManager, fromVersionId: number, toVersionId: number): Promise<void> {
  const repository = manager.getRepository(AutomationChain);
  const chains = await repository.find({ where: { ownerType: 'FORM_TEMPLATE_VERSION', ownerId: fromVersionId } });
  if (!chains.length) return;
  await repository.save(chains.map(chain => repository.create({
    ownerType: chain.ownerType,
    ownerId: toVersionId,
    eventType: chain.eventType,
    steps: chain.steps,
    onError: chain.onError,
    createdById: chain.createdById,
  })));
}
