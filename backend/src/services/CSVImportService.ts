// src/services/CSVImportService.ts
// Serwis importu materiałów z plików CSV

import { AppDataSource } from '../config/database';
import { MaterialImport } from '../entities/MaterialImport';
import { BOMTemplate } from '../entities/BOMTemplate';
import { parse } from 'csv-parse/sync';
import { IMPORT_STATUSES } from '../config/constants';

interface CSVRow {
  catalog_number: string;
  name: string;
  unit: string;
  default_quantity?: number;
  category?: string;
  supplier?: string;
  unit_price?: number;
}

interface DiffPreview {
  new: CSVRow[];
  existing: CSVRow[];
  errors: Array<{ row: number; data: any; error: string }>;
}

export class CSVImportService {
  /**
   * Parsuje i waliduje plik CSV, tworzy preview z diff
   */
  static async parseAndPreview(
    fileBuffer: Buffer,
    filename: string,
    userId?: number
  ): Promise<MaterialImport> {
    const importRepository = AppDataSource.getRepository(MaterialImport);
    const bomRepository = AppDataSource.getRepository(BOMTemplate);

    // Parsuj CSV
    let records: any[];
    try {
      records = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true
      });
    } catch (error) {
      throw new Error('Błąd parsowania pliku CSV: ' + (error as Error).message);
    }

    if (records.length === 0) {
      throw new Error('Plik CSV jest pusty');
    }

    // Walidacja struktury
    const requiredColumns = ['catalog_number', 'name', 'unit'];
    const firstRow = records[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
    
    if (missingColumns.length > 0) {
      throw new Error(`Brak wymaganych kolumn: ${missingColumns.join(', ')}`);
    }

    // Pobierz istniejące materiały (po catalog_number)
    const existingMaterials = await bomRepository.find({
      where: { active: true }
    });

    const existingCatalogNumbers = new Set(
      existingMaterials
        .filter(m => m.catalogNumber)
        .map(m => m.catalogNumber!.toLowerCase())
    );

    // Przygotuj diff
    const diffPreview: DiffPreview = {
      new: [],
      existing: [],
      errors: []
    };

    records.forEach((record, index) => {
      try {
        // Walidacja wiersza
        if (!record.catalog_number || !record.name || !record.unit) {
          diffPreview.errors.push({
            row: index + 2, // +2 bo pierwsza linia to nagłówki, indeks od 0
            data: record,
            error: 'Brak wymaganych pól (catalog_number, name, unit)'
          });
          return;
        }

        const csvRow: CSVRow = {
          catalog_number: record.catalog_number.trim(),
          name: record.name.trim(),
          unit: record.unit.trim(),
          default_quantity: record.default_quantity ? parseFloat(record.default_quantity) : 1,
          category: record.category?.trim(),
          supplier: record.supplier?.trim(),
          unit_price: record.unit_price ? parseFloat(record.unit_price) : undefined
        };

        // Sprawdź czy materiał już istnieje
        if (existingCatalogNumbers.has(csvRow.catalog_number.toLowerCase())) {
          diffPreview.existing.push(csvRow);
        } else {
          diffPreview.new.push(csvRow);
        }
      } catch (error) {
        diffPreview.errors.push({
          row: index + 2,
          data: record,
          error: 'Błąd przetwarzania wiersza: ' + (error as Error).message
        });
      }
    });

    // Utwórz wpis importu w bazie
    const materialImport = importRepository.create({
      filename,
      status: IMPORT_STATUSES.PREVIEW,
      totalRows: records.length,
      newItems: diffPreview.new.length,
      existingItems: diffPreview.existing.length,
      errorItems: diffPreview.errors.length,
      diffPreview,
      importedById: userId
    });

    return await importRepository.save(materialImport);
  }

  /**
   * Pobiera preview importu
   */
  static async getImportPreview(uuid: string): Promise<MaterialImport | null> {
    const importRepository = AppDataSource.getRepository(MaterialImport);
    
    return await importRepository.findOne({
      where: { uuid },
      relations: ['importedBy']
    });
  }

  /**
   * Potwierdza import - dodaje TYLKO nowe materiały
   */
  static async confirmImport(uuid: string, userId?: number): Promise<MaterialImport> {
    const importRepository = AppDataSource.getRepository(MaterialImport);
    const bomRepository = AppDataSource.getRepository(BOMTemplate);

    const materialImport = await importRepository.findOne({
      where: { uuid }
    });

    if (!materialImport) {
      throw new Error('Import nie znaleziony');
    }

    if (materialImport.status !== IMPORT_STATUSES.PREVIEW) {
      throw new Error('Import już został przetworzony lub anulowany');
    }

    const diffPreview = materialImport.diffPreview as DiffPreview;
    const newMaterials = diffPreview.new;

    if (newMaterials.length === 0) {
      materialImport.status = IMPORT_STATUSES.COMPLETED;
      materialImport.confirmedAt = new Date();
      materialImport.importedIds = [];
      return await importRepository.save(materialImport);
    }

    // Dodaj tylko nowe materiały
    const importedIds: number[] = [];
    
    // Parametryzacja taskTypeId - można w przyszłości dodać jako parametr lub pobrać z pierwszego materiału
    const defaultTaskTypeId = 1; // Domyślny typ zadania
    
    for (const material of newMaterials) {
      try {
        const bomTemplate = bomRepository.create({
          taskTypeId: defaultTaskTypeId,
          materialName: material.name,
          catalogNumber: material.catalog_number,
          unit: material.unit,
          defaultQuantity: material.default_quantity || 1,
          category: material.category,
          supplier: material.supplier,
          unitPrice: material.unit_price,
          description: '',
          active: true
        });

        const saved = await bomRepository.save(bomTemplate);
        importedIds.push(saved.id);
      } catch (error) {
        console.error('Błąd dodawania materiału:', error);
        // Kontynuuj dla pozostałych materiałów
      }
    }

    // Aktualizuj status importu
    materialImport.status = IMPORT_STATUSES.COMPLETED;
    materialImport.confirmedAt = new Date();
    materialImport.importedIds = importedIds;

    return await importRepository.save(materialImport);
  }

  /**
   * Anuluje import
   */
  static async cancelImport(uuid: string): Promise<boolean> {
    const importRepository = AppDataSource.getRepository(MaterialImport);

    const materialImport = await importRepository.findOne({
      where: { uuid }
    });

    if (!materialImport) {
      return false;
    }

    if (materialImport.status === IMPORT_STATUSES.COMPLETED) {
      throw new Error('Nie można anulować ukończonego importu');
    }

    materialImport.status = IMPORT_STATUSES.CANCELLED;
    await importRepository.save(materialImport);
    
    return true;
  }

  /**
   * Pobiera historię importów
   */
  static async getImportHistory(filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ imports: MaterialImport[]; total: number }> {
    const importRepository = AppDataSource.getRepository(MaterialImport);

    const where: any = {};
    if (filters?.status) where.status = filters.status;

    const [imports, total] = await importRepository.findAndCount({
      where,
      relations: ['importedBy'],
      order: { createdAt: 'DESC' },
      take: filters?.limit || 20,
      skip: filters?.offset || 0
    });

    return { imports, total };
  }

  /**
   * Generuje wzorcowy plik CSV
   */
  static generateTemplateCSV(): string {
    const header = 'catalog_number,name,unit,default_quantity,category,supplier,unit_price';
    const example1 = 'CAT-001,Kabel światłowodowy G.652D,m,100,kable,Fibra Sp. z o.o.,2.50';
    const example2 = 'CAT-002,Skrzynka rozdzielcza 24-portowa,szt,1,skrzynki,TechNet,350.00';
    const example3 = 'CAT-003,Pigtail SC/APC 2m,szt,24,pigtaile,Fibra Sp. z o.o.,8.50';
    
    return [header, example1, example2, example3].join('\n');
  }
}
