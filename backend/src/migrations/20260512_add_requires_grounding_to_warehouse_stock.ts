import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRequiresGroundingToWarehouseStock20260512 implements MigrationInterface {
  name = 'AddRequiresGroundingToWarehouseStock20260512';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "warehouse_stock"
        ADD COLUMN IF NOT EXISTS "requires_grounding" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "warehouse_stock"."requires_grounding"
        IS 'Czy materiał (słup) wymaga uziomienia — propagowane do CameraPoint.hasUziom przy zleceniu wysyłki'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "warehouse_stock"
        DROP COLUMN IF EXISTS "requires_grounding"
    `);
  }
}
