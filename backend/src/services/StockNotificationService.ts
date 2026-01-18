// src/services/StockNotificationService.ts
// Serwis powiadomień magazynowych

import Redis from 'ioredis';
import { AppDataSource } from '../config/database';
import { WarehouseStock } from '../entities/WarehouseStock';
import { User } from '../entities/User';
import EmailQueueService from './EmailQueueService';
import { EmailTemplate } from '../types/EmailTypes';
import { emailConfig } from '../config/email';

export class StockNotificationService {
  private stockRepository = AppDataSource.getRepository(WarehouseStock);
  private userRepository = AppDataSource.getRepository(User);
  private redisClient: Redis | null = null;
  private readonly ALERT_CACHE_TTL = 86400; // 24h w sekundach
  private readonly ALERT_KEY_PREFIX = 'stock-alert';

  constructor() {
    this.initRedis();
  }

  /**
   * Inicjalizuje połączenie Redis
   */
  private initRedis(): void {
    try {
      this.redisClient = new Redis({
        host: emailConfig.redis.host,
        port: emailConfig.redis.port,
        password: emailConfig.redis.password,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
      console.log('✅ StockNotificationService: Redis połączony');
    } catch (error) {
      console.error('❌ StockNotificationService: Błąd połączenia z Redis:', error);
      this.redisClient = null;
    }
  }

  /**
   * Sprawdza czy alert był już wysłany
   */
  private async wasAlertSent(stockId: number, alertType: 'LOW' | 'CRITICAL'): Promise<boolean> {
    if (!this.redisClient) {
      return false; // Jeśli Redis nie działa, nie blokuj wysyłki
    }

    try {
      const key = `${this.ALERT_KEY_PREFIX}:${stockId}:${alertType}`;
      const exists = await this.redisClient.get(key);
      return exists !== null;
    } catch (error) {
      console.error('❌ Błąd sprawdzania cache alertu:', error);
      return false;
    }
  }

  /**
   * Oznacza alert jako wysłany
   */
  private async markAlertAsSent(stockId: number, alertType: 'LOW' | 'CRITICAL'): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    try {
      const key = `${this.ALERT_KEY_PREFIX}:${stockId}:${alertType}`;
      await this.redisClient.setex(key, this.ALERT_CACHE_TTL, 'sent');
    } catch (error) {
      console.error('❌ Błąd zapisywania cache alertu:', error);
    }
  }

  /**
   * Pobiera szczegóły materiału
   */
  private async getStockDetails(stockId: number): Promise<WarehouseStock> {
    const stock = await this.stockRepository.findOne({
      where: { id: stockId }
    });

    if (!stock) {
      throw new Error(`Materiał ${stockId} nie został znaleziony`);
    }

    return stock;
  }

  /**
   * Pobiera emaile magazynierów
   */
  private async getWarehouseManagerEmails(): Promise<string[]> {
    const managers = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('role.name IN (:...roles)', { roles: ['warehouse_manager', 'manager', 'admin'] })
      .andWhere('user.active = :active', { active: true })
      .getMany();

    return managers.map(m => m.email);
  }

  /**
   * Pobiera emaile adminów i managerów
   */
  private async getAdminAndManagerEmails(): Promise<string[]> {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('role.name IN (:...roles)', { roles: ['admin', 'manager'] })
      .andWhere('user.active = :active', { active: true })
      .getMany();

    return users.map(u => u.email);
  }

  /**
   * Pobiera użytkownika po ID
   */
  private async getUserById(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error(`Użytkownik ${userId} nie został znaleziony`);
    }

    return user;
  }

