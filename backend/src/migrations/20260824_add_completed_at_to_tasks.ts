import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompletedAtToTasks20260824 implements MigrationInterface {
  name = 'AddCompletedAtToTasks20260824';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP NULL
    `);

    await queryRunner.query(`
      UPDATE "tasks"
      SET "completed_at" = "updated_at"
      WHERE "status" = 'completed' AND "completed_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "tasks" DROP COLUMN IF EXISTS "completed_at"');
  }
}
