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

interface ImportRow {
  rowNumber: number;
  // Wymagane
  catalog_number: string;
  material_name: string;
  // Opcjonalne - identyfikacja
  description?: string;
  category?: string;
  subcategory?: string;
  material_type?: string;
  device_category?: string;
  // Ilości i jednostki
  unit?: string;
  quantity_in_stock?: string;
  min_stock_level?: string;
  max_stock_level?: string;
  reorder_point?: string;
  // Lokalizacja
  warehouse_location?: string;
  storage_zone?: string;
  // Dostawca i producent
  supplier?: string;
  supplier_catalog_number?: string;
  manufacturer?: string;
  part_number?: string;
  // Ceny
  unit_price?: string;
  purchase_price?: string;
  currency?: string;
  // Flagi (przyjmuj wartości: true, false, 1, 0, tak, nie, yes, no)
  is_serialized?: string;
  is_batch_tracked?: string;
  requires_ip_address?: string;
  is_hazardous?: string;
  requires_certification?: string;
  // Notatki
  notes?: string;
  internal_notes?: string;
}

interface AnalyzedRow extends ImportRow {
  status: 'new' | 'duplicate_catalog' | 'duplicate_name' | 'conflict';
  existingRecord?: WarehouseStock;
  changedFields?: string[];
  validationErrors?: string[];
}

interface UpdateOptions {
  updateQuantity: boolean;
  updatePrice: boolean;
  updateDescription: boolean;
  updateLocation: boolean;
  updateSupplier: boolean;
  skipDuplicates: boolean;
}

interface ImportResultDetailed {
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; field?: string; error: string }>;
}

