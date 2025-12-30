// src/App.tsx
// Main application with routing

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './components/auth/LoginPage';
import { PasswordChangeForm } from './components/auth/PasswordChangeForm';
import { Dashboard } from './components/layout/Dashboard';
import { ForbiddenPage } from './components/layout/ForbiddenPage';
import { RoleBasedRoute } from './components/layout/RoleBasedRoute';
import { CompletionOrderList } from './components/completion/CompletionOrderList';
import { CompletionScannerPage } from './components/completion/CompletionScannerPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { UserManagementPage } from './components/admin/UserManagementPage';
import { SMTPConfigPage } from './components/admin/SMTPConfigPage';
import { PortalConfigPage } from './components/admin/PortalConfigPage';
import { AdminPasswordChange } from './components/admin/AdminPasswordChange';
import { MaterialImportPage } from './components/admin/MaterialImportPage';
import { BOMBuilderPage } from './components/admin/BOMBuilderPage';
import { useAuth } from './hooks/useAuth';
import './styles/grover-theme.css';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, requirePasswordChange } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requirePasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  return <>{children}</>;
};

// Auth Route Component (redirect if already logged in)
const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, requirePasswordChange } = useAuth();

  if (isAuthenticated && !requirePasswordChange) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <AuthRoute>
              <LoginPage />
            </AuthRoute>
          }
        />

        {/* Force Password Change Route */}
        <Route path="/change-password" element={<PasswordChangeForm />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Completion Routes */}
        <Route
          path="/completion"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'completion', action: 'read' }}>
                <CompletionOrderList />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/completion/:id/scanner"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'completion', action: 'scan' }}>
                <CompletionScannerPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        <Route path="/forbidden" element={<ForbiddenPage />} />

        {/* Admin Routes - Require admin role */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'all', action: 'access' }}>
                <AdminDashboard />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'all', action: 'access' }}>
                <UserManagementPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/smtp"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'all', action: 'access' }}>
                <SMTPConfigPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/portal"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'all', action: 'access' }}>
                <PortalConfigPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/password"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'all', action: 'access' }}>
                <AdminPasswordChange />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/bom"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'all', action: 'access' }}>
                <BOMBuilderPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/bom/import"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'all', action: 'access' }}>
                <MaterialImportPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
