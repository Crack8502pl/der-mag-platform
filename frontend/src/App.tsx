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
              <RoleBasedRoute module="completion" action="read">
                <CompletionOrderList />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/completion/:id/scanner"
          element={
            <ProtectedRoute>
              <RoleBasedRoute module="completion" action="scan">
                <CompletionScannerPage />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        <Route path="/forbidden" element={<ForbiddenPage />} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
