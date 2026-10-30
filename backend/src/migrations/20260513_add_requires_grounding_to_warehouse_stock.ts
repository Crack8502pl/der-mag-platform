// src/migrations/20260513_add_requires_grounding_to_warehouse_stock.ts
// Migration to add requires_grounding flag to warehouse_stock table

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRequiresGroundingToWarehouseStock1778630400000 implements MigrationInterface {
  name = 'AddRequiresGroundingToWarehouseStock1778630400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "warehouse_stock"
        ADD COLUMN IF NOT EXISTS "requires_grounding" BOOLEAN NOT NULL DEFAULT FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "warehouse_stock"
        DROP COLUMN IF EXISTS "requires_grounding"
    `);
  }
}
