// src/services/SystemConfigService.ts
// Service for managing system configuration with encryption support

import { AppDataSource } from '../config/database';
import { SystemConfig } from '../entities/SystemConfig';
import { encrypt, decrypt, isEncryptionConfigured } from '../utils/encryption';
import nodemailer from 'nodemailer';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

export class SystemConfigService {
  private configRepository = AppDataSource.getRepository(SystemConfig);

  /**
   * Get a configuration value by key
   */
  async getConfig(key: string): Promise<string | null> {
    try {
      const config = await this.configRepository.findOne({ where: { key } });
      
      if (!config) {
        return null;
      }

      // Decrypt if encrypted
      if (config.isEncrypted) {
        if (!isEncryptionConfigured()) {
          throw new Error('Encryption not configured but encrypted value found');
        }
        return decrypt(config.value);
      }

      return config.value;
    } catch (error) {
      console.error(`Error getting config ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set a configuration value
   */
  async setConfig(
    key: string,
    value: string,
    category?: string,
    shouldEncrypt: boolean = false,
    updatedById?: number
  ): Promise<void> {
    try {
      let storedValue = value;

      // Encrypt if required
      if (shouldEncrypt) {
        if (!isEncryptionConfigured()) {
          throw new Error('Encryption not configured');
        }
        storedValue = encrypt(value);
      }

      // Check if config exists
      let config = await this.configRepository.findOne({ where: { key } });

      if (config) {
        // Update existing
        config.value = storedValue;
        config.isEncrypted = shouldEncrypt;
        if (category) config.category = category;
        if (updatedById) config.updatedById = updatedById;
        await this.configRepository.save(config);
      } else {
        // Create new
        config = this.configRepository.create({
          key,
          value: storedValue,
          isEncrypted: shouldEncrypt,
          category,
          updatedById,
        });
        await this.configRepository.save(config);
      }
    } catch (error) {
      console.error(`Error setting config ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get SMTP configuration
   */
  async getSmtpConfig(): Promise<SmtpConfig | null> {
    try {
      const host = await this.getConfig('smtp_host');
      const port = await this.getConfig('smtp_port');
      const secure = await this.getConfig('smtp_secure');
      const user = await this.getConfig('smtp_user');
      const password = await this.getConfig('smtp_password');
      const fromName = await this.getConfig('smtp_from_name');
      const fromEmail = await this.getConfig('smtp_from_email');

      // If any required field is missing, return null
      if (!host || !port || !user) {
        return null;
      }

      return {
        host,
        port: parseInt(port),
        secure: secure === 'true',
        user,
        password: password || '',
        fromName: fromName || 'Grover Platform',
        fromEmail: fromEmail || 'noreply@dermag.pl',
      };
    } catch (error) {
      console.error('Error getting SMTP config:', error);
      throw error;
    }
  }

  /**
   * Set SMTP configuration
   */
  async setSmtpConfig(config: SmtpConfig, updatedById?: number): Promise<void> {
    try {
      // Validate configuration
      if (!config.host || !config.port || !config.user) {
        throw new Error('Missing required SMTP configuration fields');
      }

      // Set all SMTP config values
      await this.setConfig('smtp_host', config.host, 'smtp', false, updatedById);
      await this.setConfig('smtp_port', config.port.toString(), 'smtp', false, updatedById);
      await this.setConfig('smtp_secure', config.secure.toString(), 'smtp', false, updatedById);
      await this.setConfig('smtp_user', config.user, 'smtp', false, updatedById);
      
      // Only update password if provided (not empty)
      if (config.password) {
        await this.setConfig('smtp_password', config.password, 'smtp', true, updatedById);
      }
      
      await this.setConfig('smtp_from_name', config.fromName, 'smtp', false, updatedById);
      await this.setConfig('smtp_from_email', config.fromEmail, 'smtp', false, updatedById);
    } catch (error) {
      console.error('Error setting SMTP config:', error);
      throw error;
    }
  }

  /**
   * Test SMTP connection
   */
  async testSmtpConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const config = await this.getSmtpConfig();

      if (!config) {
        return { success: false, message: 'SMTP not configured' };
      }

      // Create test transporter
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.password,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Test connection with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      );

      await Promise.race([
        transporter.verify(),
        timeoutPromise,
      ]);

      return { success: true, message: 'SMTP connection successful' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('SMTP test failed:', errorMessage);
      return { success: false, message: `Connection failed: ${errorMessage}` };
    }
  }

  /**
   * Get portal URL
   */
  async getPortalUrl(): Promise<string> {
    const url = await this.getConfig('portal_url');
    return url || 'http://localhost:3001';
  }

  /**
   * Set portal URL
   */
  async setPortalUrl(url: string, updatedById?: number): Promise<void> {
    await this.setConfig('portal_url', url, 'portal', false, updatedById);
  }

  /**
   * Get all config values by category (without encrypted values)
   */
  async getConfigsByCategory(category: string): Promise<Record<string, string>> {
    try {
      const configs = await this.configRepository.find({ where: { category } });
      const result: Record<string, string> = {};

      for (const config of configs) {
        // Don't include encrypted values in bulk queries for security
        if (!config.isEncrypted) {
          result[config.key] = config.value;
        } else {
          result[config.key] = '***ENCRYPTED***';
        }
      }

      return result;
    } catch (error) {
      console.error(`Error getting configs for category ${category}:`, error);
      throw error;
    }
  }
}

export default new SystemConfigService();
