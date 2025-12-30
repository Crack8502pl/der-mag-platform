// src/services/MaterialImportService.ts
// Serwis importu materiałów z plików CSV i Excel

import { AppDataSource } from '../config/database';
import { MaterialStock, StockSource } from '../entities/MaterialStock';
import { MaterialImportLog, ImportStatus } from '../entities/MaterialImportLog';
import { parse } from 'csv-parse/sync';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';

// Domyślne mapowania kolumn dla Symfonia Handel
const SYMFONIA_COLUMN_MAPPING: Record<string, string[]> = {
  partNumber: ['Indeks', 'Symbol', 'PartNumber', 'Part Number', 'Nr katalogowy'],
  name: ['Nazwa', 'Name', 'Description', 'Opis'],
  quantity: ['Stan', 'Ilość', 'Qty', 'Quantity', 'Dostępne'],
  unit: ['JM', 'Jednostka', 'Unit', 'UOM'],
  unitPrice: ['Cena', 'Price', 'Cena jednostkowa', 'Unit Price'],
  warehouseLocation: ['Magazyn', 'Warehouse', 'Location', 'Lokalizacja'],
  supplier: ['Dostawca', 'Vendor', 'Supplier'],
  barcode: ['KodKreskowy', 'Barcode', 'Kod'],
  eanCode: ['EAN', 'EAN13', 'EAN-13'],
  symfoniaId: ['Id', 'ID'],
  symfoniaIndex: ['Indeks', 'Symbol'],
  description: ['Opis', 'Description', 'Nazwa pełna', 'Full Name']
};

interface ParsedMaterial {
  partNumber: string;
  name: string;
  quantityAvailable?: number;
  unit?: string;
  unitPrice?: number;
  warehouseLocation?: string;
  supplier?: string;
  barcode?: string;
  eanCode?: string;
  symfoniaId?: string;
  symfoniaIndex?: string;
  description?: string;
}

interface ImportResult {
  importLog: MaterialImportLog;
  importedCount: number;
  updatedCount: number;
  errorCount: number;
}

export class MaterialImportService {
  /**
   * Importuje materiały z pliku CSV
   */
  static async importFromCSV(
    filePath: string,
    fileName: string,
    fileSize: number,
    userId: number,
    delimiter: string = ';',
    mappingType: 'symfonia' | 'custom' = 'symfonia',
    customMapping?: Record<string, string>
  ): Promise<ImportResult> {
    const importLogRepo = AppDataSource.getRepository(MaterialImportLog);
    const stockRepo = AppDataSource.getRepository(MaterialStock);

    // Utwórz log importu
    const importLog = importLogRepo.create({
      fileName,
      fileType: 'csv',
      fileSize,
      status: ImportStatus.PENDING,
      importedBy: { id: userId } as any,
      columnMapping: customMapping || {}
    });
    await importLogRepo.save(importLog);

    try {
      // Zaktualizuj status
      importLog.status = ImportStatus.PROCESSING;
      importLog.startedAt = new Date();
      await importLogRepo.save(importLog);

      // Wczytaj i parsuj plik
      const content = fs.readFileSync(filePath, 'utf-8');
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        delimiter: delimiter,
        relax_quotes: true,
        relax_column_count: true
      });

      importLog.totalRows = records.length;

      const errors: Array<{ row: number; field: string; value: string; message: string }> = [];
      let importedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      // Fetch all existing stocks in one query (optimization)
      const existingStocks = await stockRepo.find({
        where: { isActive: true }
      });
      const existingStocksMap = new Map(existingStocks.map((stock: MaterialStock) => [stock.partNumber, stock]));

      // Arrays for batch save
      const toCreate: MaterialStock[] = [];
      const toUpdate: MaterialStock[] = [];

      // Automatyczne rozpoznawanie kolumn
      const columnMapping = mappingType === 'symfonia' 
        ? this.autoDetectColumns(records[0])
        : customMapping || {};

      importLog.columnMapping = columnMapping;

