// src/controllers/SystemConfigController.ts
// Controller for system configuration management

import { Request, Response } from 'express';
import SystemConfigService, { SmtpConfig } from '../services/SystemConfigService';

export class SystemConfigController {
  /**
   * Get SMTP configuration (without password)
   */
  static async getSmtpConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = await SystemConfigService.getSmtpConfig();

      if (!config) {
        res.json({
          success: true,
          data: {
            host: '',
            port: 587,
            secure: false,
            user: '',
            password: '', // Never return actual password
            fromName: 'Der-Mag Platform',
            fromEmail: 'noreply@dermag.pl',
          },
        });
        return;
      }

      // Return config without actual password
      res.json({
        success: true,
        data: {
          ...config,
          password: config.password ? '********' : '', // Mask password
        },
      });
    } catch (error) {
      console.error('Error getting SMTP config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get SMTP configuration',
      });
    }
  }

  /**
   * Set SMTP configuration
   */
  static async setSmtpConfig(req: Request, res: Response): Promise<void> {
    try {
      const config: SmtpConfig = req.body;
      const userId = req.userId;

      // Validate required fields
      if (!config.host || !config.port || !config.user || !config.fromEmail) {
        res.status(400).json({
          success: false,
          message: 'Missing required SMTP configuration fields',
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(config.fromEmail)) {
        res.status(400).json({
          success: false,
          message: 'Invalid from email address',
        });
        return;
      }

      await SystemConfigService.setSmtpConfig(config, userId);

      res.json({
        success: true,
        message: 'SMTP configuration saved successfully',
      });
    } catch (error) {
      console.error('Error setting SMTP config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save SMTP configuration',
      });
    }
  }

  /**
   * Test SMTP connection
   */
  static async testSmtpConnection(req: Request, res: Response): Promise<void> {
    try {
      const result = await SystemConfigService.testSmtpConnection();

      res.json({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      console.error('Error testing SMTP connection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test SMTP connection',
      });
    }
  }

  /**
   * Get portal URL
   */
  static async getPortalUrl(req: Request, res: Response): Promise<void> {
    try {
      const url = await SystemConfigService.getPortalUrl();

      res.json({
        success: true,
        data: { url },
      });
    } catch (error) {
      console.error('Error getting portal URL:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get portal URL',
      });
    }
  }

  /**
   * Set portal URL
   */
  static async setPortalUrl(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.body;
      const userId = req.userId;

      if (!url) {
        res.status(400).json({
          success: false,
          message: 'Portal URL is required',
        });
        return;
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        res.status(400).json({
          success: false,
          message: 'Invalid URL format',
        });
        return;
      }

      await SystemConfigService.setPortalUrl(url, userId);

      res.json({
        success: true,
        message: 'Portal URL saved successfully',
      });
    } catch (error) {
      console.error('Error setting portal URL:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save portal URL',
      });
    }
  }
}
