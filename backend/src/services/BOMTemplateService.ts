// src/services/BOMTemplateService.ts
// Service for BOM Template operations

import { AppDataSource } from '../config/database';
import { BOMTemplate } from '../entities/BOMTemplate';
import { Like } from 'typeorm';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

interface GetTemplatesParams {
  page: number;
  limit: number;
  category?: string;
  systemType?: string;
  search?: string;
}

interface CreateTemplateDto {
  taskTypeId: number;
  materialName: string;
  catalogNumber?: string;
  description?: string;
  unit: string;
  defaultQuantity: number;
  category?: string;
  systemType?: string;
  isRequired: boolean;
  sortOrder?: number;
}

export class BOMTemplateService {
  static async getTemplates(params: GetTemplatesParams) {
    const { page, limit, category, systemType, search } = params;
    const repository = AppDataSource.getRepository(BOMTemplate);

    const where: any = { active: true };

    if (category) {
      where.category = category;
    }

    if (systemType) {
      where.systemType = systemType;
    }

    if (search) {
      where.materialName = Like(`%${search}%`);
    }

    const [items, total] = await repository.findAndCount({
      where,
      order: { category: 'ASC', sortOrder: 'ASC', materialName: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['taskType'],
    });

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  static async getTemplate(id: number) {
    const repository = AppDataSource.getRepository(BOMTemplate);
    return repository.findOne({
      where: { id, active: true },
      relations: ['taskType'],
    });
  }

  static async getCategories() {
    const repository = AppDataSource.getRepository(BOMTemplate);
    const results = await repository
      .createQueryBuilder('template')
      .select('DISTINCT template.category', 'category')
      .where('template.active = :active', { active: true })
      .andWhere('template.category IS NOT NULL')
      .getRawMany();

    return results.map(r => r.category).filter(Boolean);
  }

  static generateCsvTemplate(): string {
    const headers = [
      'numer_katalogowy',
      'nazwa_materialu',
      'ilosc',
      'jednostka',
      'wymagane',
      'kategoria',
      'system_type',
      'opis'
    ];

    const exampleRows = [
      'CAM-IP-DOME-4MP;Kamera IP Dome 4MP;4;szt;tak;PRZEJAZD_KAT_A;SMOKIP_A;Kamera wewnętrzna do monitoringu',
      'SW-POE-8;Switch PoE 8-port;1;szt;tak;PRZEJAZD_KAT_A;SMOKIP_A;Switch główny',
      'NVR-16CH;Rejestrator NVR 16 kanałów;1;szt;nie;PRZEJAZD_KAT_E;SMOKIP_A;Opcjonalny rejestrator',
    ];

    return headers.join(';') + '\n' + exampleRows.join('\n');
  }

  static async createTemplate(data: CreateTemplateDto) {
    const repository = AppDataSource.getRepository(BOMTemplate);
    const template = repository.create({
      ...data,
      sortOrder: data.sortOrder || 0,
      active: true,
    });

    return repository.save(template);
  }

  static async updateTemplate(id: number, data: Partial<CreateTemplateDto>) {
    const repository = AppDataSource.getRepository(BOMTemplate);
    const template = await repository.findOne({ where: { id, active: true } });

    if (!template) {
      return null;
    }

    Object.assign(template, data);
    return repository.save(template);
  }

  static async deleteTemplate(id: number) {
    const repository = AppDataSource.getRepository(BOMTemplate);
    const template = await repository.findOne({ where: { id } });

    if (!template) {
      throw new Error('Szablon nie znaleziony');
    }

    // Soft delete
    template.active = false;
    await repository.save(template);
  }

  static async importFromCsv(filePath: string) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Remove BOM if present
    const content = fileContent.replace(/^\uFEFF/, '');
    
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';',
      trim: true,
      bom: true,
    });

    const repository = AppDataSource.getRepository(BOMTemplate);
    let imported = 0;
    let skipped = 0;

    for (const record of records) {
      try {
        // Map CSV columns to entity fields
        const template = repository.create({
          catalogNumber: record.numer_katalogowy || record.catalog_number,
          materialName: record.nazwa_materialu || record.material_name || record.materialName,
          defaultQuantity: parseFloat(record.ilosc || record.quantity || record.defaultQuantity || '1'),
          unit: record.jednostka || record.unit || 'szt',
          isRequired: (record.wymagane || record.required || 'nie').toLowerCase() === 'tak' || 
                     (record.wymagane || record.required || 'no').toLowerCase() === 'yes',
          category: record.kategoria || record.category,
          systemType: record.system_type || record.systemType,
          description: record.opis || record.description,
          taskTypeId: record.task_type_id ? parseInt(record.task_type_id) : 1, // Default task type
          active: true,
          sortOrder: 0,
        });

        await repository.save(template);
        imported++;
      } catch (error) {
        console.error('Error importing row:', error, record);
        skipped++;
      }
    }

    return { imported, skipped, total: records.length };
  }

  static async copyTemplate(id: number, targetCategory: string) {
    const repository = AppDataSource.getRepository(BOMTemplate);
    const template = await repository.findOne({ where: { id, active: true } });

    if (!template) {
      throw new Error('Szablon nie znaleziony');
    }

    const newTemplate = repository.create({
      ...template,
      id: undefined,
      category: targetCategory,
      createdAt: undefined,
      updatedAt: undefined,
    });

    return repository.save(newTemplate);
  }
}
