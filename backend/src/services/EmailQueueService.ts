// src/services/EmailQueueService.ts
// Serwis kolejki emaili z użyciem Bull i Redis

import Bull, { Queue, Job } from 'bull';
import { emailConfig, isEmailConfigured } from '../config/email';
import { EmailOptions, QueueStats } from '../types/EmailTypes';
import EmailService from './EmailService';

/**
 * Serwis zarządzający kolejką emaili
 */
class EmailQueueService {
  private queue: Queue<EmailOptions> | null = null;
  private initialized = false;

  /**
   * Inicjalizuje kolejkę Bull
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!isEmailConfigured()) {
      console.warn('⚠️  Kolejka emaili nie została zainicjalizowana - brak konfiguracji SMTP');
      return;
    }

    try {
      // Tworzenie kolejki Bull z konfiguracją Redis
      this.queue = new Bull('email-queue', {
        redis: emailConfig.redis,
        defaultJobOptions: {
          attempts: emailConfig.queue.attempts,
          backoff: {
            type: 'exponential',
            delay: emailConfig.queue.backoffDelay,
          },
          removeOnComplete: emailConfig.queue.removeOnComplete,
          removeOnFail: emailConfig.queue.removeOnFail,
        },
      });

      // Rejestracja procesora zadań
      this.queue.process(this.processEmail.bind(this));

      // Obsługa zdarzeń kolejki
      this.setupEventHandlers();

      this.initialized = true;
      console.log('✅ EmailQueueService zainicjalizowany pomyślnie');
    } catch (error) {
      console.error('❌ Błąd inicjalizacji EmailQueueService:', error);
      console.warn('⚠️  Upewnij się, że Redis działa i jest dostępny');
    }
  }

  /**
   * Konfiguruje handlery zdarzeń kolejki
   */
  private setupEventHandlers(): void {
    if (!this.queue) return;

    this.queue.on('completed', (job: Job) => {
      console.log(`✅ Email wysłany pomyślnie [Job ${job.id}]: ${job.data.subject}`);
    });

    this.queue.on('failed', (job: Job, err: Error) => {
      console.error(`❌ Wysyłka emaila nie powiodła się [Job ${job.id}]:`, err.message);
      console.error(`   Temat: ${job.data.subject}`);
      console.error(`   Odbiorca: ${job.data.to}`);
    });

    this.queue.on('stalled', (job: Job) => {
      console.warn(`⚠️  Email zawieszony [Job ${job.id}]: ${job.data.subject}`);
    });

    this.queue.on('error', (error: Error) => {
      console.error('❌ Błąd kolejki emaili:', error);
    });
  }

  /**
   * Dodaje email do kolejki
   */
  async addToQueue(emailOptions: EmailOptions, delay = 0): Promise<void> {
    if (!this.queue) {
      console.warn('⚠️  Email nie został dodany do kolejki - kolejka nie jest zainicjalizowana');
      console.log(`   Próba wysłania do: ${emailOptions.to}`);
      console.log(`   Temat: ${emailOptions.subject}`);
      return;
    }

    try {
      const job = await this.queue.add(emailOptions, {
        delay,
        priority: emailOptions.priority === 'high' ? 1 : emailOptions.priority === 'low' ? 3 : 2,
      });
      
      console.log(`📧 Email dodany do kolejki [Job ${job.id}]: ${emailOptions.subject}`);
    } catch (error) {
      console.error('❌ Błąd dodawania emaila do kolejki:', error);
      throw error;
    }
  }

  /**
   * Przetwarza zadanie wysyłki emaila
   */
  private async processEmail(job: Job<EmailOptions>): Promise<void> {
    console.log(`📤 Przetwarzanie emaila [Job ${job.id}]: ${job.data.subject}`);
    
    try {
      await EmailService.sendEmail(job.data);
    } catch (error) {
      console.error(`❌ Błąd przetwarzania emaila [Job ${job.id}]:`, error);
      throw error; // Bull automatycznie ponowi próbę
    }
  }

  /**
   * Pobiera statystyki kolejki
   */
  async getStats(): Promise<QueueStats> {
    if (!this.queue) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };
    }

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
      ]);

      return { waiting, active, completed, failed, delayed };
    } catch (error) {
      console.error('❌ Błąd pobierania statystyk kolejki:', error);
      throw error;
    }
  }

  /**
   * Czyści kolejkę (usuwa wszystkie zadania)
   */
  async clearQueue(): Promise<void> {
    if (!this.queue) {
      console.warn('⚠️  Brak kolejki do wyczyszczenia');
      return;
    }

    try {
      await this.queue.empty();
      console.log('🗑️  Kolejka emaili wyczyszczona');
    } catch (error) {
      console.error('❌ Błąd czyszczenia kolejki:', error);
      throw error;
    }
  }

  /**
   * Pobiera listę nieudanych zadań
   */
  async getFailedJobs(start = 0, end = 10): Promise<Job[]> {
    if (!this.queue) {
      return [];
    }

    try {
      return await this.queue.getFailed(start, end);
    } catch (error) {
      console.error('❌ Błąd pobierania nieudanych zadań:', error);
      return [];
    }
  }

  /**
   * Ponawia nieudane zadanie
   */
  async retryFailedJob(jobId: string): Promise<void> {
    if (!this.queue) {
      console.warn('⚠️  Brak kolejki do ponowienia zadania');
      return;
    }

    try {
      const job = await this.queue.getJob(jobId);
      if (job) {
        await job.retry();
        console.log('🔄 Zadanie zostało ponowione:', jobId);
      }
    } catch (error) {
      console.error('❌ Błąd ponowienia zadania:', jobId);
      throw error;
    }
  }

  /**
   * Zamyka połączenie z kolejką (przydatne podczas shutdown)
   */
  async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      console.log('👋 EmailQueueService zamknięty');
    }
  }
}

// Eksportuj singleton
export default new EmailQueueService();