const COLUMN_LIMITS = {
  catalog_number: 200,
  material_name: 500,
  category: 200,
  subcategory: 200,
  supplier: 500,
  warehouse_location: 500,
  manufacturer: 500,
  unit: 50,
  material_type: 50,
  // Nowe limity
  storage_zone: 100,
  supplier_catalog_number: 200,
  part_number: 200,
  currency: 10,
  device_category: 100
};

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

    // Sprawdź czy stan spadł poniżej minimum i wyślij powiadomienie
    if (newQuantity !== undefined) {
      try {
        const StockNotificationService = (await import('./StockNotificationService')).default;
        if (newQuantity <= updated.minStockLevel) {
          if (newQuantity === 0) {
            await StockNotificationService.notifyCriticalStock(updated.id);
          } else {
            await StockNotificationService.notifyLowStock(updated.id);
          }
        }
      } catch (error) {
        console.error('❌ Błąd wysyłania powiadomienia o stanie magazynowym:', error);
        // Nie przerywamy procesu, jeśli powiadomienie się nie uda
      }
    }

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
   * Parse CSV with proper handling of quoted fields
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quotes
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    result.push(current.trim());
    return result;
  }

  /**
   * Parse CSV content into rows
   */
  private parseCSV(csvContent: string): ImportRow[] {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('Plik CSV musi zawierać nagłówki i co najmniej jeden wiersz danych');
    }
    
    const headers = this.parseCSVLine(lines[0]).map(h => h.trim());
    const rows: ImportRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: any = { rowNumber: i };
      
      headers.forEach((header, index) => {
        const value = values[index]?.trim() || '';
        row[header] = value;
      });
      
      // Validate required fields
      if (!row.catalog_number || !row.material_name) {
        continue; // Skip invalid rows
      }
      
      rows.push(row as ImportRow);
    }
    
    return rows;
  }

  /**
   * Parse boolean value from string
   */
  private parseBoolean(value: string | undefined): boolean | undefined {
    if (!value) return undefined;
    const v = value.trim().toLowerCase();
    if (!v) return undefined; // Handle empty string after trim
    if (['true', '1', 'tak', 'yes', 't', 'y'].includes(v)) return true;
    if (['false', '0', 'nie', 'no', 'f', 'n'].includes(v)) return false;
    return undefined;
  }

  /**
   * Validate row field lengths against column limits
   */
  private validateRowLengths(row: ImportRow): string[] {
    const errors: string[] = [];
    
    if (row.catalog_number && row.catalog_number.length > COLUMN_LIMITS.catalog_number) {
      errors.push(`Numer katalogowy przekracza ${COLUMN_LIMITS.catalog_number} znaków (ma ${row.catalog_number.length})`);
    }
    
    if (row.material_name && row.material_name.length > COLUMN_LIMITS.material_name) {
      errors.push(`Nazwa materiału przekracza ${COLUMN_LIMITS.material_name} znaków (ma ${row.material_name.length})`);
    }
    
    if (row.category && row.category.length > COLUMN_LIMITS.category) {
      errors.push(`Kategoria przekracza ${COLUMN_LIMITS.category} znaków (ma ${row.category.length})`);
    }
    
    if (row.subcategory && row.subcategory.length > COLUMN_LIMITS.subcategory) {
      errors.push(`Podkategoria przekracza ${COLUMN_LIMITS.subcategory} znaków (ma ${row.subcategory.length})`);
    }
    
    if (row.supplier && row.supplier.length > COLUMN_LIMITS.supplier) {
      errors.push(`Dostawca przekracza ${COLUMN_LIMITS.supplier} znaków (ma ${row.supplier.length})`);
    }
    
    if (row.warehouse_location && row.warehouse_location.length > COLUMN_LIMITS.warehouse_location) {
      errors.push(`Lokalizacja przekracza ${COLUMN_LIMITS.warehouse_location} znaków (ma ${row.warehouse_location.length})`);
    }
    
    if (row.manufacturer && row.manufacturer.length > COLUMN_LIMITS.manufacturer) {
      errors.push(`Producent przekracza ${COLUMN_LIMITS.manufacturer} znaków (ma ${row.manufacturer.length})`);
    }
    
    if (row.unit && row.unit.length > COLUMN_LIMITS.unit) {
      errors.push(`Jednostka przekracza ${COLUMN_LIMITS.unit} znaków (ma ${row.unit.length})`);
    }
    
    if (row.material_type && row.material_type.length > COLUMN_LIMITS.material_type) {
      errors.push(`Typ materiału przekracza ${COLUMN_LIMITS.material_type} znaków (ma ${row.material_type.length})`);
    }
    
    if (row.storage_zone && row.storage_zone.length > COLUMN_LIMITS.storage_zone) {
      errors.push(`Strefa magazynowa przekracza ${COLUMN_LIMITS.storage_zone} znaków (ma ${row.storage_zone.length})`);
    }
    
    if (row.supplier_catalog_number && row.supplier_catalog_number.length > COLUMN_LIMITS.supplier_catalog_number) {
      errors.push(`Numer katalogowy dostawcy przekracza ${COLUMN_LIMITS.supplier_catalog_number} znaków (ma ${row.supplier_catalog_number.length})`);
    }
    
    if (row.part_number && row.part_number.length > COLUMN_LIMITS.part_number) {
      errors.push(`Numer części przekracza ${COLUMN_LIMITS.part_number} znaków (ma ${row.part_number.length})`);
    }
    
    if (row.currency && row.currency.length > COLUMN_LIMITS.currency) {
      errors.push(`Waluta przekracza ${COLUMN_LIMITS.currency} znaków (ma ${row.currency.length})`);
    }
    
    if (row.device_category && row.device_category.length > COLUMN_LIMITS.device_category) {
      errors.push(`Kategoria urządzenia przekracza ${COLUMN_LIMITS.device_category} znaków (ma ${row.device_category.length})`);
    }
    
    return errors;
  }

  /**
   * Get changed fields between existing record and import row
   */
  private getChangedFields(existing: WarehouseStock, row: ImportRow): string[] {
    const changed: string[] = [];
    
    if (row.description && row.description !== existing.description) {
      changed.push('description');
    }
    if (row.quantity_in_stock && parseFloat(row.quantity_in_stock) !== existing.quantityInStock) {
      changed.push('quantity_in_stock');
    }
    if (row.unit_price && parseFloat(row.unit_price) !== existing.unitPrice) {
      changed.push('unit_price');
    }
    if (row.warehouse_location && row.warehouse_location !== existing.warehouseLocation) {
      changed.push('warehouse_location');
    }
    if (row.supplier && row.supplier !== existing.supplier) {
      changed.push('supplier');
    }
    if (row.category && row.category !== existing.category) {
      changed.push('category');
    }
    if (row.subcategory && row.subcategory !== existing.subcategory) {
      changed.push('subcategory');
    }
    if (row.min_stock_level && parseFloat(row.min_stock_level) !== existing.minStockLevel) {
      changed.push('min_stock_level');
    }
    if (row.manufacturer && row.manufacturer !== existing.manufacturer) {
      changed.push('manufacturer');
    }
    
    // Nowe pola
    if (row.max_stock_level && parseFloat(row.max_stock_level) !== existing.maxStockLevel) {
      changed.push('max_stock_level');
    }
    if (row.reorder_point && parseFloat(row.reorder_point) !== existing.reorderPoint) {
      changed.push('reorder_point');
    }
    if (row.storage_zone && row.storage_zone !== existing.storageZone) {
      changed.push('storage_zone');
    }
    if (row.supplier_catalog_number && row.supplier_catalog_number !== existing.supplierCatalogNumber) {
      changed.push('supplier_catalog_number');
    }
    if (row.part_number && row.part_number !== existing.partNumber) {
      changed.push('part_number');
    }
    if (row.purchase_price && parseFloat(row.purchase_price) !== existing.purchasePrice) {
      changed.push('purchase_price');
    }
    if (row.currency && row.currency !== existing.currency) {
      changed.push('currency');
    }
    if (row.device_category && row.device_category !== existing.deviceCategory) {
      changed.push('device_category');
    }
    if (row.notes && row.notes !== existing.notes) {
      changed.push('notes');
    }
    
    return changed;
  }

  /**
   * Analyze CSV for duplicates before import
   */
  async analyzeCSVForDuplicates(csvContent: string): Promise<{
    totalRows: number;
    newRecords: AnalyzedRow[];
    duplicates: AnalyzedRow[];
    errors: AnalyzedRow[];
  }> {
    const rows = this.parseCSV(csvContent);
    const newRecords: AnalyzedRow[] = [];
    const duplicates: AnalyzedRow[] = [];
    const errors: AnalyzedRow[] = [];
    
    for (const row of rows) {
      const analyzedRow: AnalyzedRow = { ...row, status: 'new' };
      const validationErrors: string[] = [];
      
      // Basic validation
      if (!row.catalog_number) {
        validationErrors.push('Brak numeru katalogowego');
      }
      if (!row.material_name) {
        validationErrors.push('Brak nazwy materiału');
      }
      
      // Validate field lengths
      const lengthErrors = this.validateRowLengths(row);
      if (lengthErrors.length > 0) {
        validationErrors.push(...lengthErrors);
      }
      
      if (validationErrors.length > 0) {
        analyzedRow.status = 'conflict';
        analyzedRow.validationErrors = validationErrors;
        errors.push(analyzedRow);
        continue;
      }
      
      // Check for duplicates by catalog number
      const byCatalog = await this.stockRepository.findOne({
        where: { catalogNumber: row.catalog_number }
      });
      
      if (byCatalog) {
        const changedFields = this.getChangedFields(byCatalog, row);
        analyzedRow.status = 'duplicate_catalog';
        analyzedRow.existingRecord = byCatalog;
        analyzedRow.changedFields = changedFields;
        duplicates.push(analyzedRow);
        continue;
      }
      
      // Check for duplicates by material name
      const byName = await this.stockRepository.findOne({
        where: { materialName: row.material_name }
      });
      
      if (byName) {
        const changedFields = this.getChangedFields(byName, row);
        analyzedRow.status = 'duplicate_name';
        analyzedRow.existingRecord = byName;
        analyzedRow.changedFields = changedFields;
        duplicates.push(analyzedRow);
        continue;
      }
      
      newRecords.push(analyzedRow);
    }
    
    return {
      totalRows: rows.length,
      newRecords,
      duplicates,
      errors
    };
  }

  /**
   * Map ImportRow to WarehouseStock entity
   */
  private mapRowToStock(row: ImportRow): Partial<WarehouseStock> {
    return {
      // Identyfikacja (wymagane)
      catalogNumber: row.catalog_number,
      materialName: row.material_name,
      
      // Identyfikacja (opcjonalne)
      description: row.description || undefined,
      category: row.category || undefined,
      subcategory: row.subcategory || undefined,
      materialType: (row.material_type as MaterialType) || MaterialType.CONSUMABLE,
      deviceCategory: row.device_category || undefined,
      
      // Ilości i jednostki
      unit: row.unit || 'szt',
      quantityInStock: row.quantity_in_stock ? parseFloat(row.quantity_in_stock) : 0,
      minStockLevel: row.min_stock_level ? parseFloat(row.min_stock_level) : undefined,
      maxStockLevel: row.max_stock_level ? parseFloat(row.max_stock_level) : undefined,
      reorderPoint: row.reorder_point ? parseFloat(row.reorder_point) : undefined,
      
      // Lokalizacja
      warehouseLocation: row.warehouse_location || undefined,
      storageZone: row.storage_zone || undefined,
      
      // Dostawca i producent
      supplier: row.supplier || undefined,
      supplierCatalogNumber: row.supplier_catalog_number || undefined,
      manufacturer: row.manufacturer || undefined,
      partNumber: row.part_number || undefined,
      
      // Ceny
      unitPrice: row.unit_price ? parseFloat(row.unit_price) : undefined,
      purchasePrice: row.purchase_price ? parseFloat(row.purchase_price) : undefined,
      currency: row.currency || 'PLN',
      
      // Flagi
      isSerialized: this.parseBoolean(row.is_serialized),
      isBatchTracked: this.parseBoolean(row.is_batch_tracked),
      requiresIpAddress: this.parseBoolean(row.requires_ip_address),
      isHazardous: this.parseBoolean(row.is_hazardous),
      requiresCertification: this.parseBoolean(row.requires_certification),
      
      // Notatki
      notes: row.notes || undefined,
      internalNotes: row.internal_notes || undefined
    };
  }

  /**
   * Import with selective field update options
   */
  async importWithOptions(
    csvContent: string,
    updateOptions: UpdateOptions,
    userId: number
  ): Promise<ImportResultDetailed> {
    const rows = this.parseCSV(csvContent);
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Array<{ row: number; field?: string; error: string }> = [];
    
    for (const row of rows) {
      try {
        // Validate field lengths
        const lengthErrors = this.validateRowLengths(row);
        if (lengthErrors.length > 0) {
          failed++;
          errors.push({
            row: row.rowNumber,
            field: 'validation',
            error: lengthErrors.join('; ')
          });
          continue; // Skip this row
        }
        
        // Check for existing record
        const existing = await this.stockRepository.findOne({
          where: { catalogNumber: row.catalog_number }
        });
        
        if (existing) {
          if (updateOptions.skipDuplicates) {
            skipped++;
            continue;
          }
          
          // Build update data based on options
          const updateData: Partial<WarehouseStock> = {};
          
          if (updateOptions.updateQuantity && row.quantity_in_stock !== undefined) {
            updateData.quantityInStock = parseFloat(row.quantity_in_stock);
          }
          if (updateOptions.updatePrice && row.unit_price) {
            updateData.unitPrice = parseFloat(row.unit_price);
          }
          if (updateOptions.updateDescription && row.description) {
            updateData.description = row.description;
          }
          if (updateOptions.updateLocation && row.warehouse_location) {
            updateData.warehouseLocation = row.warehouse_location;
          }
          if (updateOptions.updateSupplier && row.supplier) {
            updateData.supplier = row.supplier;
          }
          
          // Also update other fields if provided
          if (row.category) updateData.category = row.category;
          if (row.subcategory) updateData.subcategory = row.subcategory;
          if (row.min_stock_level) updateData.minStockLevel = parseFloat(row.min_stock_level);
          if (row.unit) updateData.unit = row.unit;
          if (row.manufacturer) updateData.manufacturer = row.manufacturer;
          
          // Nowe pola - zawsze aktualizuj jeśli podane
          if (row.max_stock_level) updateData.maxStockLevel = parseFloat(row.max_stock_level);
          if (row.reorder_point) updateData.reorderPoint = parseFloat(row.reorder_point);
          if (row.storage_zone) updateData.storageZone = row.storage_zone;
          if (row.supplier_catalog_number) updateData.supplierCatalogNumber = row.supplier_catalog_number;
          if (row.part_number) updateData.partNumber = row.part_number;
          if (row.purchase_price) updateData.purchasePrice = parseFloat(row.purchase_price);
          if (row.currency) updateData.currency = row.currency;
          if (row.device_category) updateData.deviceCategory = row.device_category;
          if (row.notes) updateData.notes = row.notes;
          if (row.internal_notes) updateData.internalNotes = row.internal_notes;
          
          // Flagi
          const isSerialized = this.parseBoolean(row.is_serialized);
          if (isSerialized !== undefined) updateData.isSerialized = isSerialized;
          
          const isBatchTracked = this.parseBoolean(row.is_batch_tracked);
          if (isBatchTracked !== undefined) updateData.isBatchTracked = isBatchTracked;
          
          const requiresIpAddress = this.parseBoolean(row.requires_ip_address);
          if (requiresIpAddress !== undefined) updateData.requiresIpAddress = requiresIpAddress;
          
          const isHazardous = this.parseBoolean(row.is_hazardous);
          if (isHazardous !== undefined) updateData.isHazardous = isHazardous;
          
          const requiresCertification = this.parseBoolean(row.requires_certification);
          if (requiresCertification !== undefined) updateData.requiresCertification = requiresCertification;
          
          if (Object.keys(updateData).length > 0) {
            await this.update(existing.id, updateData, userId);
            
            // Log to history
            await this.logHistory(existing.id, StockOperationType.IMPORT, null, userId, {
              details: {
                action: 'update',
                updatedFields: Object.keys(updateData),
                source: 'csv_import'
              }
            });
            
            updated++;
          } else {
            skipped++;
          }
        } else {
          // Create new record
          const stockData = this.mapRowToStock(row);
          await this.create(stockData, userId);
          imported++;
        }
      } catch (error: any) {
        failed++;
        errors.push({ 
          row: row.rowNumber, 
          error: error.message 
        });
      }
    }
    
    return { imported, updated, skipped, failed, errors };
  }

  /**
   * Import z CSV (legacy method - kept for backward compatibility)
   */
  async importFromCSV(csvContent: string, userId: number): Promise<{ success: number; failed: number; errors: any[] }> {
    const result = await this.importWithOptions(
      csvContent, 
      {
        updateQuantity: false,
        updatePrice: false,
        updateDescription: false,
        updateLocation: false,
        updateSupplier: false,
        skipDuplicates: true
      },
      userId
    );
    
    return {
      success: result.imported,
      failed: result.failed,
      errors: result.errors
    };
  }

  /**
   * Generuj szablon CSV
   */
  generateCSVTemplate(): string {
    const headers = [
      // Wymagane
      'catalog_number',
      'material_name',
      // Identyfikacja
      'description',
      'category',
      'subcategory',
      'material_type',
      'device_category',
      // Ilości
      'unit',
      'quantity_in_stock',
      'min_stock_level',
      'max_stock_level',
      'reorder_point',
      // Lokalizacja
      'warehouse_location',
      'storage_zone',
      // Dostawca
      'supplier',
      'supplier_catalog_number',
      'manufacturer',
      'part_number',
      // Ceny
      'unit_price',
      'purchase_price',
      'currency',
      // Flagi
      'is_serialized',
      'is_batch_tracked',
      'requires_ip_address',
      'is_hazardous',
      'requires_certification',
      // Notatki
      'notes',
      'internal_notes'
    ];

    const exampleRow = [
      'MAT-001',
      'Przykładowy materiał',
      'Opis materiału',
      'Elektronika',
      'Rezystory',
      'consumable',
      '',
      'szt',
      '100',
      '10',
      '200',
      '20',
      'A-01-02',
      'Strefa A',
      'Dostawca ABC',
      'SUP-001',
      'Producent XYZ',
      'PN-12345',
      '5.50',
      '4.00',
      'PLN',
      'false',
      'false',
      'false',
      'false',
      'false',
      'Notatka publiczna',
      'Notatka wewnętrzna'
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
      quantityChange: quantityChange ?? undefined,
      quantityBefore: options.quantityBefore ?? undefined,
      quantityAfter: options.quantityAfter ?? undefined,
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
