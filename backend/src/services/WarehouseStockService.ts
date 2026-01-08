// src/services/WarehouseStockService.ts
// Serwis zarządzania stanami magazynowymi

import { AppDataSource } from '../config/database';
import { WarehouseStock, MaterialType, StockStatus } from '../entities/WarehouseStock';
import { WarehouseStockHistory, StockOperationType } from '../entities/WarehouseStockHistory';
import { SubsystemWarehouseStock, SubsystemStockStatus } from '../entities/SubsystemWarehouseStock';
import { TaskWarehouseStock, TaskStockStatus } from '../entities/TaskWarehouseStock';
import { WarehouseStockBomMapping } from '../entities/WarehouseStockBomMapping';
import { WarehouseStockWorkflowBomMapping } from '../entities/WarehouseStockWorkflowBomMapping';
import { Subsystem } from '../entities/Subsystem';
import { Task } from '../entities/Task';
import { Repository, ILike, In } from 'typeorm';

interface StockFilters {
  search?: string;
  category?: string;
  supplier?: string;
  status?: StockStatus;
  materialType?: MaterialType;
  lowStock?: boolean;
  warehouseLocation?: string;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export class WarehouseStockService {
  private stockRepository: Repository<WarehouseStock>;
  private historyRepository: Repository<WarehouseStockHistory>;
  private subsystemStockRepository: Repository<SubsystemWarehouseStock>;
  private taskStockRepository: Repository<TaskWarehouseStock>;
  private bomMappingRepository: Repository<WarehouseStockBomMapping>;
  private workflowBomMappingRepository: Repository<WarehouseStockWorkflowBomMapping>;

  constructor() {
    this.stockRepository = AppDataSource.getRepository(WarehouseStock);
    this.historyRepository = AppDataSource.getRepository(WarehouseStockHistory);
    this.subsystemStockRepository = AppDataSource.getRepository(SubsystemWarehouseStock);
    this.taskStockRepository = AppDataSource.getRepository(TaskWarehouseStock);
    this.bomMappingRepository = AppDataSource.getRepository(WarehouseStockBomMapping);
    this.workflowBomMappingRepository = AppDataSource.getRepository(WarehouseStockWorkflowBomMapping);
  }

  /**
   * Pobierz wszystkie materiały z filtrami i paginacją
   */
  async getAll(filters: StockFilters = {}, pagination: PaginationOptions = {}) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 30;
    const sortBy = pagination.sortBy || 'createdAt';
    const sortOrder = pagination.sortOrder || 'DESC';
    
    const queryBuilder = this.stockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.createdBy', 'createdBy')
      .leftJoinAndSelect('stock.updatedBy', 'updatedBy');

    // Filtry
    if (filters.search) {
      queryBuilder.andWhere(
        '(stock.catalogNumber ILIKE :search OR stock.materialName ILIKE :search OR stock.description ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.category) {
      queryBuilder.andWhere('stock.category = :category', { category: filters.category });
    }

    if (filters.supplier) {
      queryBuilder.andWhere('stock.supplier = :supplier', { supplier: filters.supplier });
    }

    if (filters.status) {
      queryBuilder.andWhere('stock.status = :status', { status: filters.status });
    }

    if (filters.materialType) {
      queryBuilder.andWhere('stock.materialType = :materialType', { materialType: filters.materialType });
    }

    if (filters.warehouseLocation) {
      queryBuilder.andWhere('stock.warehouseLocation = :location', { location: filters.warehouseLocation });
    }

    if (filters.lowStock) {
      queryBuilder.andWhere('stock.quantityInStock <= stock.minStockLevel');
    }

    // Sortowanie
    queryBuilder.orderBy(`stock.${sortBy}`, sortOrder);

    // Paginacja
    const total = await queryBuilder.getCount();
    const items = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Pobierz materiał po ID
   */
  async getById(id: number): Promise<WarehouseStock | null> {
    return await this.stockRepository.findOne({
      where: { id },
      relations: ['createdBy', 'updatedBy']
    });
  }

  /**
   * Utwórz nowy materiał
   */
  async create(data: Partial<WarehouseStock>, userId: number): Promise<WarehouseStock> {
    // Sprawdź unikalność catalog_number
    if (data.catalogNumber) {
      const existing = await this.stockRepository.findOne({
        where: { catalogNumber: data.catalogNumber }
      });
      
      if (existing) {
        throw new Error(`Materiał o numerze katalogowym ${data.catalogNumber} już istnieje`);
      }
    }

    const stock = this.stockRepository.create({
      ...data,
      createdById: userId
    });

    const savedStock = await this.stockRepository.save(stock);

    // Loguj do historii
    await this.logHistory(
      savedStock.id,
      StockOperationType.CREATED,
      null,
      userId,
      { details: 'Utworzono nowy materiał' }
    );

    return savedStock;
  }

  /**
   * Aktualizuj materiał
   */
  async update(id: number, data: Partial<WarehouseStock>, userId: number): Promise<WarehouseStock> {
    const stock = await this.getById(id);
    if (!stock) {
      throw new Error('Materiał nie znaleziony');
    }

    // Sprawdź unikalność catalog_number jeśli się zmienia
    if (data.catalogNumber && data.catalogNumber !== stock.catalogNumber) {
      const existing = await this.stockRepository.findOne({
        where: { catalogNumber: data.catalogNumber }
      });
      
      if (existing) {
        throw new Error(`Materiał o numerze katalogowym ${data.catalogNumber} już istnieje`);
      }
    }

    const oldQuantity = stock.quantityInStock;
    const newQuantity = data.quantityInStock;

    Object.assign(stock, data);
    stock.updatedById = userId;

    const updated = await this.stockRepository.save(stock);

    // Loguj do historii
    const changes: any = {};
    if (newQuantity !== undefined && newQuantity !== oldQuantity) {
      changes.quantityChange = newQuantity - oldQuantity;
      changes.quantityBefore = oldQuantity;
      changes.quantityAfter = newQuantity;
    }

    await this.logHistory(
      id,
      StockOperationType.UPDATED,
      changes.quantityChange || null,
      userId,
      { 
        quantityBefore: changes.quantityBefore,
        quantityAfter: changes.quantityAfter,
        details: 'Zaktualizowano materiał'
      }
    );

    return updated;
  }

  /**
   * Usuń materiał
   */
  async delete(id: number): Promise<void> {
    const stock = await this.getById(id);
    if (!stock) {
      throw new Error('Materiał nie znaleziony');
    }

    await this.stockRepository.remove(stock);
  }

  /**
   * Pobierz listę kategorii
   */
  async getCategories(): Promise<string[]> {
    const result = await this.stockRepository
      .createQueryBuilder('stock')
      .select('DISTINCT stock.category', 'category')
      .where('stock.category IS NOT NULL')
      .getRawMany();
    
    return result.map(r => r.category).filter(Boolean);
  }

  /**
   * Pobierz listę dostawców
   */
  async getSuppliers(): Promise<string[]> {
    const result = await this.stockRepository
      .createQueryBuilder('stock')
      .select('DISTINCT stock.supplier', 'supplier')
      .where('stock.supplier IS NOT NULL')
      .getRawMany();
    
    return result.map(r => r.supplier).filter(Boolean);
  }

  /**
   * Zarezerwuj materiał
   */
  async reserveStock(
    stockId: number,
    quantity: number,
    userId: number,
    referenceType: string,
    referenceId: number
  ): Promise<WarehouseStock> {
    const stock = await this.getById(stockId);
    if (!stock) {
      throw new Error('Materiał nie znaleziony');
    }

    if (stock.quantityAvailable < quantity) {
      throw new Error(`Niewystarczająca ilość dostępna. Dostępne: ${stock.quantityAvailable}, Wymagane: ${quantity}`);
    }

    stock.quantityReserved += quantity;
    const updated = await this.stockRepository.save(stock);

    await this.logHistory(
      stockId,
      StockOperationType.RESERVED,
      quantity,
      userId,
      {
        referenceType,
        referenceId,
        details: `Zarezerwowano ${quantity} ${stock.unit}`
      }
    );

    return updated;
  }

  /**
   * Zwolnij rezerwację
   */
  async releaseReservation(
    stockId: number,
    quantity: number,
    userId: number,
    referenceType: string,
    referenceId: number
  ): Promise<WarehouseStock> {
    const stock = await this.getById(stockId);
    if (!stock) {
      throw new Error('Materiał nie znaleziony');
    }

    if (stock.quantityReserved < quantity) {
      throw new Error(`Nie można zwolnić więcej niż zarezerwowano. Zarezerwowane: ${stock.quantityReserved}`);
    }

    stock.quantityReserved -= quantity;
    const updated = await this.stockRepository.save(stock);

    await this.logHistory(
      stockId,
      StockOperationType.RESERVATION_RELEASED,
      -quantity,
      userId,
      {
        referenceType,
        referenceId,
        details: `Zwolniono rezerwację ${quantity} ${stock.unit}`
      }
    );

    return updated;
  }

  /**
   * Automatyczne przypisanie do subsystemu na podstawie BOM
   */
  async autoAssignToSubsystem(subsystemId: number, userId: number): Promise<number> {
    // Implementacja będzie zależała od struktury BOM
    // Na razie zwróć liczbę przypisanych materiałów
    return 0;
  }

  /**
   * Automatyczne przypisanie do taska
   */
  async autoAssignToTask(taskId: number, taskTypeId: number, userId: number): Promise<number> {
    // Implementacja będzie zależała od struktury BOM
    return 0;
  }

  /**
   * Mapuj do BOM template
   */
  async mapToBomTemplate(
    stockId: number,
    bomTemplateId: number,
    data: Partial<WarehouseStockBomMapping>
  ): Promise<WarehouseStockBomMapping> {
    const mapping = this.bomMappingRepository.create({
      warehouseStockId: stockId,
      bomTemplateId,
      ...data
    });

    return await this.bomMappingRepository.save(mapping);
  }

  /**
   * Mapuj do workflow BOM item
   */
  async mapToWorkflowBomItem(
    stockId: number,
    workflowBomTemplateItemId: number,
    data: Partial<WarehouseStockWorkflowBomMapping>
  ): Promise<WarehouseStockWorkflowBomMapping> {
    const mapping = this.workflowBomMappingRepository.create({
      warehouseStockId: stockId,
      workflowBomTemplateItemId,
      ...data
    });

    return await this.workflowBomMappingRepository.save(mapping);
  }

  /**
   * Import z CSV
   */
  async importFromCSV(csvContent: string, userId: number): Promise<{ success: number; failed: number; errors: any[] }> {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    let success = 0;
    let failed = 0;
    const errors: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index];
        });

