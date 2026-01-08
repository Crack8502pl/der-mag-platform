// src/types/admin.types.ts
// Types for admin panel functionality

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  employeeCode?: string;
  roleId: number;
  role?: Role;
  active: boolean;
  forcePasswordChange: boolean;
  lastLogin?: string;
  passwordChangedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: Record<string, any>;
}

export interface CreateUserDto {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: number;
  phone?: string;
  employeeCode?: string;
}

export interface CreateUserResponse {
  user: User;
  otp: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

export interface PortalConfig {
  url: string;
}

export interface SmtpTestResult {
  success: boolean;
  message: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface PasswordStrength {
  score: number; // 0-4
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
  feedback: string[];
}

export interface Material {
  id: number;
  name: string;
  code: string;
  unit: string;
  category?: string;
  description?: string;
  defaultQuantity?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialImportRow {
  rowNumber: number;
  code: string;
  name: string;
  unit: string;
  category?: string;
  defaultQuantity?: number;
  status: 'new' | 'existing' | 'error';
  errorMessage?: string;
}

export interface MaterialImportPreview {
  totalRows: number;
  newMaterials: MaterialImportRow[];
  existingMaterials: MaterialImportRow[];
  errors: MaterialImportRow[];
}

export interface MaterialImportHistory {
  id: number;
  filename: string;
  importedBy: string;
  importedAt: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  status: 'success' | 'partial' | 'failed';
}

export interface BOMTemplate {
  id: number;
  taskTypeId: number;
  taskTypeName: string;
  materials: BOMTemplateMaterial[];
  createdAt: string;
  updatedAt: string;
}

export interface BOMTemplateMaterial {
  id: number;
  materialId: number;
  material: Material;
  quantity: number;
  required: boolean;
}

export interface TaskType {
  id: number;
  name: string;
  description?: string;
  active: boolean;
}
