// src/services/WorkflowBomService.ts
// Serwis zarządzania BOM dla workflow kontraktowego

import { AppDataSource } from '../config/database';
import { WorkflowBomTemplate } from '../entities/WorkflowBomTemplate';
import { WorkflowBomTemplateItem } from '../entities/WorkflowBomTemplateItem';
import { WorkflowGeneratedBom } from '../entities/WorkflowGeneratedBom';
import { WorkflowGeneratedBomItem } from '../entities/WorkflowGeneratedBomItem';
import { Subsystem, SystemType } from '../entities/Subsystem';
import { parse } from 'csv-parse/sync';
import { detectDeviceCategoryFromName, isNetworkDevice } from '../config/wizardConfig';

/**
 * Struktura pozycji z CSV
 */
interface CsvBomItem {
  lp: string;
  nazwa: string;
  sumaIlosci: string;
}

/**
 * Statystyki importu
 */
interface ImportStats {
  totalItems: number;
  networkDevices: number;
  nonNetworkDevices: number;
}

export class WorkflowBomService {
  /**
   * Import szablonu BOM z pliku CSV
   * Format: L.P.;Nazwa;Suma ilości (separator średnik)
   */
  async importBomTemplateFromCsv(
    csvContent: string,
    systemType: SystemType,
    templateCode: string,
    name: string,
    description?: string
  ): Promise<WorkflowBomTemplate> {
    const templateRepo = AppDataSource.getRepository(WorkflowBomTemplate);
    const itemRepo = AppDataSource.getRepository(WorkflowBomTemplateItem);

    // Parsuj CSV
    const records: string[][] = parse(csvContent, {
      delimiter: ';',
      skip_empty_lines: true,
      from_line: 2, // Pomijamy nagłówek
      relax_column_count: true
    });

    if (records.length === 0) {
      throw new Error('Plik CSV jest pusty lub ma nieprawidłowy format');
    }

    // Sprawdź czy szablon już istnieje
    const existingTemplate = await templateRepo.findOne({
      where: { templateCode }
    });

    if (existingTemplate) {
      throw new Error(`Szablon o kodzie ${templateCode} już istnieje`);
    }

    // Utwórz szablon
    const template = templateRepo.create({
      templateCode,
      systemType,
      name,
      description: description || `Szablon BOM dla ${systemType}`,
      isActive: true,
      version: 1
    });

    await templateRepo.save(template);

    // Utwórz pozycje szablonu
    const items: WorkflowBomTemplateItem[] = [];

    for (const record of records) {
      if (record.length < 3) continue;

      const [lpStr, nazwa, sumaIlosciStr] = record;
      
      if (!nazwa || !sumaIlosciStr) continue;

      const quantity = parseInt(sumaIlosciStr, 10);
      if (isNaN(quantity)) continue;

      // Wykryj automatycznie czy to urządzenie sieciowe
      const deviceCategory = detectDeviceCategoryFromName(nazwa);
      const requiresIp = deviceCategory ? isNetworkDevice(deviceCategory) : false;

      const item: WorkflowBomTemplateItem = itemRepo.create({
        template,
        templateId: template.id,
        itemName: nazwa.trim(),
        quantity,
        unit: 'szt',
        partNumber: null,
        requiresIp,
        deviceCategory: deviceCategory || undefined,
        sequence: parseInt(lpStr, 10) || items.length + 1
      } as any) as unknown as WorkflowBomTemplateItem;

      items.push(item);
    }

    await itemRepo.save(items as any);

    console.log(`✅ Zaimportowano szablon BOM: ${templateCode} z ${items.length} pozycjami`);

    return template;
  }

