// src/services/UserOnboardingService.ts
// Service for secure user onboarding with OTP

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import EmailQueueService from './EmailQueueService';
import SystemConfigService from './SystemConfigService';

export interface CreateUserDto {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: number;
  phone?: string;
}

export interface ResetPasswordResult {
  otp: string;
  expiresAt: Date;
}

export class UserOnboardingService {
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Generate a secure one-time password
   */
  private generateOTP(): string {
    // Generate 4 random bytes and convert to uppercase hex (8 characters)
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Create a new user with OTP and send welcome email
   */
  async createUserWithOTP(userData: CreateUserDto): Promise<{ user: User; otp: string }> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: [
          { username: userData.username },
          { email: userData.email }
        ]
      });

      if (existingUser) {
        throw new Error('User with this username or email already exists');
      }

      // Generate OTP
      const otp = this.generateOTP();
      
      // Hash OTP for storage
      const hashedPassword = await bcrypt.hash(otp, 10);
      
      // Calculate OTP expiration (24 hours)
      const otpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Create user
      const user = this.userRepository.create({
        ...userData,
        password: hashedPassword,
        forcePasswordChange: true,
        active: true,
      });

      // Add OTP expiration to user object (will be saved)
      (user as any).otpExpiresAt = otpExpiresAt;

      await this.userRepository.save(user);

      // Send welcome email with OTP
      try {
        const portalUrl = await SystemConfigService.getPortalUrl();
        
        await EmailQueueService.addToQueue({
          to: user.email,
          subject: 'Witaj w Der-Mag Platform - Twoje tymczasowe hasło',
          template: 'user-otp-created',
          context: {
            firstName: user.firstName,
            username: user.username,
            otp: otp,
            portalUrl: portalUrl,
            expiresIn: '24 godziny',
          },
        });
      } catch (emailError) {
        console.error('Error sending OTP email:', emailError);
        // Don't fail the user creation if email fails
      }

      return { user, otp };
    } catch (error) {
      console.error('Error creating user with OTP:', error);
      throw error;
    }
  }

  /**
   * Reset user password with new OTP
   */
  async resetPasswordWithOTP(userId: number): Promise<ResetPasswordResult> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate new OTP
      const otp = this.generateOTP();
      
      // Hash OTP
      const hashedPassword = await bcrypt.hash(otp, 10);
      
      // Calculate OTP expiration (24 hours)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Update user
      user.password = hashedPassword;
      user.forcePasswordChange = true;
      (user as any).otpExpiresAt = expiresAt;

      await this.userRepository.save(user);

      // Send password reset email
      try {
        const portalUrl = await SystemConfigService.getPortalUrl();
        
        await EmailQueueService.addToQueue({
          to: user.email,
          subject: 'Reset hasła - Der-Mag Platform',
          template: 'password-reset-otp',
          context: {
            firstName: user.firstName,
            username: user.username,
            otp: otp,
            portalUrl: portalUrl,
            expiresIn: '24 godziny',
          },
        });
      } catch (emailError) {
        console.error('Error sending password reset email:', emailError);
      }

      return { otp, expiresAt };
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  /**
   * Change user password (after OTP login)
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      // Validate new password strength
      this.validatePasswordStrength(newPassword);

      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'username', 'email', 'firstName', 'password', 'forcePasswordChange']
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user
      user.password = hashedPassword;
      user.forcePasswordChange = false;
      user.passwordChangedAt = new Date();
      (user as any).otpExpiresAt = null; // Clear OTP expiration

      await this.userRepository.save(user);

      // Send confirmation email (WITHOUT new password)
      try {
        const portalUrl = await SystemConfigService.getPortalUrl();
        
        await EmailQueueService.addToQueue({
          to: user.email,
          subject: 'Hasło zostało zmienione - Der-Mag Platform',
          template: 'password-changed-confirmation',
          context: {
            firstName: user.firstName,
            username: user.username,
            portalUrl: portalUrl,
          },
        });
      } catch (emailError) {
        console.error('Error sending password change confirmation:', emailError);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one digit');
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
  }

  /**
   * Check if OTP has expired
   */
  async isOTPExpired(userId: number): Promise<boolean> {
    try {
      const user = await this.userRepository
        .createQueryBuilder('user')
        .where('user.id = :userId', { userId })
        .select(['user.id'])
        .addSelect('user.otp_expires_at', 'otpExpiresAt')
        .getRawOne();

      if (!user || !user.otpExpiresAt) {
        return false; // No OTP set
      }

      return new Date(user.otpExpiresAt) < new Date();
    } catch (error) {
      console.error('Error checking OTP expiration:', error);
      return true; // Fail safe - treat as expired on error
    }
  }
}

export default new UserOnboardingService();
