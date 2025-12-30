// src/hooks/usePermissions.ts
// Hook for checking permissions

import { useAuthStore } from '../stores/authStore';
import type { RolePermissions, PermissionModule } from '../types/permissions.types';

export const usePermissions = () => {
  const { user } = useAuthStore();
  const permissions: RolePermissions = user?.permissions || {};

  /**
   * Check if user has a specific permission
   * @param module - The module to check (e.g., 'contracts', 'network')
   * @param action - The action to check (e.g., 'read', 'create')
   * @returns boolean
   */
  const hasPermission = (module: PermissionModule, action: string): boolean => {
    // Admin has full access
    if (permissions.all) {
      return true;
    }

    // Check module-specific permission
    const modulePermissions = permissions[module] as any;
    if (!modulePermissions) {
      return false;
    }

    return modulePermissions[action] === true;
  };

  /**
   * Check if user has any permission in a module
   * @param module - The module to check
   * @returns boolean
   */
  const hasAnyPermissionInModule = (module: PermissionModule): boolean => {
    // Admin has full access
    if (permissions.all) {
      return true;
    }

    const modulePermissions = permissions[module];
    if (!modulePermissions) {
      return false;
    }

    // Check if any permission is true
    return Object.values(modulePermissions).some(value => value === true);
  };

  /**
   * Check if user is admin
   * @returns boolean
   */
  const isAdmin = (): boolean => {
    return permissions.all === true;
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermissionInModule,
    isAdmin,
  };
};
