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
    // For now, return hardcoded roles that match backend
    return [
      { id: 1, name: 'admin', description: 'Administrator', permissions: {} },
      { id: 2, name: 'manager', description: 'Manager', permissions: {} },
      { id: 3, name: 'technician', description: 'Technician', permissions: {} },
      { id: 4, name: 'bom_editor', description: 'BOM Editor', permissions: {} },
    ];
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
