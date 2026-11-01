// src/services/CompletionOrderAccessService.ts
// Centralna polityka dostępu do zleceń kompletacji (ownership / scope)

import { AppDataSource } from '../config/database';
import { CompletionOrder } from '../entities/CompletionOrder';
import { EffectivePermissionsService } from '../modules/function-groups/services/EffectivePermissionsService';
import { RolePermissions } from '../entities/Role';

export type CompletionAccessResult = 'allowed' | 'not_found' | 'unauthorized';

/**
 * Rola uprzywilejowana: pełny dostęp, completion.readAll lub kierownik (completion.decideContinue)
 */
export function hasPrivilegedCompletionAccess(permissions?: RolePermissions | null): boolean {
  if (!permissions) return false;
  if (permissions.all === true) return true;
  return permissions.completion?.readAll === true || permissions.completion?.decideContinue === true;
}

/**
 * Czy użytkownik może operować na danym zleceniu kompletacji
 */
export function canAccessCompletionOrder(
  user: { id: number; role?: { permissions?: RolePermissions } | null },
  order: { assignedToId?: number | null }
): boolean {
  if (hasPrivilegedCompletionAccess(user.role?.permissions)) return true;
  return order.assignedToId != null && order.assignedToId === user.id;
}

export async function checkCompletionOrderAccess(userId: number, orderId: number): Promise<CompletionAccessResult> {
  const effective = await EffectivePermissionsService.get(userId);
  if (!effective) return 'unauthorized';

  const order = await AppDataSource.getRepository(CompletionOrder).findOne({
    where: { id: orderId },
    select: ['id', 'assignedToId']
  });
  if (!order) return 'not_found';

  // Brak dostępu jest raportowany jako 404, aby nie ujawniać istnienia zasobu
  return canAccessCompletionOrder({ id: effective.userId, role: { permissions: effective.permissions } }, order)
    ? 'allowed'
    : 'not_found';
}