        await this.create({
          catalogNumber: row.catalog_number || row.catalogNumber,
          materialName: row.material_name || row.materialName,
          description: row.description,
          category: row.category,
          subcategory: row.subcategory,
          materialType: row.material_type || row.materialType || MaterialType.CONSUMABLE,
          unit: row.unit || 'szt',
          quantityInStock: parseFloat(row.quantity_in_stock || row.quantityInStock || '0'),
          minStockLevel: row.min_stock_level ? parseFloat(row.min_stock_level) : null,
          supplier: row.supplier,
          unitPrice: row.unit_price ? parseFloat(row.unit_price) : null,
          warehouseLocation: row.warehouse_location || row.warehouseLocation
        }, userId);

        success++;
      } catch (error: any) {
        failed++;
        errors.push({ row: i + 1, error: error.message });
      }
    }

    return { success, failed, errors };
  }

  /**
   * Generuj szablon CSV
   */
  generateCSVTemplate(): string {
    const headers = [
      'catalog_number',
      'material_name',
      'description',
      'category',
      'subcategory',
      'material_type',
      'unit',
      'quantity_in_stock',
      'min_stock_level',
      'supplier',
      'unit_price',
      'warehouse_location'
    ];

    const exampleRow = [
      'MAT-001',
      'Przykładowy materiał',
      'Opis materiału',
      'Elektronika',
      'Rezystory',
      'consumable',
      'szt',
      '100',
      '10',
      'Dostawca ABC',
      '5.50',
      'A-01-02'
    ];

    return headers.join(',') + '\n' + exampleRow.join(',');
  }

  /**
   * Export do Excel (zwraca dane)
   */
  async exportToExcel(filters: StockFilters = {}): Promise<WarehouseStock[]> {
    const result = await this.getAll(filters, { limit: 10000 });
    return result.items;
  }

  /**
   * Loguj operację do historii
   */
  async logHistory(
    stockId: number,
    operationType: StockOperationType,
    quantityChange: number | null,
    userId: number,
    options: {
      referenceType?: string;
      referenceId?: number;
      quantityBefore?: number;
      quantityAfter?: number;
      details?: any;
      notes?: string;
    } = {}
  ): Promise<WarehouseStockHistory> {
    const history = this.historyRepository.create({
      warehouseStockId: stockId,
      operationType,
      quantityChange,
      quantityBefore: options.quantityBefore,
      quantityAfter: options.quantityAfter,
      referenceType: options.referenceType,
      referenceId: options.referenceId,
      details: options.details || {},
      notes: options.notes,
      performedById: userId
    });

    return await this.historyRepository.save(history);
  }

  /**
   * Pobierz historię materiału
   */
  async getHistory(stockId: number, limit: number = 50): Promise<WarehouseStockHistory[]> {
    return await this.historyRepository.find({
      where: { warehouseStockId: stockId },
      relations: ['performedBy'],
      order: { performedAt: 'DESC' },
      take: limit
    });
  }
}
