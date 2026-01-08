// src/services/StockNotificationService.ts
// Serwis powiadomień magazynowych

import { AppDataSource } from '../config/database';
import { WarehouseStock } from '../entities/WarehouseStock';
import { User } from '../entities/User';
import EmailQueueService from './EmailQueueService';
import { EmailTemplate } from '../types/EmailTypes';

export class StockNotificationService {
  private stockRepository = AppDataSource.getRepository(WarehouseStock);
  private userRepository = AppDataSource.getRepository(User);

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
