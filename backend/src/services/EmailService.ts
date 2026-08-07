// src/services/EmailService.ts
// Serwis do wysyłania emaili z użyciem Nodemailer i Handlebars

import nodemailer, { Transporter } from 'nodemailer';
import handlebars, { TemplateDelegate } from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { emailConfig, isEmailConfigured } from '../config/email';
import EmailAutomationGuardService from './EmailAutomationGuardService';
import { 
  EmailOptions, 
  EmailTemplate,
  TaskEmailContext,
  UserWelcomeEmailContext,
  PasswordResetEmailContext,
  PasswordChangedEmailContext
} from '../types/EmailTypes';

/**
 * Serwis obsługujący wysyłkę emaili
 */
class EmailService {
  private transporter: Transporter | null = null;
  private templatesCache: Map<string, TemplateDelegate> = new Map();
  private initialized = false;

  /**
   * Inicjalizuje transporter Nodemailer
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!isEmailConfigured()) {
      console.warn('⚠️  Email nie jest skonfigurowany. Sprawdź zmienne środowiskowe SMTP.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport(emailConfig.smtp);
      await this.verifyConnection();
      this.initialized = true;
      console.log('✅ EmailService zainicjalizowany pomyślnie');
    } catch (error) {
      console.error('❌ Błąd inicjalizacji EmailService:', error);
      throw error;
    }
  }

  /**
   * Weryfikuje połączenie SMTP
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      console.warn('⚠️  Transporter emaili nie jest zainicjalizowany');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✅ Połączenie SMTP zweryfikowane pomyślnie');
      return true;
    } catch (error) {
      console.error('❌ Błąd weryfikacji połączenia SMTP:', error);
      return false;
    }
  }

  /**
   * Wysyła email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      console.warn('⚠️  Email nie został wysłany - brak konfiguracji SMTP');
      return;
    }

    try {
      let recipients = Array.isArray(options.to) ? options.to : [options.to];
      if (options.automation?.automated) {
        recipients = await EmailAutomationGuardService.filterAutomatedRecipients(
          recipients,
          options.automation.recipientUserId,
        );

        if (recipients.length === 0) {
          console.log(`⏭️  Pominięto automatyczny email przez guard: ${options.subject}`);
          return;
        }
      }

      const html = await this.renderTemplate(options.template, options.context);
      
      await this.transporter.sendMail({
        from: `"${emailConfig.from.name}" <${emailConfig.from.address}>`,
        to: recipients.join(', '),
        subject: options.subject,
        html,
        attachments: options.attachments,
        priority: options.priority || 'normal',
      });
      
      console.log(`✅ Email wysłany: ${options.subject} → ${options.to}`);
    } catch (error) {
      console.error('❌ Błąd wysyłania emaila:', error);
      throw error;
    }
  }

  /**
   * Renderuje szablon Handlebars
   */
  private async renderTemplate(
    templateName: string,
    context: Record<string, any>
  ): Promise<string> {
    try {
      // Sprawdź czy szablon jest w cache
      let template = this.templatesCache.get(templateName);

      if (!template) {
        // Wczytaj szablon z pliku
        const templatePath = path.join(
          __dirname,
          '..',
          'templates',
          'emails',
          `${templateName}.hbs`
        );
        
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        template = handlebars.compile(templateContent);
        
        // Zapisz w cache
        this.templatesCache.set(templateName, template);
      }

      // Dodaj globalne zmienne do kontekstu
      const enrichedContext = {
        ...context,
        currentYear: new Date().getFullYear(),
        platformName: emailConfig.from.name,
        frontendUrl: emailConfig.frontendUrl,
      };

      return template(enrichedContext);
    } catch (error) {
      console.error('❌ Błąd renderowania szablonu email');
      throw error;
    }
  }

  /**
   * Wysyła email o utworzeniu zadania
   */
  async sendTaskCreatedEmail(
    to: string | string[],
    context: TaskEmailContext
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Nowe zadanie: ${context.taskName} (#${context.taskNumber})`,
      template: EmailTemplate.TASK_CREATED,
      context,
      priority: context.priority && context.priority > 5 ? 'high' : 'normal',
      automation: { automated: true },
    });
  }

  /**
   * Wysyła email o przypisaniu zadania
   */
  async sendTaskAssignedEmail(
    to: string | string[],
    context: TaskEmailContext
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Przypisano Ci zadanie: ${context.taskName} (#${context.taskNumber})`,
      template: EmailTemplate.TASK_ASSIGNED,
      context,
      priority: context.priority && context.priority > 5 ? 'high' : 'normal',
      automation: { automated: true },
    });
  }

  /**
   * Wysyła email o zakończeniu zadania
   */
  async sendTaskCompletedEmail(
    to: string | string[],
    context: TaskEmailContext
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Zadanie zakończone: ${context.taskName} (#${context.taskNumber})`,
      template: EmailTemplate.TASK_COMPLETED,
      context,
      automation: { automated: true },
    });
  }

  /**
   * Wysyła email o opóźnionym zadaniu
   */
  async sendTaskOverdueEmail(
    to: string | string[],
    context: TaskEmailContext
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: `⚠️ Zadanie opóźnione: ${context.taskName} (#${context.taskNumber})`,
      template: EmailTemplate.TASK_OVERDUE,
      context,
      priority: 'high',
      automation: { automated: true },
    });
  }

  /**
   * Wysyła powitalny email do nowego użytkownika
   */
  async sendWelcomeEmail(
    to: string,
    context: UserWelcomeEmailContext
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Witaj w Grover Platform!',
      template: EmailTemplate.USER_WELCOME,
      context,
    });
  }

  /**
   * Wysyła email z linkiem do resetu hasła
   */
  async sendPasswordResetEmail(
    to: string,
    context: PasswordResetEmailContext
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Reset hasła - Grover Platform',
      template: EmailTemplate.PASSWORD_RESET,
      context,
      priority: 'high',
    });
  }

  /**
   * Wysyła email z nowymi danymi logowania po zmianie hasła
   */
  async sendPasswordChangedEmail(
    to: string,
    context: PasswordChangedEmailContext
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Twoje nowe hasło - Grover Platform',
      template: EmailTemplate.PASSWORD_CHANGED,
      context,
      priority: 'high',
    });
  }

  /**
   * Czyści cache szablonów (przydatne podczas development)
   */
  clearTemplateCache(): void {
    this.templatesCache.clear();
    console.log('🗑️  Cache szablonów emaili wyczyszczony');
  }
}

// Eksportuj singleton
export default new EmailService();
