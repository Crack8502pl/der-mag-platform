// src/services/admin.service.ts
// Service for admin panel API calls

import api from './api';
import type {
  User,
  CreateUserDto,
  CreateUserResponse,
  SmtpConfig,
  SmtpTestResult,
  ChangePasswordDto,
  Role,
} from '../types/admin.types';
import { FALLBACK_ROLES } from '../constants/roles';

export class AdminService {
  // ============================================
  // User Management
  // ============================================

  /**
   * Get all users (including inactive)
   */
  async getAllUsers(): Promise<User[]> {
    const response = await api.get('/admin/users');
    return response.data.data;
  }

  /**
   * Get users with manager role (for project manager selection)
   */
  async getManagerUsers(): Promise<User[]> {
    const response = await api.get('/admin/users', {
      params: { role: 'manager' }
    });
    // Handle both standard API format {data: {data: [...]}} and direct array format
    return response.data.data || response.data || [];
  }

  /**
   * Create user with OTP
   */
  async createUser(userData: CreateUserDto): Promise<CreateUserResponse> {
    const response = await api.post('/admin/users', userData);
    return response.data.data;
  }

  /**
   * Update user
   */
  async updateUser(userId: number, userData: Partial<User>): Promise<User> {
    const response = await api.put(`/admin/users/${userId}`, userData);
    return response.data.data;
  }

  /**
   * Activate user
   */
  async activateUser(userId: number): Promise<void> {
    await api.post(`/admin/users/${userId}/activate`);
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId: number): Promise<void> {
    await api.post(`/admin/users/${userId}/deactivate`);
  }

  /**
   * Reset user password (generates new OTP)
   */
  async resetUserPassword(userId: number): Promise<{ otp: string; expiresAt: string }> {
    const response = await api.post(`/admin/users/${userId}/reset-password`);
    return response.data.data;
  }

  /**
   * Get all roles
   */
  async getRoles(): Promise<Role[]> {
    try {
      const response = await api.get('/admin/roles');
      // Handle different response formats for backward compatibility:
      // - Standard format: { success: true, data: [...] }
      // - Direct array: [...]
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('Błąd pobierania ról z API:', error);
      // Fallback - podstawowe role
      return FALLBACK_ROLES.map(role => ({ ...role, permissions: role.name === 'admin' ? { all: true } : {} }));
    }
  }

  /**
   * Get permissions schema - all available modules and actions
   */
  async getPermissionsSchema(): Promise<any[]> {
    const response = await api.get('/admin/roles/permissions-schema');
    return response.data.data;
  }

  /**
   * Update role permissions
   */
  async updateRole(roleId: number, data: Partial<Role>): Promise<Role> {
    const response = await api.put(`/admin/roles/${roleId}`, data);
    return response.data.data;
  }

  /**
   * Create new role
   */
  async createRole(data: { name: string; description: string; permissions: any }): Promise<Role> {
    const response = await api.post('/admin/roles', data);
    return response.data.data;
  }

  /**
   * Delete role
   */
  async deleteRole(roleId: number): Promise<void> {
    await api.delete(`/admin/roles/${roleId}`);
  }

  // ============================================
  // System Configuration
  // ============================================

  /**
   * Get SMTP configuration
   */
  async getSmtpConfig(): Promise<SmtpConfig> {
    const response = await api.get('/admin/config/smtp');
    return response.data.data;
  }

  /**
   * Set SMTP configuration
   */
  async setSmtpConfig(config: SmtpConfig): Promise<void> {
    await api.put('/admin/config/smtp', config);
  }

  /**
   * Test SMTP connection
   */
  async testSmtpConnection(): Promise<SmtpTestResult> {
    const response = await api.post('/admin/config/smtp/test');
    return response.data;
  }

  /**
   * Get portal URL
   */
  async getPortalUrl(): Promise<string> {
    const response = await api.get('/admin/config/portal');
    return response.data.data.url;
  }

  /**
   * Set portal URL
   */
  async setPortalUrl(url: string): Promise<void> {
    await api.put('/admin/config/portal', { url });
  }

  // ============================================
  // Password Management
  // ============================================

  /**
   * Change own password
   */
  async changePassword(data: ChangePasswordDto): Promise<void> {
    await api.post('/users/change-password', data);
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): {
    score: number;
    hasMinLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasDigit: boolean;
    hasSpecial: boolean;
    feedback: string[];
  } {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    const checks = [hasMinLength, hasUppercase, hasLowercase, hasDigit, hasSpecial];
    const score = checks.filter(Boolean).length;

    const feedback: string[] = [];
    if (!hasMinLength) feedback.push('At least 8 characters');
    if (!hasUppercase) feedback.push('At least one uppercase letter');
    if (!hasLowercase) feedback.push('At least one lowercase letter');
    if (!hasDigit) feedback.push('At least one digit');
    if (!hasSpecial) feedback.push('At least one special character');

    return {
      score,
      hasMinLength,
      hasUppercase,
      hasLowercase,
      hasDigit,
      hasSpecial,
      feedback,
    };
  }
}

export default new AdminService();
