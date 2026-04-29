// src/seeds/shipmentBomTemplates.seed.ts
// Seeder tworzący puste szablony BOM dla kreatora wysyłki SMOKIP_B, LCS i ND

import { AppDataSource } from '../config/database';
import { BomSubsystemTemplate, SubsystemType } from '../entities/BomSubsystemTemplate';

interface TemplateDefinition {
  templateName: string;
  subsystemType: SubsystemType;
  taskVariant: string;
}

const SHIPMENT_BOM_TEMPLATES: TemplateDefinition[] = [
  // ── SMOKIP_A ──────────────────────────────────────────────────────────────
  {
    templateName: 'BOM SMOKIP_A - Szafa terenowa',
    subsystemType: SubsystemType.SMOKIP_A,
    taskVariant: 'SZAFA_TERENOWA',
  },
  {
    templateName: 'BOM SMOKIP_A - Szafa wewnętrzna',
    subsystemType: SubsystemType.SMOKIP_A,
    taskVariant: 'SZAFA_WEWNETRZNA',
  },
  {
    templateName: 'BOM SMOKIP_A - Kontener',
    subsystemType: SubsystemType.SMOKIP_A,
    taskVariant: 'KONTENER',
  },
  {
    templateName: 'BOM SMOKIP_A - Szafa 42U',
    subsystemType: SubsystemType.SMOKIP_A,
    taskVariant: '42U',
  },
  {
    templateName: 'BOM SMOKIP_A - Szafa 24U',
    subsystemType: SubsystemType.SMOKIP_A,
    taskVariant: '24U',
  },
  // ── SMOKIP_B ──────────────────────────────────────────────────────────────
  {
    templateName: 'BOM SMOKIP_B - Szafa terenowa',
    subsystemType: SubsystemType.SMOKIP_B,
    taskVariant: 'SZAFA_TERENOWA',
  },
  {
    templateName: 'BOM SMOKIP_B - Szafa wewnętrzna',
    subsystemType: SubsystemType.SMOKIP_B,
    taskVariant: 'SZAFA_WEWNETRZNA',
  },
  {
    templateName: 'BOM SMOKIP_B - Zabudowa kontener',
    subsystemType: SubsystemType.SMOKIP_B,
    taskVariant: 'KONTENER',
  },
  {
    templateName: 'BOM SMOKIP_B - Szafa 42U',
    subsystemType: SubsystemType.SMOKIP_B,
    taskVariant: '42U',
  },
  {
    templateName: 'BOM SMOKIP_B - Szafa 24U',
    subsystemType: SubsystemType.SMOKIP_B,
    taskVariant: '24U',
  },
  {
    templateName: 'BOM LCS - 42U',
    subsystemType: SubsystemType.LCS,
    taskVariant: '42U',
  },
  {
    templateName: 'BOM LCS - 24U',
    subsystemType: SubsystemType.LCS,
    taskVariant: '24U',
  },
  {
    templateName: 'BOM ND - 42U',
    subsystemType: SubsystemType.ND,
    taskVariant: '42U',
  },
  {
    templateName: 'BOM ND - 24U',
    subsystemType: SubsystemType.ND,
    taskVariant: '24U',
  },
];

export class ShipmentBomTemplatesSeed {
  static async seed(): Promise<void> {
    const templateRepository = AppDataSource.getRepository(BomSubsystemTemplate);

    for (const def of SHIPMENT_BOM_TEMPLATES) {
      const template = templateRepository.create({
        templateName: def.templateName,
        subsystemType: def.subsystemType,
        taskVariant: def.taskVariant,
        description: `Pusty szablon BOM — wypełniany przez administratora`,
        isActive: true,
        version: 1,
        items: [],
      });

      // Wstaw atomowo — ignoruje konflikt na unikalnym kluczu (subsystemType, taskVariant, version)
      const result = await templateRepository
        .createQueryBuilder()
        .insert()
        .into(BomSubsystemTemplate)
        .values(template)
        .orIgnore()
        .execute();

      if (result.identifiers && result.identifiers.length > 0) {
        console.log(`Utworzono szablon BOM: ${def.templateName}`);
      }
    }
  }
}
