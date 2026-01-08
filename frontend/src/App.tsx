// src/App.tsx
// Main application with routing

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './components/auth/LoginPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
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
import { SubsystemsPage } from './components/modules/SubsystemsPage';
import { TasksPage } from './components/modules/TasksPage';
import { PrefabricationPage } from './components/modules/PrefabricationPage';
import { NetworkPage } from './components/modules/NetworkPage';
import { BOMPage } from './components/modules/BOMPage';
import { DevicesPage } from './components/modules/DevicesPage';
import { UsersPage } from './components/modules/UsersPage';
import { ReportsPage } from './components/modules/ReportsPage';
import { DocumentsPage } from './components/modules/DocumentsPage';
import { PhotosPage } from './components/modules/PhotosPage';
import { NotificationsPage } from './components/modules/NotificationsPage';
import { SettingsPage } from './components/modules/SettingsPage';
import { ContractListPage } from './components/contracts/ContractListPage';
import { ContractDetailPage } from './components/contracts/ContractDetailPage';
import { WarehouseStockPage } from './components/modules/WarehouseStockPage';
import { useAuth } from './hooks/useAuth';
import { useTokenExpirationWarning } from './hooks/useTokenExpirationWarning';
import { TokenExpirationModal } from './components/common/TokenExpirationModal';
import { TokenTimerWidget } from './components/common/TokenTimerWidget';
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
  const { isAuthenticated, logout } = useAuth();
  const { 
    showWarning, 
    secondsRemaining, 
    refreshToken, 
  } = useTokenExpirationWarning();

  return (
    <BrowserRouter>
      {/* ✅ DODAJ: Zegarek widoczny tylko dla zalogowanych użytkowników */}
      {isAuthenticated && <TokenTimerWidget />}
      
      {/* Modal ostrzeżenia o wygaśnięciu tokenu */}
      {showWarning && (
        <TokenExpirationModal
          secondsRemaining={secondsRemaining}
          onRefresh={refreshToken}
          onLogout={logout}
        />
      )}
      
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
        
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

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

        {/* Module Routes */}
        <Route
          path="/contracts"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'contracts', action: 'read' }}>
                <ContractListPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts/:id"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'contracts', action: 'read' }}>
                <ContractDetailPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/subsystems"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'subsystems', action: 'read' }}>
                <SubsystemsPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'tasks', action: 'read' }}>
                <TasksPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/prefabrication"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'prefabrication', action: 'read' }}>
                <PrefabricationPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/network"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'network', action: 'read' }}>
                <NetworkPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bom"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'bom', action: 'read' }}>
                <BOMPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/devices"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'devices', action: 'read' }}>
                <DevicesPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'users', action: 'read' }}>
                <UsersPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'reports', action: 'read' }}>
                <ReportsPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'documents', action: 'read' }}>
                <DocumentsPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/photos"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'photos', action: 'read' }}>
                <PhotosPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'notifications', action: 'receiveAlerts' }}>
                <NotificationsPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'settings', action: 'read' }}>
                <SettingsPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        {/* Warehouse Stock Routes */}
        <Route
          path="/warehouse-stock"
          element={
            <ProtectedRoute>
              <RoleBasedRoute requiredPermission={{ module: 'warehouse_stock', action: 'read' }}>
                <WarehouseStockPage />
              </RoleBasedRoute>
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