      // Przetwarzaj każdy wiersz
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        
        try {
          const parsed = this.parseRow(row, columnMapping);
          
          // Walidacja wymaganych pól
          if (!parsed.partNumber || !parsed.name) {
            errors.push({
              row: i + 1,
              field: 'partNumber/name',
              value: JSON.stringify(row),
              message: 'Brak wymaganego numeru katalogowego lub nazwy'
            });
            errorCount++;
            continue;
          }

          // Sprawdź czy materiał już istnieje (z cache)
          const existing = existingStocksMap.get(parsed.partNumber);

          if (existing) {
            // Aktualizuj istniejący
            Object.assign(existing, {
              ...parsed,
              source: StockSource.CSV_IMPORT,
              lastImportAt: new Date(),
              lastImportFile: fileName
            });
            toUpdate.push(existing);
            updatedCount++;
          } else {
            // Przygotuj nowy
            const newStock = stockRepo.create({
              ...parsed,
              source: StockSource.CSV_IMPORT,
              lastImportAt: new Date(),
              lastImportFile: fileName,
              isActive: true
            });
            toCreate.push(newStock);
            importedCount++;
          }
        } catch (error: any) {
          errors.push({
            row: i + 1,
            field: 'general',
            value: JSON.stringify(row),
            message: error.message
          });
          errorCount++;
        }
      }

      // Batch save - save all at once (performance optimization)
      if (toCreate.length > 0) {
        await stockRepo.save(toCreate);
      }
      if (toUpdate.length > 0) {
        await stockRepo.save(toUpdate);
      }

      // Zaktualizuj log
      importLog.status = errorCount === records.length ? ImportStatus.FAILED : 
                        errorCount > 0 ? ImportStatus.PARTIAL : ImportStatus.COMPLETED;
      importLog.importedRows = importedCount;
      importLog.updatedRows = updatedCount;
      importLog.errorRows = errorCount;
      importLog.errors = errors;
      importLog.completedAt = new Date();
      await importLogRepo.save(importLog);

      return {
        importLog,
        importedCount,
        updatedCount,
        errorCount
      };
    } catch (error: any) {
      // Oznacz import jako nieudany
      importLog.status = ImportStatus.FAILED;
      importLog.errors = [{ row: 0, field: 'file', value: fileName, message: error.message }];
      importLog.completedAt = new Date();
      await importLogRepo.save(importLog);
      throw error;
    }
  }

  /**
   * Importuje materiały z pliku Excel
   */
  static async importFromExcel(
    filePath: string,
    fileName: string,
    fileSize: number,
    userId: number,
    mappingType: 'symfonia' | 'custom' = 'symfonia',
    customMapping?: Record<string, string>
  ): Promise<ImportResult> {
    const importLogRepo = AppDataSource.getRepository(MaterialImportLog);
    const stockRepo = AppDataSource.getRepository(MaterialStock);

    // Utwórz log importu
    const importLog = importLogRepo.create({
      fileName,
      fileType: 'excel',
      fileSize,
      status: ImportStatus.PENDING,
      importedBy: { id: userId } as any,
      columnMapping: customMapping || {}
    });
    await importLogRepo.save(importLog);

    try {
      // Zaktualizuj status
      importLog.status = ImportStatus.PROCESSING;
      importLog.startedAt = new Date();
      await importLogRepo.save(importLog);

      // Wczytaj plik Excel
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      // Pobierz pierwszy arkusz
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error('Plik Excel nie zawiera żadnych arkuszy');
      }

      // Pobierz nagłówki z pierwszego wiersza
      const headerRow = worksheet.getRow(1);
      const headers: Record<number, string> = {};
      headerRow.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
        headers[colNumber] = cell.value?.toString().trim() || '';
      });

      // Konwertuj wiersze na obiekty
      const records: Record<string, any>[] = [];
      worksheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
        if (rowNumber === 1) return; // Pomiń nagłówki

        const record: Record<string, any> = {};
        row.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
          const header = headers[colNumber];
          if (header) {
            record[header] = cell.value;
          }
        });

        if (Object.keys(record).length > 0) {
          records.push(record);
        }
      });

      importLog.totalRows = records.length;

      const errors: Array<{ row: number; field: string; value: string; message: string }> = [];
      let importedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      // Automatyczne rozpoznawanie kolumn
      const columnMapping = mappingType === 'symfonia' 
        ? this.autoDetectColumns(records[0])
        : customMapping || {};

      importLog.columnMapping = columnMapping;

      // Przetwarzaj każdy wiersz
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        
        try {
          const parsed = this.parseRow(row, columnMapping);
          
          // Walidacja wymaganych pól
          if (!parsed.partNumber || !parsed.name) {
            errors.push({
              row: i + 2, // +2 bo pierwszy wiersz to nagłówki i indeksujemy od 1
              field: 'partNumber/name',
              value: JSON.stringify(row),
              message: 'Brak wymaganego numeru katalogowego lub nazwy'
            });
            errorCount++;
            continue;
          }

          // Sprawdź czy materiał już istnieje
          const existing = await stockRepo.findOne({
            where: { partNumber: parsed.partNumber }
          });

          if (existing) {
            // Aktualizuj istniejący
            Object.assign(existing, {
              ...parsed,
              source: StockSource.EXCEL_IMPORT,
              lastImportAt: new Date(),
              lastImportFile: fileName
            });
            await stockRepo.save(existing);
            updatedCount++;
          } else {
            // Utwórz nowy
            const newStock = stockRepo.create({
              ...parsed,
              source: StockSource.EXCEL_IMPORT,
              lastImportAt: new Date(),
              lastImportFile: fileName,
              isActive: true
            });
            await stockRepo.save(newStock);
            importedCount++;
          }
        } catch (error: any) {
          errors.push({
            row: i + 2,
            field: 'general',
            value: JSON.stringify(row),
            message: error.message
          });
          errorCount++;
        }
      }

      // Zaktualizuj log
      importLog.status = errorCount === records.length ? ImportStatus.FAILED : 
                        errorCount > 0 ? ImportStatus.PARTIAL : ImportStatus.COMPLETED;
      importLog.importedRows = importedCount;
      importLog.updatedRows = updatedCount;
      importLog.errorRows = errorCount;
      importLog.errors = errors;
      importLog.completedAt = new Date();
      await importLogRepo.save(importLog);

      return {
        importLog,
        importedCount,
        updatedCount,
        errorCount
      };
    } catch (error: any) {
      // Oznacz import jako nieudany
      importLog.status = ImportStatus.FAILED;
      importLog.errors = [{ row: 0, field: 'file', value: fileName, message: error.message }];
      importLog.completedAt = new Date();
      await importLogRepo.save(importLog);
      throw error;
    }
  }

  /**
   * Automatycznie rozpoznaje kolumny w pliku
   */
  private static autoDetectColumns(headerRow: Record<string, any>): Record<string, string> {
    const mapping: Record<string, string> = {};
    const headers = Object.keys(headerRow);

    for (const [field, possibleNames] of Object.entries(SYMFONIA_COLUMN_MAPPING)) {
      for (const header of headers) {
        const normalizedHeader = header.trim();
        if (possibleNames.some(name => 
          normalizedHeader.toLowerCase() === name.toLowerCase() ||
          normalizedHeader.toLowerCase().includes(name.toLowerCase())
        )) {
          mapping[field] = header;
          break;
        }
      }
    }

    return mapping;
  }

  /**
   * Parsuje wiersz danych
   */
  private static parseRow(row: Record<string, any>, columnMapping: Record<string, string>): ParsedMaterial {
    const getValue = (field: string): string | undefined => {
      const column = columnMapping[field];
      return column ? row[column]?.toString().trim() : undefined;
    };

    const parseNumber = (value: string | undefined): number | undefined => {
      if (!value) return undefined;
      // Usuń spacje i zamień przecinek na kropkę
      const cleaned = value.replace(/\s/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? undefined : num;
    };

    return {
      partNumber: getValue('partNumber') || '',
      name: getValue('name') || '',
      description: getValue('description'),
      quantityAvailable: parseNumber(getValue('quantity')),
      unit: getValue('unit') || 'szt',
      unitPrice: parseNumber(getValue('unitPrice')),
      warehouseLocation: getValue('warehouseLocation'),
      supplier: getValue('supplier'),
      barcode: getValue('barcode'),
      eanCode: getValue('eanCode'),
      symfoniaId: getValue('symfoniaId'),
      symfoniaIndex: getValue('symfoniaIndex')
    };
  }

  /**
   * Pobiera historię importów
   */
  static async getImportHistory(limit: number = 50): Promise<MaterialImportLog[]> {
    const importLogRepo = AppDataSource.getRepository(MaterialImportLog);
    
    return await importLogRepo.find({
      relations: ['importedBy'],
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  /**
   * Pobiera szczegóły importu
   */
  static async getImportDetails(id: number): Promise<MaterialImportLog | null> {
    const importLogRepo = AppDataSource.getRepository(MaterialImportLog);
    
    return await importLogRepo.findOne({
      where: { id },
      relations: ['importedBy']
    });
  }

  /**
   * Sprawdza dostępność materiałów dla BOM
   */
  static async checkAvailability(materials: Array<{ partNumber: string; quantity: number }>): Promise<any> {
    const stockRepo = AppDataSource.getRepository(MaterialStock);
    
    // Optymalizacja: pobierz wszystkie materiały jednym zapytaniem
    const partNumbers = materials.map(m => m.partNumber);
    const stocks = await stockRepo.find({
      where: partNumbers.map(partNumber => ({ partNumber, isActive: true }))
    });
    
    const stocksMap = new Map(stocks.map(stock => [stock.partNumber, stock]));
    const results = [];

    for (const material of materials) {
      const stock = stocksMap.get(material.partNumber);

      if (!stock) {
        results.push({
          partNumber: material.partNumber,
          required: material.quantity,
          available: 0,
          status: 'not_found'
        });
      } else {
        const availableQty = stock.quantityAvailable - stock.quantityReserved;
        results.push({
          partNumber: material.partNumber,
          name: stock.name,
          required: material.quantity,
          available: availableQty,
          reserved: stock.quantityReserved,
          warehouseLocation: stock.warehouseLocation,
          status: availableQty >= material.quantity ? 'available' : 
                  availableQty > 0 ? 'partial' : 'unavailable'
        });
      }
    }

    return results;
  }

  /**
   * Rezerwuje materiały
   */
  static async reserveMaterials(
    materials: Array<{ partNumber: string; quantity: number }>,
    orderId?: string
  ): Promise<void> {
    const stockRepo = AppDataSource.getRepository(MaterialStock);

    // Optymalizacja: pobierz wszystkie materiały jednym zapytaniem
    const partNumbers = materials.map(m => m.partNumber);
    const stocks = await stockRepo.find({
      where: partNumbers.map(partNumber => ({ partNumber, isActive: true }))
    });
    
    const stocksMap = new Map(stocks.map(stock => [stock.partNumber, stock]));
    const toUpdate: MaterialStock[] = [];

    for (const material of materials) {
      const stock = stocksMap.get(material.partNumber);

      if (!stock) {
        throw new Error(`Materiał ${material.partNumber} nie znaleziony`);
      }

      const availableQty = stock.quantityAvailable - stock.quantityReserved;
      if (availableQty < material.quantity) {
        throw new Error(`Niewystarczająca ilość materiału ${material.partNumber}`);
      }

      stock.quantityReserved += material.quantity;
      toUpdate.push(stock);
    }
    
    // Batch save
    if (toUpdate.length > 0) {
      await stockRepo.save(toUpdate);
    }
  }

  /**
   * Zwalnia rezerwację materiałów
   */
  static async releaseMaterials(
    materials: Array<{ partNumber: string; quantity: number }>
  ): Promise<void> {
    const stockRepo = AppDataSource.getRepository(MaterialStock);

    // Optymalizacja: pobierz wszystkie materiały jednym zapytaniem
    const partNumbers = materials.map(m => m.partNumber);
    const stocks = await stockRepo.find({
      where: partNumbers.map(partNumber => ({ partNumber, isActive: true }))
    });
    
    const stocksMap = new Map(stocks.map(stock => [stock.partNumber, stock]));
    const toUpdate: MaterialStock[] = [];

    for (const material of materials) {
      const stock = stocksMap.get(material.partNumber);

      if (stock) {
        stock.quantityReserved = Math.max(0, stock.quantityReserved - material.quantity);
        toUpdate.push(stock);
      }
    }
    
    // Batch save
    if (toUpdate.length > 0) {
      await stockRepo.save(toUpdate);
    }
  }

  /**
   * Generuje szablon CSV
   */
  static generateCSVTemplate(): string {
    const headers = [
      'Indeks',
      'Nazwa',
      'Stan',
      'JM',
      'Cena',
      'Magazyn',
      'Dostawca',
      'KodKreskowy',
      'EAN'
    ];
    
    const example = [
      'MAT-001',
      'Przykładowy materiał',
      '100',
      'szt',
      '25.50',
      'MAG-01',
      'Dostawca XYZ',
      '1234567890',
      '5901234567890'
    ];

    return headers.join(';') + '\n' + example.join(';');
  }

  /**
   * Zwraca dostępne mapowania kolumn
   */
  static getColumnMappings(): Record<string, string[]> {
    return SYMFONIA_COLUMN_MAPPING;
  }
}