  /**
   * Alert o niskim stanie magazynowym
   */
  async notifyLowStock(stockId: number): Promise<void> {
    try {
      // Sprawdź deduplikację
      const alreadySent = await this.wasAlertSent(stockId, 'LOW');
      if (alreadySent) {
        console.log(`⏭️  Pominięto zduplikowany alert LOW dla materiału ${stockId} (wysłany w ciągu ostatnich 24h)`);
        return;
      }

      const stock = await this.getStockDetails(stockId);
      const recipients = await this.getWarehouseManagerEmails();

      if (recipients.length === 0) {
        console.warn('⚠️  Brak odbiorców dla alertu o niskim stanie magazynowym');
        return;
      }

      await EmailQueueService.addToQueue({
        to: recipients,
        subject: `⚠️ Niski stan: ${stock.materialName} (${stock.quantityInStock} ${stock.unit})`,
        template: EmailTemplate.STOCK_LOW_ALERT,
        context: {
          materialName: stock.materialName,
          catalogNumber: stock.catalogNumber,
          currentStock: stock.quantityInStock,
          minStockLevel: stock.minStockLevel,
          unit: stock.unit,
          warehouseLocation: stock.warehouseLocation || 'Nie określono',
          category: stock.category || 'Brak kategorii',
          stockUrl: `${process.env.FRONTEND_URL}/warehouse-stock/${stockId}`,
        },
        priority: 'high'
      });

      // Oznacz alert jako wysłany
      await this.markAlertAsSent(stockId, 'LOW');

      console.log(`✅ Alert o niskim stanie magazynowym wysłany: ${stock.materialName}`);
    } catch (error) {
      console.error('❌ Błąd wysyłania alertu o niskim stanie magazynowym:', error);
    }
  }

  /**
   * Alert krytyczny - brak materiału
   */
  async notifyCriticalStock(stockId: number): Promise<void> {
    try {
      // Sprawdź deduplikację
      const alreadySent = await this.wasAlertSent(stockId, 'CRITICAL');
      if (alreadySent) {
        console.log(`⏭️  Pominięto zduplikowany alert CRITICAL dla materiału ${stockId} (wysłany w ciągu ostatnich 24h)`);
        return;
      }

      const stock = await this.getStockDetails(stockId);
      const recipients = await this.getAdminAndManagerEmails();

      if (recipients.length === 0) {
        console.warn('⚠️  Brak odbiorców dla krytycznego alertu magazynowego');
        return;
      }

      await EmailQueueService.addToQueue({
        to: recipients,
        subject: `🚨 KRYTYCZNY BRAK: ${stock.materialName}`,
        template: EmailTemplate.STOCK_CRITICAL_ALERT,
        context: {
          materialName: stock.materialName,
          catalogNumber: stock.catalogNumber,
          minStockLevel: stock.minStockLevel,
          unit: stock.unit,
          warehouseLocation: stock.warehouseLocation || 'Nie określono',
          category: stock.category || 'Brak kategorii',
          supplier: stock.supplier || 'Nie określono',
          stockUrl: `${process.env.FRONTEND_URL}/warehouse-stock/${stockId}`,
        },
        priority: 'high'
      });

      // Oznacz alert jako wysłany
      await this.markAlertAsSent(stockId, 'CRITICAL');

      console.log(`✅ Krytyczny alert magazynowy wysłany: ${stock.materialName}`);
    } catch (error) {
      console.error('❌ Błąd wysyłania krytycznego alertu magazynowego:', error);
    }
  }

  /**
   * Powiadomienie o zakończonym imporcie
   */
  async notifyImportCompleted(
    userId: number,
    result: { imported: number; updated: number; failed: number }
  ): Promise<void> {
    try {
      const user = await this.getUserById(userId);

      const totalProcessed = result.imported + result.updated + result.failed;
      const successRate = totalProcessed > 0 
        ? Math.round(((result.imported + result.updated) / totalProcessed) * 100) 
        : 0;

      await EmailQueueService.addToQueue({
        to: user.email,
        subject: `📦 Import magazynu zakończony - ${successRate}% sukcesu`,
        template: EmailTemplate.STOCK_IMPORT_COMPLETED,
        context: {
          userName: `${user.firstName} ${user.lastName}`,
          importedCount: result.imported,
          updatedCount: result.updated,
          failedCount: result.failed,
          totalProcessed,
          successRate,
          warehouseUrl: `${process.env.FRONTEND_URL}/warehouse-stock`,
        }
      });

      console.log(`✅ Powiadomienie o zakończeniu importu wysłane do ${user.email}`);
    } catch (error) {
      console.error('❌ Błąd wysyłania powiadomienia o zakończeniu importu:', error);
    }
  }
}

export default new StockNotificationService();