  /**
   * Generuje BOM dla podsystemu na podstawie szablonu
   */
  async generateBomForSubsystem(
    subsystemId: number,
    templateCode?: string,
    multiplier: number = 1
  ): Promise<WorkflowGeneratedBom> {
    const subsystemRepo = AppDataSource.getRepository(Subsystem);
    const templateRepo = AppDataSource.getRepository(WorkflowBomTemplate);
    const generatedBomRepo = AppDataSource.getRepository(WorkflowGeneratedBom);
    const generatedItemRepo = AppDataSource.getRepository(WorkflowGeneratedBomItem);

    // Pobierz podsystem
    const subsystem = await subsystemRepo.findOne({
      where: { id: subsystemId },
      relations: ['contract']
    });

    if (!subsystem) {
      throw new Error('Podsystem nie znaleziony');
    }

    // Znajdź szablon
    let template: WorkflowBomTemplate | null;

    if (templateCode) {
      template = await templateRepo.findOne({
        where: { templateCode },
        relations: ['items']
      });
    } else {
      // Znajdź szablon na podstawie systemType
      template = await templateRepo.findOne({
        where: { 
          systemType: subsystem.systemType,
          isActive: true
        },
        relations: ['items'],
        order: { version: 'DESC' }
      });
    }

    if (!template) {
      throw new Error(`Nie znaleziono szablonu BOM dla ${subsystem.systemType}`);
    }

    // Sprawdź czy BOM już istnieje
    const existingBom = await generatedBomRepo.findOne({
      where: { subsystemId }
    });

    if (existingBom) {
      throw new Error('BOM dla tego podsystemu już został wygenerowany');
    }

    // Utwórz wygenerowany BOM
    const generatedBomData = generatedBomRepo.create({
      subsystem,
      subsystemId: subsystem.id,
      contract: subsystem.contract,
      contractId: subsystem.contractId,
      template,
      templateId: template.id,
      status: 'GENERATED'
    } as any);

    const generatedBom: WorkflowGeneratedBom = await generatedBomRepo.save(generatedBomData) as unknown as WorkflowGeneratedBom;

    // Utwórz pozycje wygenerowanego BOM
    const generatedItems: WorkflowGeneratedBomItem[] = [];

    for (const templateItem of template.items) {
      const finalQuantity = Math.ceil(templateItem.quantity * multiplier * (subsystem.quantity || 1));

      const generatedItem: WorkflowGeneratedBomItem = generatedItemRepo.create({
        generatedBom,
        generatedBomId: generatedBom.id,
        templateItem,
        templateItemId: templateItem.id,
        itemName: templateItem.itemName,
        quantity: finalQuantity,
        scannedQuantity: 0,
        unit: templateItem.unit,
        partNumber: templateItem.partNumber || null,
        requiresIp: templateItem.requiresIp,
        deviceCategory: templateItem.deviceCategory || null,
        sequence: templateItem.sequence
      } as any) as unknown as WorkflowGeneratedBomItem;

      generatedItems.push(generatedItem);
    }

    await generatedItemRepo.save(generatedItems as any);

    console.log(`✅ Wygenerowano BOM dla podsystemu ${subsystem.subsystemNumber}: ${generatedItems.length} pozycji`);

    return generatedBom;
  }

  /**
   * Zlicza urządzenia sieciowe w BOM (dla kalkulacji alokacji IP)
   */
  async countNetworkDevicesInBom(bomId: number): Promise<number> {
    const generatedBomRepo = AppDataSource.getRepository(WorkflowGeneratedBom);

    const bom = await generatedBomRepo.findOne({
      where: { id: bomId },
      relations: ['items']
    });

    if (!bom) {
      throw new Error('BOM nie znaleziony');
    }

    let totalNetworkDevices = 0;

    for (const item of bom.items) {
      if (item.requiresIp) {
        totalNetworkDevices += item.quantity;
      }
    }

    return totalNetworkDevices;
  }

  /**
   * Pobiera listę urządzeń sieciowych z BOM
   */
  async getNetworkDevicesFromBom(bomId: number) {
    const generatedBomRepo = AppDataSource.getRepository(WorkflowGeneratedBom);

    const bom = await generatedBomRepo.findOne({
      where: { id: bomId },
      relations: ['items', 'items.templateItem']
    });

    if (!bom) {
      throw new Error('BOM nie znaleziony');
    }

    const networkDevices = bom.items
      .filter(item => item.requiresIp)
      .map(item => ({
        id: item.id,
        itemName: item.itemName,
        quantity: item.quantity,
        deviceCategory: item.deviceCategory,
        partNumber: item.partNumber
      }));

    return {
      bomId: bom.id,
      subsystemId: bom.subsystemId,
      networkDevices,
      totalCount: networkDevices.reduce((sum, device) => sum + device.quantity, 0)
    };
  }

  /**
   * Pobiera statystyki szablonu
   */
  async getTemplateStats(templateId: number): Promise<ImportStats> {
    const templateRepo = AppDataSource.getRepository(WorkflowBomTemplate);

    const template = await templateRepo.findOne({
      where: { id: templateId },
      relations: ['items']
    });

    if (!template) {
      throw new Error('Szablon nie znaleziony');
    }

    const stats: ImportStats = {
      totalItems: template.items.length,
      networkDevices: 0,
      nonNetworkDevices: 0
    };

    for (const item of template.items) {
      if (item.requiresIp) {
        stats.networkDevices += item.quantity;
      } else {
        stats.nonNetworkDevices += item.quantity;
      }
    }

    return stats;
  }

  /**
   * Pobiera wszystkie szablony BOM
   */
  async getAllTemplates() {
    const templateRepo = AppDataSource.getRepository(WorkflowBomTemplate);
    
    return await templateRepo.find({
      relations: ['items'],
      order: {
        systemType: 'ASC',
        version: 'DESC'
      }
    });
  }

  /**
   * Pobiera szablon BOM po kodzie
   */
  async getTemplateByCode(templateCode: string) {
    const templateRepo = AppDataSource.getRepository(WorkflowBomTemplate);
    
    const template = await templateRepo.findOne({
      where: { templateCode },
      relations: ['items']
    });

    if (!template) {
      throw new Error(`Szablon ${templateCode} nie znaleziony`);
    }

    return template;
  }
}

export default new WorkflowBomService();
