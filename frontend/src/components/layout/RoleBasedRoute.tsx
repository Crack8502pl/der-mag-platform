// src/components/layout/RoleBasedRoute.tsx
// Route component that checks permissions

import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import type { PermissionModule } from '../../types/permissions.types';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  requiredPermission?: {
    module: PermissionModule;
    action: string;
  };
  requireAnyModuleAccess?: PermissionModule;
}

export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({
  children,
  requiredPermission,
  requireAnyModuleAccess,
}) => {
  const { hasPermission, hasAnyPermissionInModule } = usePermissions();

  // Check specific permission
  if (requiredPermission) {
    const hasAccess = hasPermission(requiredPermission.module, requiredPermission.action);
    if (!hasAccess) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  // Check any access to module
  if (requireAnyModuleAccess) {
    const hasAccess = hasAnyPermissionInModule(requireAnyModuleAccess);
    if (!hasAccess) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  return <>{children}</>;
};
