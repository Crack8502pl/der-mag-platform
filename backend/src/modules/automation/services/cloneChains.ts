// src/modules/automation/services/cloneChains.ts
// Nowa wersja formularza dziedziczy łańcuchy wersji poprzedniej (zmiana = nowa wersja).
// Nowa wersja procesu dziedziczy łańcuchy etapów wersji, z której powstała.

import { In, type EntityManager } from 'typeorm';
import type { AutomationOwnerType } from '../contracts';
import { AutomationChain } from '../entities/AutomationChain';

export async function cloneChainsForVersion(manager: Pick<EntityManager, 'getRepository'>, fromVersionId: number, toVersionId: number): Promise<void> {
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

/** Kopiuje łańcuchy właścicieli według mapy: id właściciela źródłowego → id nowego właściciela. */
export async function cloneChainsForOwners(
  manager: Pick<EntityManager, 'getRepository'>,
  ownerType: AutomationOwnerType,
  ownerIdMap: Map<number, number>,
): Promise<AutomationChain[]> {
  if (!ownerIdMap.size) return [];
  const repository = manager.getRepository(AutomationChain);
  const chains = await repository.find({ where: { ownerType, ownerId: In([...ownerIdMap.keys()]) }, order: { id: 'ASC' } });
  if (!chains.length) return [];
  return repository.save(chains.map(chain => repository.create({
    ownerType,
    ownerId: ownerIdMap.get(chain.ownerId)!,
    eventType: chain.eventType,
    steps: chain.steps,
    onError: chain.onError,
    createdById: chain.createdById,
  })));
}

/** Usuwa łańcuchy wskazanych właścicieli (np. etapów usuniętych z wersji roboczej procesu). */
export async function deleteChainsForOwners(manager: Pick<EntityManager, 'getRepository'>, ownerType: AutomationOwnerType, ownerIds: number[]): Promise<void> {
  if (!ownerIds.length) return;
  await manager.getRepository(AutomationChain).delete({ ownerType, ownerId: In(ownerIds) });
}
